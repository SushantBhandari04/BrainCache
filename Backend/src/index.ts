import express, {Request, Response} from "express"
import { ContentModel, LinkModel, SpaceModel, UserModel } from "./db";
import {z} from "zod";
import path from "path";
import { Types } from "mongoose";
const app = express();
app.use(express.json());
import jwt from "jsonwebtoken"
import { JWT_SECRET, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, PRO_PLAN_PRICE_INR, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, RESEND_API_KEY, EMAIL_FROM, OTP_EXPIRY_MINUTES, OTP_RESEND_INTERVAL_SECONDS } from "./config";
import  UserMiddleware from "./middleware";
import { generateHash } from "./utils";
import cors from "cors";
import fs from "fs"
import Razorpay from "razorpay";
import crypto from "crypto";
import { Resend } from "resend";
import { OAuth2Client } from "google-auth-library";
app.use(cors());

const DEFAULT_SPACE_NAME = "My Brain";
const FREE_SPACE_LIMIT = 3;
const PRO_SPACE_LIMIT = 100;
const PRO_PLAN_PRICE_PAISE = (PRO_PLAN_PRICE_INR || 499) * 100;
const PRO_PLAN_CURRENCY = "INR";
const razorpay = (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) ? new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET
}) : null;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET || undefined) : null;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const otpExpiryMs = OTP_EXPIRY_MINUTES * 60 * 1000;
const otpResendIntervalMs = OTP_RESEND_INTERVAL_SECONDS * 1000;

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid identifier");

const CreateSpaceSchema = z.object({
    name: z.string().min(1).max(60),
    description: z.string().max(240).optional()
});

const CreateContentSchema = z.object({
    title: z.string().min(1).max(200),
    link: z.string().min(1),
    type: z.enum(["youtube","twitter","document","link"]),
    spaceId: objectIdSchema
});

const ShareToggleSchema = z.object({
    share: z.boolean(),
    spaceId: objectIdSchema.optional()
});

const ShareStateSchema = z.object({
    share: z.boolean()
});

const SubscriptionUpdateSchema = z.object({
    plan: z.enum(["free","pro"])
});

const ConfirmPaymentSchema = z.object({
    orderId: z.string().min(5),
    paymentId: z.string().min(5),
    signature: z.string().min(5)
});

function getSpaceLimit(plan?: string | null) {
    if (plan === "pro") {
        return PRO_SPACE_LIMIT;
    }
    return FREE_SPACE_LIMIT;
}

async function ensureDefaultSpace(userId: Types.ObjectId) {
    let space = await SpaceModel.findOne({ userId }).sort({ createdAt: 1 });
    if (!space) {
        space = await SpaceModel.create({
            name: DEFAULT_SPACE_NAME,
            description: "Default space",
            userId
        });
    }
    return space;
}

async function getUserSpace(userId: Types.ObjectId, spaceId?: string | null) {
    if (spaceId) {
        return await SpaceModel.findOne({ _id: spaceId, userId });
    }
    return ensureDefaultSpace(userId);
}

async function toggleSpaceShare(userId: Types.ObjectId, spaceId: Types.ObjectId, share: boolean) {
    if (share) {
        const existing = await LinkModel.findOne({ spaceId });
        if (existing) {
            return { hash: existing.hash };
        }
        const hash = generateHash(10);
        await LinkModel.create({ hash, userId, spaceId });
        return { hash };
    }

    await LinkModel.deleteMany({ spaceId });
    return { message: "Sharing stopped successfully." };
}

function createAuthToken(userId: Types.ObjectId) {
    return jwt.sign({
        userId: userId.toString()
    }, JWT_SECRET, {
        expiresIn: "30d"
    });
}

function generateOtpCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOtp(code: string) {
    return crypto.createHash("sha256").update(code).digest("hex");
}

