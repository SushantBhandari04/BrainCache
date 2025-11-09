import express, { Request, Response } from "express";
import multer from "multer";
import path from "path";
import UserMiddleware from "../middleware";
import fs from "fs";

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Save files in 'uploads' directory
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // Rename files
  },
});

const upload = multer({ storage });

// Upload PDF route (protected)
router.post("/", UserMiddleware, upload.single("pdf"), async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  console.log("Uploaded file:", req.file); // ✅ Debugging to see file details

  // Construct the correct file URL
  const fileUrl = `http://localhost:3000/uploads/${req.file.filename}`;

  res.status(200).json({ message: "File uploaded successfully!", url: fileUrl });
});

export default router;
