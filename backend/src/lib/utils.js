import jwt from "jsonwebtoken";

/**
 * Signs a JWT and sets it as an HttpOnly cookie on the response.
 * Includes userId, userType (role), and platform claims.
 */
export const generateToken = (
  userId,
  res,
  userType = "user",
  platform = "web",
  opts = {}
) => {
  // Your original configurable options are preserved here
  const {
    expiresIn = "15d",
    cookieName = "token",
    cookieMaxAgeMs = 15 * 24 * 60 * 60 * 1000, // 15 days
    sameSite = "Lax", // This is the default for local development
    path = "/",
  } = opts;

  const payload = { userId, userType, platform };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });

  if (platform === "web") {
    // --- FINALIZED COOKIE OPTIONS ---
    // This object intelligently sets the correct options for production vs. development
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : sameSite,
      domain: process.env.NODE_ENV === "production" ? ".onrender.com" : undefined,
      maxAge: cookieMaxAgeMs,
      path,
    };
    
    res.cookie(cookieName, token, cookieOptions);
  }

  return token; // Return token for mobile use
};

/**
 * Helper to clear the auth cookie consistently.
 */
export const clearAuthCookie = (res, opts = {}) => {
  const { 
    cookieName = "token", 
    path = "/",
    sameSite = "Lax" 
  } = opts;

  // --- FINALIZED COOKIE OPTIONS ---
  // Ensure the cookie is cleared with the same production settings
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : sameSite,
    domain: process.env.NODE_ENV === "production" ? ".onrender.com" : undefined,
    path,
  };

  res.clearCookie(cookieName, cookieOptions);
};

/**
 * UI helper used by the frontend server-rendered views only.
 */
export function formatMessageTime(date) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
