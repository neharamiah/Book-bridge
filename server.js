const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
require("dotenv").config();

const app = express();

/* =======================
   MIDDLEWARE
======================= */
app.use(cors());
app.use(bodyParser.json());

// 🔧 FIX: absolute path for uploads (Render-safe)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// optional static folder
app.use(express.static(path.join(__dirname, "public")));

/* =======================
   MONGODB CONNECTION
======================= */
// 🔧 FIX: standard env variable name
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("MongoDB Error:", err));

/* =======================
   MULTER CONFIG
======================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "_" + file.originalname)
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

/* =======================
   SCHEMAS
======================= */
const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String
});

const UploadSchema = new mongoose.Schema({
  role: String,
  type: String,
  branch: String,
  sem: String,
  subject: String,
  email: String,
  phone: String,
  author: String,
  frontFile: String,
  tocFile: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", UserSchema);
const Upload = mongoose.model("Upload", UploadSchema);

/* =======================
   ROUTES
======================= */

// Signup
app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  const exists = await User.findOne({ email });
  if (exists)
    return res.json({ success: false, message: "User exists" });

  await new User({ username, email, password }).save();
  res.json({ success: true, message: "Signup successful" });
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email, password });
  if (!user)
    return res.json({ success: false, message: "Invalid login" });

  res.json({ success: true, user });
});

// Upload (Lender)
app.post(
  "/api/uploads",
  upload.fields([
    { name: "frontFile", maxCount: 1 },
    { name: "tocFile", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { branch, sem, subject, type, email, phone, author } = req.body;

      if (!email || !branch || !sem || !subject || !type) {
        return res
          .status(400)
          .json({ success: false, message: "Missing fields" });
      }

      const newUpload = new Upload({
        role: "lender",
        type,
        branch,
        sem,
        subject,
        email,
        phone,
        author,
        frontFile: req.files.frontFile?.[0]?.filename,
        tocFile: req.files.tocFile?.[0]?.filename || null
      });

      await newUpload.save();
      res.json({ success: true, message: "Upload successful 🎉" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Upload failed" });
    }
  }
);

// Fetch uploads (Borrower)
app.get("/uploads", async (req, res) => {
  const data = await Upload.find();
  res.json(data);
});

/* =======================
   SERVER START
======================= */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
