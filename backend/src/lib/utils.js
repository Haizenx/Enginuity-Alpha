import jwt from "jsonwebtoken";

export const generateToken = (
  userId,
  res,
  userType = "user",
  platform = "web"
) => {
  const payload = { userId, userType, platform };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "15d",
  });

  if (platform === "web") {
    // This is the production-ready cookie configuration
    res.cookie("token", token, {
      maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      domain: process.env.NODE_ENV === "production" ? ".onrender.com" : undefined,
    });
  }

  return token;
};

export const clearAuthCookie = (res) => {
  // Ensure the cookie is cleared with the same production settings
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    domain: process.env.NODE_ENV === "production" ? ".onrender.com" : undefined,
  });
};

export function formatMessageTime(date) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
