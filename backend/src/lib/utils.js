// backend/src/lib/utils.js
import jwt from "jsonwebtoken";

/**
 * Signs a JWT and optionally sets it as an HttpOnly cookie on the response.
 * Includes userId, userType (role), and platform ("web" | "mobile") claims.
 * ⭐ MODIFIED: Only sets cookie for web platform, returns token for mobile.
 *
 * @param {string} userId
 * @param {import('express').Response} res
 * @param {string} userType - e.g. "superadmin" | "project_manager" | "client"
 * @param {string} platform - "web" | "mobile"
 * @param {object} opts - optional overrides
 * @returns {string} token - JWT token string
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
    sameSite = "Lax",
    path = "/",
  } = opts;

  const payload = { userId, userType, platform };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });

  // ⭐ MODIFIED: Only set cookie for web platform
  if (platform === "web") {
    res.cookie(cookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite,
      maxAge: cookieMaxAgeMs,
      path,
    });
  }

  return token; // ⭐ Return token for mobile use
};

/**
 * Helper to clear the auth cookie consistently.
 * Usage: clearAuthCookie(res)
 */
export const clearAuthCookie = (res, opts = {}) => {
  const { cookieName = "token", path = "/" } = opts;
  res.clearCookie(cookieName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
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
