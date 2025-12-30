const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();

// Ensure uploads directory exists on the server
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

/* MIDDLEWARE */
app.use(cors());
app.use(express.json()); // Replaces body-parser
app.use("/uploads", express.static(uploadDir)); 
app.use(express.static(path.join(__dirname, "public")));

/* MONGODB CONNECTION */
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("MongoDB Error:", err));

/* MULTER CONFIG */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "_" + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

/* SCHEMAS */
const User = mongoose.model("User", new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
}));

const Upload = mongoose.model("Upload", new mongoose.Schema({
  role: String, type: String, branch: String, sem: String,
  subject: String, email: String, phone: String, author: String,
  frontFile: String, tocFile: String,
  createdAt: { type: Date, default: Date.now }
}));

/* API ROUTES */
app.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: "User exists" });
    await new User({ username, email, password }).save();
    res.json({ success: true, message: "Signup successful" });
  } catch (err) { res.status(500).json({ success: false, message: "Server error" }); }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });
  if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });
  res.json({ success: true, user });
});

app.post("/api/uploads", upload.fields([{ name: "frontFile", maxCount: 1 }, { name: "tocFile", maxCount: 1 }]), async (req, res) => {
    try {
      const { branch, sem, subject, type, email, phone, author } = req.body;
      const newUpload = new Upload({
        role: "lender", type, branch, sem, subject, email, phone, author,
        frontFile: req.files.frontFile[0].filename,
        tocFile: req.files.tocFile ? req.files.tocFile[0].filename : null
      });
      await newUpload.save();
      res.json({ success: true, message: "Upload successful 🎉" });
    } catch (err) { res.status(500).json({ success: false, message: "Upload failed" }); }
});

app.get("/api/all-uploads", async (req, res) => {
  try {
    const data = await Upload.find();
    res.json(data);
  } catch (err) { res.status(500).json({ error: "Failed to fetch" }); }
});

/* CATCH-ALL FOR FRONTEND */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 5000; // Render sets PORT automatically
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
