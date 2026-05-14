const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const Otp = require("../models/Otp");
const User = require("../models/User");

// Generate a random 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create email transporter
function createTransporter() {
  // For development, always use console logging
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// POST /api/auth/send-otp — Candidate login
router.post("/send-otp", async (req, res) => {
  try {
    console.log(`📩 OTP Request Body:`, req.body);
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Delete any existing OTPs for this email
    await Otp.deleteMany({ email: email.toLowerCase() });

    // Generate new OTP
    const otp = generateOTP();

    // Save OTP to database
    await Otp.create({ email: email.toLowerCase(), otp });

    // Try to send email, fallback to console
    const transporter = createTransporter();

    if (transporter && process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        await transporter.sendMail({
          from: `"Antigravity OS" <${process.env.SMTP_USER}>`,
          to: email,
          subject: `[CORE_AUTH] Your Security Passkey: ${otp}`,
          html: `
          <div style="font-family: 'Inter', sans-serif; background: #050510; color: #ffffff; padding: 40px; border-radius: 20px;">
            <h2 style="color: #6366f1; margin-bottom: 20px;">Antigravity Intelligence Systems</h2>
            <p style="color: #94a3b8;">Your administrative access passkey for the recruitment portal is below:</p>
            <div style="background: rgba(99, 101, 241, 0.1); border: 1px solid rgba(99, 101, 241, 0.2); padding: 30px; text-align: center; border-radius: 12px; margin: 30px 0;">
              <h1 style="color: #ffffff; letter-spacing: 12px; margin: 0; font-size: 32px;">${otp}</h1>
            </div>
            <p style="color: #64748b; font-size: 12px;">This key expires in 300 seconds. If you did not request this, please secure your terminal.</p>
          </div>
        `,
        });
        console.log(`✅ [AUTH] OTP delivered to ${email}`);
      } catch (emailErr) {
        console.error("❌ [AUTH] SMTP Delivery Failure:", emailErr.message);
        console.log(`\n🔑 [FALLBACK] OTP for ${email}: ${otp}\n`);
      }
    } else {
      console.warn("⚠️ [AUTH] SMTP credentials missing. Falling back to console log.");
      console.log(`\n🔑 [FALLBACK] OTP for ${email}: ${otp}\n`);
    }

    res.json({ 
      success: true, 
      message: "Security passkey dispatched", 
      email: email.toLowerCase(),
      devMode: !process.env.SMTP_USER 
    });
  } catch (err) {
    console.error("🚨 [AUTH] Send OTP Critical Failure:", err.stack || err);
    res.status(500).json({ 
      success: false,
      message: "Internal Authentication Error",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// POST /api/auth/verify-otp — Candidate OTP verification
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    // Find the OTP record
    const otpRecord = await Otp.findOne({
      email: email.toLowerCase(),
      otp: otp.toString(),
    });

    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Delete used OTP
    await Otp.deleteMany({ email: email.toLowerCase() });

    // Find or create user
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      user = await User.create({ email: email.toLowerCase(), role: 'candidate' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        profileCompleted: user.profileCompleted,
      },
    });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ message: "Failed to verify OTP" });
  }
});

// POST /api/auth/admin-login — Admin email+password login
router.post("/admin-login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase(), role: 'admin' });

    if (!user) {
      return res.status(401).json({ message: "Invalid admin credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid admin credentials" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.json({
      message: "Admin login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: 'admin',
      },
    });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ message: "Admin login failed" });
  }
});

// POST /api/auth/hr-login — HR email+password login
router.post("/hr-login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase(), role: 'hr' });

    if (!user) {
      return res.status(401).json({ message: "Invalid HR credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid HR credentials" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: 'hr' },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.json({
      message: "HR login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: 'hr',
      },
    });
  } catch (err) {
    console.error("HR login error:", err);
    res.status(500).json({ message: "HR login failed" });
  }
});

module.exports = router;
