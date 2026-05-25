// controllers/auth.controller.js
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import SuperAdmin from "../models/superAdmin.model.js";
import AdminResetRequest from "../models/adminResetRequest.model.js";
import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import { sendOTPEmail } from "../lib/mailer.js";


// ---------------------- SIGNUP (clients / PMs) ----------------------
export const signup = async (req, res) => {
  try {
    const { fullName, email, password, role, platform } = req.body;

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      fullName,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      isActive: true,
    });

    // Generate token and get it back for mobile
    const token = generateToken(newUser._id, res, role, platform || "web");

    res.status(201).json({
      _id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      role: newUser.role,
      profilePic: newUser.profilePic,
      token: platform === "mobile" ? token : undefined, // ⭐ Return token for mobile
    });
  } catch (error) {
    console.error("❌ Signup error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ---------------------- LOGIN (all roles) ----------------------
// ---------------------- LOGIN (all roles) ----------------------
export const login = async (req, res) => {
  try {
    const { email, password, platform } = req.body;
    if (!email || !password || !platform) {
      return res.status(400).json({ message: "email, password, and platform are required" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    console.log(`🔐 LOGIN ATTEMPT email=${normalizedEmail} platform=${platform}`);

    let user = null;
    let userRole = null;

    // 1) Try SuperAdmin collection first
    const sa = await SuperAdmin.findOne({ email: normalizedEmail, isActive: true });
    if (sa) {
      user = sa;
      userRole = "superadmin";
      console.log(`➡️ Auth path: SuperAdmin id=${user._id}`);
    }

    // 2) Fallback to User collection
    if (!user) {
      const u = await User.findOne({ email: normalizedEmail, isActive: true });
      if (u) {
        user = u;
        userRole = u.role;
        console.log(`➡️ Auth path: User(${userRole}) id=${user._id}`);
      }
    }

    // 3) Check if user exists
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 4) ⭐ MOVED: Enforce platform policy AFTER we know the role
    if (userRole === "client" && platform === "web") {
      return res.status(403).json({ message: "Client accounts can only sign in on mobile." });
    }

    if (userRole !== "client" && platform === "mobile") {
      return res.status(403).json({ message: "Only client accounts can sign in on mobile." });
    }

    // 5) Check lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(423).json({ message: "Account temporarily locked" });
    }

    // 6) Verify password via bcrypt
    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await user.save();
      return res.status(400).json({ message: "Username or password is wrong" });
    }

    // 7) Reset attempts and update last login
    if (user.loginAttempts || user.lockedUntil || !user.lastLogin) {
      user.loginAttempts = 0;
      user.lockedUntil = null;
      user.lastLogin = new Date();
      await user.save();
    }

    // 8) Issue JWT cookie with role + platform and get token back
    const token = generateToken(user._id, res, userRole, platform);

    // 9) ⭐ Return token in response body for mobile
    return res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: userRole,
      profilePic: user.profilePic,
      permissions: userRole === "superadmin" ? user.permissions : undefined,
      lastLogin: user.lastLogin,
      token: platform === "mobile" ? token : undefined,
    });
  } catch (error) {
    console.error("❌ Login error:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// ---------------------- LOGOUT ----------------------
export const logout = (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
    });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("❌ Logout error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ---------------------- UPDATE PROFILE ----------------------
export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    if (!profilePic) return res.status(400).json({ message: "Profile pic is required" });

    const upload = await cloudinary.uploader.upload(profilePic);
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { profilePic: upload.secure_url },
      { new: true }
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("❌ Update profile error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ---------------------- CHECK AUTH ----------------------
export const checkAuth = (req, res) => {
  try {
    res.status(200).json({
      _id: req.user._id,
      fullName: req.user.fullName,
      email: req.user.email,
      profilePic: req.user.profilePic,
      role: req.userType || req.user.role,
      platform: req.platform || "web",
      permissions: req.userType === "superadmin" ? req.user.permissions : undefined,
      lastLogin: req.user.lastLogin,
    });
  } catch (error) {
    console.error("❌ Check auth error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ---------------------- UPDATE PASSWORD ----------------------
const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}\[\]|;:'",.<>/?`~]).{8,}$/;

export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ message: "All fields are required." });
    }
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: "New passwords do not match." });
    }
    if (!STRONG_PASSWORD_REGEX.test(newPassword)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.",
      });
    }

    let entity = null;
    if (req.userType === "superadmin") {
      entity = await SuperAdmin.findById(req.user._id);
    } else {
      entity = await User.findById(req.user._id);
    }

    if (!entity) {
      return res.status(404).json({ message: "User not found." });
    }

    const ok = await bcrypt.compare(currentPassword, entity.password);
    if (!ok) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    entity.password = newPassword;
    entity.loginAttempts = 0;
    entity.lockedUntil = null;

    await entity.save();

    return res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("❌ Update password error:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// ---------------------- FORGOT PASSWORD ----------------------
export const forgotPassword = async (req, res) => {
  try {
    const { identifier } = req.body;
    const generic = { message: "If the account exists, a reset request has been queued." };

    if (!identifier) return res.status(200).json(generic);

    const email = String(identifier).toLowerCase().trim();
    const user = await User.findOne({ email, isActive: true });

    if (user) {
      await AdminResetRequest.create({
        managerUserId: user._id,
        status: "pending",
        requestedAt: new Date(),
        notes: "Initiated via public forgot-password (no email).",
      });
    }

    return res.status(200).json(generic);
  } catch (error) {
    console.error("❌ Forgot password error:", error.message);
    return res.status(200).json({ message: "If the account exists, a reset request has been queued." });
  }
};

// ---------------------- SET SUPER ADMIN PASSWORD ----------------------
export const setSuperAdminPassword = async (req, res) => {
  try {
    if (req.userType !== "superadmin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { newPassword, confirmNewPassword } = req.body;
    if (!newPassword || !confirmNewPassword) {
      return res.status(400).json({ message: "Both newPassword and confirmNewPassword are required." });
    }
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: "New passwords do not match." });
    }
    if (!STRONG_PASSWORD_REGEX.test(newPassword)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.",
      });
    }

    const sa = await SuperAdmin.findById(req.user._id);
    if (!sa || !sa.isActive) {
      return res.status(404).json({ message: "Super Admin not found." });
    }

    sa.password = newPassword;
    sa.loginAttempts = 0;
    sa.lockedUntil = null;

    await sa.save();

    return res.status(200).json({ message: "Super Admin password updated." });
  } catch (error) {
    console.error("❌ setSuperAdminPassword error:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// =========================================================================
// ADDED FOR MOBILE: OTP-based Password Reset flow (with email support)
// =========================================================================

/**
 * Helper: Generate a 6-digit numeric verification code (OTP).
 */
const generateNumericOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Endpoint: POST /api/auth/forgot-password-mobile
 * Generates an OTP, saves it to the User model, and sends an email to the user.
 */
export const forgotPasswordMobile = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    // Find the user by their email
    const user = await User.findOne({ recoveryEmail: email.toLowerCase() });

    if (!user) {
      // For security reasons, you may want to return a generic success message,
      // but in an admin-provisioned setup, returning "User not found" is helpful.
      return res.status(404).json({ success: false, message: 'No account registered with this email.' });
    }

    // Generate 6-digit OTP code
    const otp = generateNumericOTP();
    // Set OTP expiration to 10 minutes from now
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    // Save to User document in MongoDB
    user.resetOTP = otp;
    user.resetOTPExpires = otpExpiry;
    await user.save();

    // Send email with OTP using the Nodemailer service
    await sendOTPEmail(user.recoveryEmail, otp);

    return res.status(200).json({
      success: true,
      message: 'A verification OTP has been sent to your recovery email.'
    });
  } catch (error) {
    console.error('Forgot Password Mobile Error:', error);
    return res.status(500).json({
      success: false,
      message: 'An internal error occurred while processing your request.'
    });
  }
};

