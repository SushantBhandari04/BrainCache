import express, {Request, Response} from "express"
import { ContentModel, LinkModel, UserModel } from "./db";
import {z} from "zod";
import path from "path";
const app = express();
app.use(express.json());
import jwt from "jsonwebtoken"
import { JWT_SECRET } from "./config";
import  UserMiddleware from "./middleware";
import { generateHash } from "./utils";
import cors from "cors";
import fs from "fs"
app.use(cors());

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
            await UserModel.create({
                username,
                password,
                firstName,
                lastName,
                address
            })
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


app.post("/api/v1/content", UserMiddleware, async (req:Request,res:Response)=>{
    const user = req.user;

    console.log("Request came");

    const userId = user._id;
    const {link, type, title} = req.body;

    try{
        const newContent = await ContentModel.create({
            link,
            type,
            title,
            userId
        })
    
    
        res.status(200).json({
            message: "Content added successfully.",
            content: newContent
        })
    }
    catch(e){
        console.error("error");
        res.status(500).json({
            message: "Error",
            
        })
    }
    
   
})


app.get("/api/v1/content", UserMiddleware, async (req:Request,res:Response)=>{
    const user = req.user;
    const userId = user._id;

    const content = await ContentModel.find({userId}).populate({
        path: "userId",
        select: "username"
    });

    if(content){
        res.status(200).json({
            content
        })
    }
    else{
        res.status(403).json({
            message: "No content present."
        })
    }  
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
    const userId = user._id;

    const share = req.body.share;

    if(share){
        try{
            const link = await LinkModel.findOne({userId});

            if(link){
                res.status(200).json({
                    hash : link.hash
                })
                return;
            }
            else{
                const hash = generateHash(10);
                await LinkModel.create({
                    hash,
                    userId
                })
                res.status(200).json({
                    hash: hash
                })
            }
        }
        catch(e){
            console.log("Error");
        }
        
    }
    else{
        const link = await LinkModel.findOne({userId});

        if(link){
            await LinkModel.deleteOne({userId});
        }

        res.status(200).json({
            message: "Sharing stopped successfully."
        })
    }
})


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