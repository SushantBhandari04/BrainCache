import express, {Request, Response} from "express"
import { ContentModel, LinkModel, SpaceModel, UserModel } from "./db";
import {z} from "zod";
import path from "path";
import { Types } from "mongoose";
const app = express();
app.use(express.json());
import jwt from "jsonwebtoken"
import { JWT_SECRET, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, PRO_PLAN_PRICE_INR } from "./config";
import  UserMiddleware from "./middleware";
import { generateHash } from "./utils";
import cors from "cors";
import fs from "fs"
import Razorpay from "razorpay";
import crypto from "crypto";
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

const SignupSchema = z.object({
    username: z.string().min(3).max(20),
    password: z.string().min(8).max(20).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[!@#$%^&*(),.?":{}|<>]/),
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    address: z.string().min(1).max(200)
})

const SigninSchema = z.object({
    username: z.string().min(3).max(20),
    password: z.string().min(8).max(20).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[!@#$%^&*(),.?":{}|<>]/)
})

app.post("/api/v1/signup", async (req:Request,res:Response)=>{
    try{
        const parsedData = SignupSchema.safeParse(req.body);

        if(parsedData.error){
            res.status(403).json({
                message: "Invalid credentials!"
            })
            return;
        }

        const {username, password, firstName, lastName, address} = parsedData.data;

        const user = await UserModel.findOne({username});

        if(user){
            res.status(403).json({
                message: "User already exists."
            })
        }
        else{
            const createdUser = await UserModel.create({
                username,
                password,
                firstName,
                lastName,
                address
            });

            await SpaceModel.create({
                name: DEFAULT_SPACE_NAME,
                description: "Default space",
                userId: createdUser._id
            });

            res.status(200).json({
                message: "Succesfully signed up."
            })
        }
    }
    catch(e){
        res.status(411).json({
            message: "Invalid credentials!"
        })
    }
})


app.post("/api/v1/signin", async (req:Request,res:Response)=>{
    try{
        const parsedData = SigninSchema.parse(req.body);
        const {username, password} = parsedData;

        const user = await UserModel.findOne({username, password});

        if(user){
            const token = jwt.sign({
                username,
                password
            },JWT_SECRET);

            res.status(200).json({
                token: token,
                message: "Succesfully signed in."
            })
        }
        else{
            res.status(403).json({
                message: "User does not exist!"
            })
        }
    }
    catch(e){
        res.status(411).json({
            message: "Invalid credentials!"
        })
    }
})

// Get current user profile
app.get("/api/v1/profile", UserMiddleware, async (req: Request, res: Response) => {
    const user = req.user;
    if(!user){
        res.status(401).json({message: "Unauthorized"});
        return;
    }
    res.status(200).json({
        username: user.username,
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
            username: updated.username,
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
        select: "username"
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
        const receipt = `sub_${user._id}_${Date.now()}`;
        const notes = {
            userId: user._id.toString(),
            username: user.username || "",
            plan: "pro"
        };
        const order = await razorpay.orders.create({
            amount: PRO_PLAN_PRICE_PAISE,
            currency: PRO_PLAN_CURRENCY,
            receipt,
            notes
        });
        const customerName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "BrainCache User";
        const customerEmail = user.username?.includes("@") ? user.username : undefined;
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


app.get("/api/v1/brain/:shareLink", UserMiddleware, async (req,res)=>{
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
app.get("/api/v1/content/:id/share", UserMiddleware, async (req, res) => {
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
app.post("/api/v1/content/:id/share", UserMiddleware, async (req, res) => {
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
app.get("/api/v1/content/share/:hash", async (req, res) => {
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
            const content = await ContentModel.findById(link.contentId);
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
        const contents = await ContentModel.find({ userId: link.userId });
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
app.get("/api/v1/brain/:shareLink", UserMiddleware, async (req, res) => {
    const hash = req.params.shareLink;

    const link = await LinkModel.findOne({ hash });

    if (!link) {
        res.status(411).json({
            message: "No such brain found."
        });
        return;
    }

    const userId = link.userId;
    const contents = await ContentModel.find({ userId });

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