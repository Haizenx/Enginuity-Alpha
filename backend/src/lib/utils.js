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
    res.cookie("token", token, {
      maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      // Returned: process.env.NODE_ENV === "production" ? "None" : 
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      // domain: ... <-- THIS LINE HAS BEEN REMOVED
    });
  }

  return token;
};

export const clearAuthCookie = (res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Returned: process.env.NODE_ENV === "production" ? "None" : 
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    // domain: ... <-- THIS LINE HAS BEEN REMOVED
  });
};

export function formatMessageTime(date) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
