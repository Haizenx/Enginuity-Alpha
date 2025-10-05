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
  const {
    expiresIn = "15d",
    cookieName = "token",
    cookieMaxAgeMs = 15 * 24 * 60 * 60 * 1000, // 15 days
  } = opts;

  const payload = { userId, userType, platform };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });

  // Only set the cookie for the web platform
  if (platform === "web") {
    // --- UPDATED BLOCK ---
    // These are the production-grade settings for cross-domain cookies
    res.cookie(cookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      domain: process.env.NODE_ENV === "production" ? ".onrender.com" : undefined,
      maxAge: cookieMaxAgeMs,
      path: "/",
    });
  }

  return token; // Return token for mobile use
};

/**
 * Helper to clear the auth cookie consistently.
 */
export const clearAuthCookie = (res, opts = {}) => {
  const { cookieName = "token", path = "/" } = opts;
  // --- UPDATED BLOCK ---
  // Ensure the cookie is cleared with the same domain and path settings
  res.clearCookie(cookieName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    domain: process.env.NODE_ENV === "production" ? ".onrender.com" : undefined,
    path,
  });
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