/**
 * Endpoint: POST /api/auth/reset-password-mobile
 * Verifies the OTP, sets the new password, and updates it in MongoDB.
 * Note: password hashing is handled automatically by the pre-save hook in userModel.js.
 */
export const resetPasswordMobile = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, verification code (OTP), and new password are required.'
      });
    }

    // Retrieve the user with the correct email
    const user = await User.findOne({ recoveryEmail: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Check if the OTP is set
    if (!user.resetOTP) {
      return res.status(400).json({
        success: false,
        message: 'No active password reset request was found for this user.'
      });
    }

    // Check if the OTP has expired
    if (new Date() > user.resetOTPExpires) {
      // Clear the expired OTP fields for security
      user.resetOTP = null;
      user.resetOTPExpires = null;
      await user.save();

      return res.status(400).json({
        success: false,
        message: 'The verification code has expired. Please request a new one.'
      });
    }

    // Check if OTP matches
    if (user.resetOTP !== otp.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please try again.'
      });
    }

    // Set plaintext new password.
    // The Mongoose pre-save hook in userModel.js will automatically handle hashing
    // (exactly like updatePassword) to prevent double hashing issues.
    user.password = newPassword;
    user.resetOTP = null;
    user.resetOTPExpires = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Your password has been successfully reset! You can now log in.'
    });
  } catch (error) {
    console.error('Reset Password Mobile Error:', error);
    return res.status(500).json({
      success: false,
      message: 'An internal error occurred while resetting your password.'
    });
  }
};