// models/user.model.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
  {
    // Common fields
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    recoveryEmail: { // <-- ADD THIS FIELD
      type: String,
      trim: true,
      lowercase: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8, // align with controllers requiring >= 8
      select: true,
    },
    contactNumber: { type: String, trim: true },
    profilePic: { type: String, default: "" },

    // Role handling
    role: {
      type: String,
      enum: ["superadmin", "client", "project_manager"],
      default: "client",
    },

    //for forgot password
    resetOTP: {
      type: String,
      default: null
    },
    resetOTPExpires: {
      type: Date,
      default: null
    },

    permissions: {
      type: [String],
      default: function () {
        return this.role === "superadmin" ? ["all"] : [];
      },
    },

    isActive: { type: Boolean, default: true },

    // Security / access control
    lastLogin: { type: Date },
    loginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },

    // Password reset + session invalidation
    passwordResetToken: { type: String },   // store a hash, never the raw token
    passwordResetExpires: { type: Date },   // expiry time for the reset token
    passwordChangedAt: { type: Date },      // used to invalidate old JWTs

    // Optional fields for clients
    location: { type: String, trim: true },
    description: { type: String, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },

    // References
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // usually superadmin
  },
  { timestamps: true }
);

/**
 * Pre-save: hash password if modified.
 * Also bump passwordChangedAt when password changes, so old JWTs become invalid.
 */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  // Set passwordChangedAt to now minus 1s to handle token issuance timing
  this.passwordChangedAt = new Date(Date.now() - 1000);

  next();
});

/**
 * Instance method: compare plaintext password with hashed password.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Instance method: create a password reset token.
 * - Generates a cryptographically strong token.
 * - Stores only a SHA-256 hash of the token and an expiry time.
 * - Returns the raw token (to be emailed), not the hash.
 */
userSchema.methods.createPasswordResetToken = function (expiresMinutes = 15) {
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Hash the token for storage
  const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
  this.passwordResetToken = tokenHash;

  // Set expiry
  const ms = expiresMinutes * 60 * 1000;
  this.passwordResetExpires = new Date(Date.now() + ms);

  return resetToken; // raw token to send via email
};

/**
 * Instance method: check if JWT issued at iat (in seconds) is before password change.
 * Returns true if password was changed after the token was issued.
 */
userSchema.methods.changedPasswordAfter = function (JWTTimestampSec) {
  if (!this.passwordChangedAt) return false;
  const pwdChangedAtSec = Math.floor(this.passwordChangedAt.getTime() / 1000);
  return pwdChangedAtSec > JWTTimestampSec;
};

const User = mongoose.model("User", userSchema);
export default User;