async function sendOtpEmail(email: string, code: string) {
    if (!resend || !EMAIL_FROM) {
        throw new Error("Email service is not configured. Please set RESEND_API_KEY in your environment variables.");
    }
    const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4f46e5; margin-bottom: 20px;">BrainCache Login Code</h2>
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Use the following one-time code to sign in:</p>
            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
                <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937; margin: 0;">${code}</p>
            </div>
            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">This code will expire in ${OTP_EXPIRY_MINUTES} minutes. If you did not request this code, you can safely ignore this email.</p>
        </div>
    `;
    try {
        const result = await resend.emails.send({
            from: EMAIL_FROM,
            to: email,
            subject: "Your BrainCache login code",
            html
        });
        if (result.error) {
            throw new Error(result.error.message || "Failed to send email");
        }
        console.log(`[Resend] Email sent successfully. ID: ${result.data?.id}`);
    } catch (sendError: any) {
        const errorMsg = sendError?.message || "Failed to send email";
        console.error("Resend email error:", errorMsg, sendError);
        if (errorMsg.includes("API key") || errorMsg.includes("Unauthorized") || errorMsg.includes("401")) {
            throw new Error("Invalid Resend API key. Please check your RESEND_API_KEY in environment variables.");
        } else if (errorMsg.includes("domain") || errorMsg.includes("from")) {
            throw new Error("Invalid sender email address. Please verify EMAIL_FROM is a verified domain in Resend.");
        } else {
            throw new Error(`Failed to send email: ${errorMsg}`);
        }
    }
}

const EmailSchema = z.string().email("Invalid email address");
const RequestOtpSchema = z.object({
    email: EmailSchema
});
const VerifyOtpSchema = z.object({
    email: EmailSchema,
    otp: z.string().regex(/^[0-9]{6}$/, "OTP must be 6 digits"),
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional()
});
const GoogleAuthSchema = z.object({
    idToken: z.string().min(20),
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional()
});

app.get("/api/v1/auth/config", (req: Request, res: Response) => {
    res.status(200).json({
        googleClientId: GOOGLE_CLIENT_ID || null,
        googleAuthEnabled: !!GOOGLE_CLIENT_ID
    });
});

app.post("/api/v1/auth/google", async (req: Request, res: Response) => {
    if (!googleClient || !GOOGLE_CLIENT_ID) {
        res.status(503).json({ message: "Google authentication is not configured on this server." });
        return;
    }
    const parsed = GoogleAuthSchema.safeParse(req.body);
    if (parsed.error) {
        res.status(400).json({ message: "Invalid Google authentication payload." });
        return;
    }
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: parsed.data.idToken,
            audience: GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        const email = payload?.email?.toLowerCase();
        if (!email) {
            res.status(400).json({ message: "Unable to verify Google account email." });
            return;
        }
        const googleId = payload?.sub;
        const givenName = payload?.given_name || parsed.data.firstName;
        const familyName = payload?.family_name || parsed.data.lastName;
        let user = await UserModel.findOne({ email });
        if (!user) {
            user = await UserModel.create({
                email,
                googleId,
                firstName: givenName,
                lastName: familyName
            });
        } else {
            if (!user.googleId && googleId) {
                user.googleId = googleId;
            }
            if (!user.firstName && givenName) {
                user.firstName = givenName;
            }
            if (!user.lastName && familyName) {
                user.lastName = familyName;
            }
            await user.save();
        }
        await ensureDefaultSpace(user._id);
        const token = createAuthToken(user._id);
        res.status(200).json({
            token,
            user: {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            }
        });
    } catch (error) {
        console.error("Google auth error", error);
        res.status(401).json({ message: "Google authentication failed." });
    }
});

app.post("/api/v1/auth/request-otp", async (req: Request, res: Response) => {
    if (!resend || !EMAIL_FROM) {
        res.status(503).json({ message: "Email service is not configured. Please set RESEND_API_KEY in your environment variables." });
        return;
    }
    const parsed = RequestOtpSchema.safeParse(req.body);
    if (parsed.error) {
        res.status(400).json({ message: "Invalid email address." });
        return;
    }
    try {
        const email = parsed.data.email.trim().toLowerCase();
        let user = await UserModel.findOne({ email });
        if (!user) {
            try {
                user = await UserModel.create({ email });
            } catch (createError: any) {
                // Handle race condition - user might have been created between findOne and create
                if (createError.code === 11000 || createError.codeName === 'DuplicateKey') {
                    user = await UserModel.findOne({ email });
                    if (!user) {
                        throw new Error("Failed to create user. Please try again.");
                    }
                } else {
                    throw createError;
                }
            }
        } else if (user.otpLastSentAt && Date.now() - user.otpLastSentAt.getTime() < otpResendIntervalMs) {
            const waitSecs = Math.ceil((otpResendIntervalMs - (Date.now() - user.otpLastSentAt.getTime())) / 1000);
            res.status(429).json({ message: `Please wait ${waitSecs} seconds before requesting another code.` });
            return;
        }
        const otp = generateOtpCode();
        console.log(`[OTP] Generating OTP for ${email.substring(0, 3)}***`);
        user.otpHash = hashOtp(otp);
        user.otpExpiresAt = new Date(Date.now() + otpExpiryMs);
        user.otpLastSentAt = new Date();
        await user.save();
        console.log(`[OTP] User saved, sending email...`);
        await sendOtpEmail(email, otp);
        console.log(`[OTP] Email sent successfully to ${email.substring(0, 3)}***`);
        res.status(200).json({ message: "OTP sent to your email address." });
    } catch (error: any) {
        console.error("OTP request error", error);
        const errorMessage = error?.message || "Unknown error";
        const errorCode = error?.code || error?.codeName;
        
        // Handle MongoDB errors
        if (errorCode === 11000 || errorCode === 'DuplicateKey') {
            res.status(500).json({ message: "Database error. Please try again or contact support." });
            return;
        }
        
        // Handle email-related errors
        if (errorMessage.includes("Email service is not configured")) {
            res.status(503).json({ message: "Email service is not configured. Please contact support." });
        } else if (errorMessage.includes("authentication") || errorMessage.includes("credentials") || errorMessage.includes("535")) {
            res.status(500).json({ message: "Email authentication failed. Please check SMTP credentials in server configuration." });
        } else if (errorMessage.includes("connection") || errorMessage.includes("timeout") || errorMessage.includes("ECONNREFUSED") || errorMessage.includes("ETIMEDOUT")) {
            res.status(500).json({ message: "Unable to connect to email server. Please check SMTP host and port settings." });
        } else {
            res.status(500).json({ message: `Unable to send OTP: ${errorMessage}` });
        }
    }
});

app.post("/api/v1/auth/verify-otp", async (req: Request, res: Response) => {
    const parsed = VerifyOtpSchema.safeParse(req.body);
    if (parsed.error) {
        res.status(400).json({ message: "Invalid OTP payload." });
        return;
    }
    try {
        const email = parsed.data.email.trim().toLowerCase();
        const otpInput = parsed.data.otp.trim();
        console.log(`[OTP Verify] Attempting verification for ${email.substring(0, 3)}***`);
        const user = await UserModel.findOne({ email });
        if (!user || !user.otpHash || !user.otpExpiresAt) {
            console.log(`[OTP Verify] No OTP found for user`);
            res.status(400).json({ message: "Please request a new OTP." });
            return;
        }
        if (user.otpExpiresAt.getTime() < Date.now()) {
            console.log(`[OTP Verify] OTP expired`);
            user.otpHash = undefined;
            user.otpExpiresAt = undefined;
            await user.save();
            res.status(400).json({ message: "OTP expired. Please request a new one." });
            return;
        }
        const incomingHash = hashOtp(otpInput);
        if (incomingHash !== user.otpHash) {
            console.log(`[OTP Verify] Invalid OTP - hash mismatch`);
            res.status(400).json({ message: "Invalid OTP. Please try again." });
            return;
        }
        console.log(`[OTP Verify] OTP verified successfully`);
        user.otpHash = undefined;
        user.otpExpiresAt = undefined;
        user.otpLastSentAt = undefined;
        if (parsed.data.firstName) {
            user.firstName = parsed.data.firstName;
        }
        if (parsed.data.lastName) {
            user.lastName = parsed.data.lastName;
        }
        await user.save();
        await ensureDefaultSpace(user._id);
        const token = createAuthToken(user._id);
        res.status(200).json({
            token,
            user: {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            }
        });
    } catch (error) {
        console.error("OTP verify error", error);
        res.status(500).json({ message: "Unable to verify OTP right now." });
    }
});

// Get current user profile
app.get("/api/v1/profile", UserMiddleware, async (req: Request, res: Response) => {
    const user = req.user;
    if(!user){
        res.status(401).json({message: "Unauthorized"});
        return;
    }
    res.status(200).json({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        address: user.address
    })
})

// Update current user profile
const UpdateProfileSchema = z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    address: z.string().min(1).max(200).optional()
})

app.patch("/api/v1/profile", UserMiddleware, async (req: Request, res: Response) => {
    try{
        const parsed = UpdateProfileSchema.safeParse(req.body);
        if(parsed.error){
            res.status(400).json({ message: "Invalid profile data" });
            return;
        }
        const updates = parsed.data;
        const user = req.user;
        if(!user){
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        await UserModel.updateOne({ _id: user._id }, { $set: updates });

        const updated = await UserModel.findById(user._id);
        if(!updated){
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.status(200).json({
            email: updated.email,
            firstName: updated.firstName,
            lastName: updated.lastName,
            address: updated.address
        })
    }
    catch(e){
        res.status(500).json({ message: "Failed to update profile" })
    }
})

app.get("/api/v1/spaces", UserMiddleware, async (req: Request, res: Response) => {
    try{
        const user = req.user;
        if(!user){
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        await ensureDefaultSpace(user._id);
        const spaces = await SpaceModel.find({ userId: user._id }).sort({ createdAt: 1 });
        const spaceIds = spaces.map(s => s._id);
        const links = spaceIds.length ? await LinkModel.find({ spaceId: { $in: spaceIds } }) : [];
        const linkMap = new Map(links.map(link => [link.spaceId?.toString() || "", link.hash]));

        res.status(200).json({
            spaces: spaces.map(space => ({
                _id: space._id,
                name: space.name,
                description: space.description,
                shareHash: linkMap.get(space._id.toString()) || null
            })),
            currentCount: spaces.length,
            limit: getSpaceLimit(user.subscriptionPlan),
            plan: user.subscriptionPlan || "free",
            price: {
                amount: PRO_PLAN_PRICE_PAISE,
                currency: PRO_PLAN_CURRENCY,
                display: `₹${(PRO_PLAN_PRICE_PAISE / 100).toFixed(0)}`
            },
            paymentsConfigured: !!razorpay,
            razorpayKey: RAZORPAY_KEY_ID || null
        })
    }
    catch(e){
        res.status(500).json({ message: "Failed to load spaces" });
    }
});

app.post("/api/v1/spaces", UserMiddleware, async (req: Request, res: Response) => {
    try{
        const user = req.user;
        if(!user){
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const spaceCount = await SpaceModel.countDocuments({ userId: user._id });
        const allowed = getSpaceLimit(user.subscriptionPlan);
        if(user.subscriptionPlan !== "pro" && spaceCount >= allowed){
            res.status(402).json({ message: "Free plan allows only 3 spaces. Upgrade your subscription to add more.", limit: allowed });
            return;
        }
        const parsed = CreateSpaceSchema.safeParse(req.body);
        if(parsed.error){
            res.status(400).json({ message: "Invalid space payload" });
            return;
        }
        const { name, description } = parsed.data;
        const existing = await SpaceModel.findOne({ userId: user._id, name: name.trim() });
        if(existing){
            res.status(409).json({ message: "Space with this name already exists." });
            return;
        }
        const space = await SpaceModel.create({
            name: name.trim(),
            description,
            userId: user._id
        });
        res.status(201).json({
            space: {
                _id: space._id,
                name: space.name,
                description: space.description,
                shareHash: null
            }
        });
    }
    catch(e){
        res.status(500).json({ message: "Failed to create space" })
    }
});

app.get("/api/v1/spaces/:spaceId/share", UserMiddleware, async (req: Request, res: Response) => {
    const user = req.user;
    if(!user){
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const { spaceId } = req.params;
    const parsed = objectIdSchema.safeParse(spaceId);
    if(!parsed.success){
        res.status(400).json({ message: "Invalid space identifier" });
        return;
    }
    const space = await SpaceModel.findOne({ _id: spaceId, userId: user._id });
    if(!space){
        res.status(404).json({ message: "Space not found" });
        return;
    }
    const link = await LinkModel.findOne({ spaceId: space._id });
    res.status(200).json({
        shared: !!link,
        hash: link?.hash || null
    });
});

app.post("/api/v1/spaces/:spaceId/share", UserMiddleware, async (req: Request, res: Response) => {
    const user = req.user;
    if(!user){
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const { spaceId } = req.params;
    const idParsed = objectIdSchema.safeParse(spaceId);
    if(!idParsed.success){
        res.status(400).json({ message: "Invalid space identifier" });
        return;
    }
    const bodyParsed = ShareStateSchema.safeParse(req.body);
    if(bodyParsed.error){
        res.status(400).json({ message: "Invalid request" });
        return;
    }
    const space = await SpaceModel.findOne({ _id: spaceId, userId: user._id });
    if(!space){
        res.status(404).json({ message: "Space not found" });
        return;
    }
    const response = await toggleSpaceShare(user._id, space._id, bodyParsed.data.share);
    res.status(200).json(response);
});


app.post("/api/v1/content", UserMiddleware, async (req:Request,res:Response)=>{
    const user = req.user;

    if(!user){
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    const parsed = CreateContentSchema.safeParse(req.body);

    if(parsed.error){
        res.status(400).json({ message: "Invalid content payload" });
        return;
    }

    const { link, type, title, spaceId } = parsed.data;

    try{
        const space = await SpaceModel.findOne({ _id: spaceId, userId: user._id });
        if(!space){
            res.status(404).json({ message: "Space not found" });
            return;
        }

        const newContent = await ContentModel.create({
            link,
            type,
            title,
            userId: user._id,
            spaceId: space._id
        })
    
    
        res.status(200).json({
            message: "Content added successfully.",
            content: newContent
        })
    }
    catch(e){
        console.error("error", e);
        res.status(500).json({
            message: "Error creating content",
            
        })
    }
    
   
})


app.get("/api/v1/content", UserMiddleware, async (req:Request,res:Response)=>{
    const user = req.user;
    if(!user){
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    const requestedSpaceId = typeof req.query.spaceId === "string" ? req.query.spaceId : undefined;

    const space = await getUserSpace(user._id, requestedSpaceId);

    if(!space){
        res.status(404).json({ message: "Space not found" });
        return;
    }

    await ContentModel.updateMany(
        { userId: user._id, $or: [{ spaceId: { $exists: false } }, { spaceId: null }] },
        { $set: { spaceId: space._id } }
    );

    const content = await ContentModel.find({userId: user._id, spaceId: space._id}).populate({
        path: "userId",
        select: "email firstName lastName"
    });

    res.status(200).json({
        content,
        spaceId: space._id
    })
})


app.delete("/api/v1/content", UserMiddleware, async (req: Request,res: Response)=>{
    const user = req.user;
    const userId = user._id;
    const contentId = req.body.id;

    const content = await ContentModel.find({userId, _id:contentId});

    if(!content){
        res.status(403).json({
            message: "No content present."
        })
    }
    else{
        await ContentModel.deleteMany({userId, _id:contentId});
        res.status(200).json({
            message: "Content deleted successfully."
        })
    }
})
app.post("/api/v1/brain/share", UserMiddleware, async (req,res)=>{
    const user = req.user;
    if(!user){
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const parsed = ShareToggleSchema.safeParse(req.body);
    if(parsed.error){
        res.status(400).json({ message: "Invalid request" });
        return;
    }
    const space = await getUserSpace(user._id, parsed.data.spaceId);
    if(!space){
        res.status(404).json({ message: "Space not found" });
        return;
    }
    try{
        const response = await toggleSpaceShare(user._id, space._id, parsed.data.share);
        res.status(200).json(response);
    }
    catch(e){
        res.status(500).json({ message: "Unable to update sharing" });
    }
})

app.get("/api/v1/subscription", UserMiddleware, async (req: Request, res: Response) => {
    const user = req.user;
    if(!user){
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const plan = user.subscriptionPlan || "free";
    const limit = getSpaceLimit(plan);
    const currentCount = await SpaceModel.countDocuments({ userId: user._id });
    res.status(200).json({
        plan,
        limit,
        currentCount,
        price: {
            amount: PRO_PLAN_PRICE_PAISE,
            currency: PRO_PLAN_CURRENCY,
            display: `₹${(PRO_PLAN_PRICE_PAISE / 100).toFixed(0)}`
        },
        paymentsConfigured: !!razorpay,
        razorpayKey: RAZORPAY_KEY_ID || null
    });
});

app.post("/api/v1/subscription", UserMiddleware, async (req: Request, res: Response) => {
    const user = req.user;
    if(!user){
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const parsed = SubscriptionUpdateSchema.safeParse(req.body);
    if(parsed.error){
        res.status(400).json({ message: "Invalid subscription request" });
        return;
    }
    if(parsed.data.plan === "pro" && razorpay){
        res.status(403).json({ message: "Please complete the payment flow to upgrade to Pro." });
        return;
    }
    await UserModel.updateOne({ _id: user._id }, { $set: { subscriptionPlan: parsed.data.plan } });
    res.status(200).json({
        message: "Subscription updated",
        plan: parsed.data.plan,
        limit: getSpaceLimit(parsed.data.plan)
    });
});

app.post("/api/v1/subscription/checkout", UserMiddleware, async (req: Request, res: Response) => {
    if(!razorpay){
        res.status(503).json({ message: "Payments are not configured on this server." });
        return;
    }
    const user = req.user;
    if(!user){
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try{
        const receipt = `sub_${user._id.toString().slice(-8)}_${Date.now().toString().slice(-6)}`;
        const notes = {
            userId: user._id.toString(),
            email: user.email || "",
            plan: "pro"
        };
        const order = await razorpay.orders.create({
            amount: PRO_PLAN_PRICE_PAISE,
            currency: PRO_PLAN_CURRENCY,
            receipt,
            notes
        });
        const customerName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "BrainCache User";
        const customerEmail = user.email;
        const customerContact = undefined;
        res.status(200).json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: RAZORPAY_KEY_ID,
            description: "BrainCache Pro Subscription",
            receipt,
            notes,
            customer: {
                name: customerName,
                email: customerEmail,
                contact: customerContact
            }
        });
    }
    catch(e){
        console.error("Razorpay order error", e);
        res.status(500).json({ message: "Unable to initiate payment" });
    }
});

app.post("/api/v1/subscription/confirm", UserMiddleware, async (req: Request, res: Response) => {
    if(!razorpay || !RAZORPAY_KEY_SECRET){
        res.status(503).json({ message: "Payments are not configured on this server." });
        return;
    }
    const user = req.user;
    if(!user){
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const parsed = ConfirmPaymentSchema.safeParse(req.body);
    if(parsed.error){
        res.status(400).json({ message: "Invalid confirmation payload" });
        return;
    }
    const { orderId, paymentId, signature } = parsed.data;
    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET).update(body).digest("hex");
    if(expectedSignature !== signature){
        res.status(400).json({ message: "Payment signature verification failed." });
        return;
    }
    const order = await razorpay.orders.fetch(orderId);
    if(order.notes?.userId !== user._id.toString()){
        res.status(403).json({ message: "Order does not belong to this user." });
        return;
    }
    const payment = await razorpay.payments.fetch(paymentId);
    if(payment.order_id !== orderId){
        res.status(400).json({ message: "Payment does not match order." });
        return;
    }
    if(payment.status !== "captured"){
        res.status(402).json({ message: "Payment not completed yet." });
        return;
    }
    await UserModel.updateOne({ _id: user._id }, { $set: { subscriptionPlan: "pro" } });
    res.status(200).json({
        message: "Subscription upgraded to Pro.",
        plan: "pro",
        limit: getSpaceLimit("pro")
    });
});

// ... (rest of the code remains the same)

app.get("/api/v1/brain/:shareLink", UserMiddleware, async (req: Request, res: Response)=>{
    const hash = req.params.shareLink;

    const link = await LinkModel.findOne({hash});

    if(!link){
        res.status(411).json({
            message: "No such brain found."
        })
        return;
    }

    const userId = link.userId;

    const contents = await ContentModel.find({userId});

    res.status(200).json({
        contents
    })

})

// Check or update sharing status for a specific content item
app.get("/api/v1/content/:id/share", UserMiddleware, async (req: Request, res: Response) => {
    try {
        const contentId = req.params.id;
        const userId = req.user._id;

        // Find the content and verify ownership
        const content = await ContentModel.findOne({ _id: contentId, userId });
        if (!content) {
             res.status(404).json({ message: "Content not found or access denied" });
             return;
        }

        // Check if content is already shared
        const link = await LinkModel.findOne({ contentId });
        
        res.status(200).json({
            shared: !!link,
            hash: link?.hash || null
        });
    } catch (error) {
        console.error("Error checking share status:", error);
        res.status(500).json({ message: "Error checking share status" });
    }
});

// Enable/disable sharing for a specific content item
app.post("/api/v1/content/:id/share", UserMiddleware, async (req: Request, res: Response) => {
    try {
        const contentId = req.params.id;
        const userId = req.user._id;
        const { share } = req.body;

        // Find the content and verify ownership
        const content = await ContentModel.findOne({ _id: contentId, userId });
        if (!content) {
             res.status(404).json({ message: "Content not found or access denied" });
             return;
        }

        if (share) {
            // Check if already shared
            const existingLink = await LinkModel.findOne({ contentId });
            if (existingLink) {
                 res.status(200).json({ hash: existingLink.hash });
                 return;
            }

            // Generate a new share link
            const hash = generateHash(10);
            await LinkModel.create({
                hash,
                userId,
                contentId
            });

            res.status(200).json({ hash });
        } else {
            // Disable sharing
            await LinkModel.deleteOne({ contentId });
            res.status(200).json({ message: "Sharing disabled for this content" });
        }
    } catch (error) {
        console.error("Error updating share status:", error);
        res.status(500).json({ message: "Error updating share status" });
    }
});

// Get shared content by hash
app.get("/api/v1/content/share/:hash", async (req: Request, res: Response) => {
    try {
        const { hash } = req.params;
        
        // Find the link
        const link = await LinkModel.findOne({ hash });
        if (!link) {
             res.status(404).json({ message: "Shared content not found or link expired" });
             return
        }

        // If it's a content-specific share, return just that content
        if (link.contentId) {
            const content = await ContentModel.findById(link.contentId).populate({
                path: "userId",
                select: "email firstName lastName"
            });
            if (!content) {
                 res.status(404).json({ message: "Content not found" });
                 return;
            }
             res.status(200).json({
                contents: [content],
                isSingleItem: true
            });
            return;
        }

        // Otherwise, return all user's content (for backward compatibility)
        const contents = await ContentModel.find({ userId: link.userId }).populate({
            path: "userId",
            select: "email firstName lastName"
        });
        res.status(200).json({
            contents,
            isSingleItem: false
        });
    } catch (error) {
        console.error("Error fetching shared content:", error);
        res.status(500).json({ message: "Error fetching shared content" });
    }
});

// Original brain sharing endpoint (kept for backward compatibility)
app.get("/api/v1/brain/:shareLink", UserMiddleware, async (req: Request, res: Response) => {
    const hash = req.params.shareLink;

    const link = await LinkModel.findOne({ hash });

    if (!link) {
        res.status(411).json({
            message: "No such brain found."
        });
        return;
    }

    const userId = link.userId;
    const contents = await ContentModel.find({ userId }).populate({
        path: "userId",
        select: "email firstName lastName"
    });

    res.status(200).json({
        contents,
        isSingleItem: false
    });
});

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

import uploadRouter from "./routes/upload"; // Import upload route

// API Routes
app.use("/api/v1/upload", uploadRouter); 

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.listen(3000, ()=>{
    console.log("Server is running on port 3000");
});