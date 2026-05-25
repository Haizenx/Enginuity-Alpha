import nodemailer from "nodemailer";

// Read env with sensible defaults for Gmail
const {
  SMTP_HOST = "smtp.gmail.com",
  SMTP_PORT = "587",
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,
} = process.env;

let transporter;

/**
 * Ensure a valid RFC-5322 From header.
 * If MAIL_FROM is missing angle brackets, fall back to "Enginuity <SMTP_USER>".
 */
function resolveFrom() {
  const from = MAIL_FROM && MAIL_FROM.trim();
  if (from && from.includes("<") && from.includes(">")) return from;
  if (SMTP_USER) return `Enginuity <${SMTP_USER}>`;
  return "Enginuity <no-reply@enginuity.app>";
}

/**
 * Initialize and memoize a Nodemailer transporter for Gmail SMTP.
 * Requires a Gmail/Workspace account with 2FA and an App Password.
 */
export function getMailer() {
  if (transporter) return transporter;

  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP_USER/SMTP_PASS are required for Gmail mailer");
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),        // 587 for STARTTLS, 465 for SSL
    secure: Number(SMTP_PORT) === 465, // true for 465, false for 587
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    // Add these for better debugging
    logger: true,
    debug: true,
  });

  return transporter;
}

/**
 * Generic send function with detailed error logging
 */
export async function sendMail({ to, subject, html, text }) {
  try {
    const mailer = getMailer();

    // Verify transporter before sending
    console.log("Verifying SMTP connection...");
    await mailer.verify();
    console.log("SMTP connection verified");

    console.log(`Attempting to send email to: ${to}`);
    const info = await mailer.sendMail({
      from: resolveFrom(),
      to,
      subject,
      text,
      html,
    });

    console.log("Email sent successfully:", {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    });

    return info;
  } catch (error) {
    console.error("DETAILED EMAIL ERROR:", {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });
    // Re-throw so the controller catch block can handle it
    throw error;
  }
}

/**
 * Send newly-created account credentials.
 */
export async function sendWelcomeCredentials({ to, fullName, username, tempPassword, role }) {
  const subject = "Your Enginuity account credentials";

  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6;max-width:600px">
      <h2 style="margin:0 0 8px;color:#1976d2">Welcome to Enginuity</h2>
      <p style="margin:0 0 12px;font-size:16px">Hello ${fullName || "there"}, your ${role === "project_manager" ? "Project Manager" : role === "client" ? "Client" : "user"} account has been created.</p>
      
      <div style="background:#f6f8fa;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #1976d2">
        <div style="margin-bottom:12px">
          <strong style="display:block;margin-bottom:4px;color:#424242">Username:</strong>
          <code style="background:#fff;padding:8px 12px;border-radius:4px;display:inline-block;font-size:15px;color:#d32f2f;font-weight:600">${username}</code>
        </div>
        <div>
          <strong style="display:block;margin-bottom:4px;color:#424242">Temporary Password:</strong>
          <code style="background:#fff;padding:8px 12px;border-radius:4px;display:inline-block;font-size:15px;color:#d32f2f;font-weight:600">${tempPassword}</code>
        </div>
      </div>
      
      <div style="background:#fff3e0;padding:12px 16px;border-radius:8px;margin:16px 0;border-left:4px solid #ff9800">
        <p style="margin:0;color:#e65100;font-weight:500">
          <strong>Important:</strong> Please sign in using your <strong>username</strong> (not your email address) and change your password immediately for security.
        </p>
      </div>
      
      ${role === "client" ?
      `<div>
            <p style="margin:16px 0 8px;font-size:14px;color:#424242">
                <strong>Download the Enginuity Mobile App:</strong>
            </p>
            <a href="https://drive.google.com/drive/folders/1TnX8mwWjJi46ruTzza7Bquigx2Fy5ysy?fbclid=IwY2xjawNR7ydleHRuA2FlbQIxMQABHvcleW-h5Ur2Y_k330lZmehml6ni9nQQzqEAkWDGghJrc_ERHrwGcrtufjj0_aem_SP_d33z5gg0_ScnwHAqpLQ" style="display:inline-block;padding:10px 16px;background-color:#1976d2;color:#ffffff;text-decoration:none;border-radius:4px;font-size:14px;font-weight:600;">
                Download APK from Google Drive
            </a>
            <div style="margin:16px 0 8px;font-size:13px;color:#666">
                <p><strong>Installation Instructions:</strong></p>
                <ol style="padding-left: 20px; margin: 0;">
                    <li>Click the link to download the file. You may see a security warning; this is normal.</li>
                    <li>Open the downloaded file to begin installation.</li>
                    <li>Your phone will ask for permission to "install unknown apps". You must enable this to proceed.</li>
                </ol>
            </div>
        </div>`
      :
      `<p style="margin:16px 0 8px;font-size:14px;color:#666">
            Sign in at the Enginuity web portal.
        </p>`
    }
      
      <p style="margin:16px 0;font-size:13px;color:#999;border-top:1px solid #eee;padding-top:12px">
        This email was sent to: ${to}
      </p>
    </div>
  `;

  const text = `
Welcome to Enginuity

Hello ${fullName || "there"}, your Client account has been created.

Please install our private company app using the secure link below.

Download Link: https://drive.google.com/drive/folders/1TnX8mwWjJi46ruTzza7Bquigx2Fy5ysy?fbclid=IwY2xjawNR7ydleHRuA2FlbQIxMQABHvcleW-h5Ur2Y_k330lZmehml6ni9nQQzqEAkWDGghJrc_ERHrwGcrtufjj0_aem_SP_d33z5gg0_ScnwHAqpLQ

**Installation Instructions:**
1.  Click the link above to download the file. You may see a warning that Google can't scan the file for viruses; this is normal for this type of file.
2.  Once downloaded, open the file to begin installation.
3.  Your phone will ask you to allow installation from unknown sources. You must enable this setting to install the app.

Username: ${username}
Temporary Password: ${tempPassword}

This email was sent to: ${to}
  `;

  return sendMail({ to, subject, html, text });
}

/**
 * Send admin-fulfilled password reset notification.
 */
export async function sendAdminResetNotice({ to, fullName, tempPassword }) {
  const subject = "Your Enginuity password has been reset";
  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6">
      <h2 style="margin:0 0 8px">Password reset</h2>
      <p style="margin:0 0 12px">Hello ${fullName || "there"}, your password was reset by an administrator.</p>
      <div style="background:#f6f8fa;padding:12px 14px;border-radius:8px;margin:8px 0 12px">
        <div>Temporary password: <code>${tempPassword}</code></div>
      </div>
      <p style="margin:0 0 8px">Use this password to sign in, then set a new one in Settings.</p>
    </div>
  `;
  return sendMail({ to, subject, html });
}

/**
 * ----------------------------------------------------
 * ADDED FOR MOBILE: sendOTPEmail
 * Sends a premium HTML email containing a 6-digit OTP
 * verification code to reset a user's password.
 * ----------------------------------------------------
 */
export async function sendOTPEmail(to, otp) {
  const subject = "Verification Code for Password Reset";
  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6;max-width:500px;margin:0 auto;padding:24px;border:1px solid #e0e0e0;border-radius:12px;background-color:#ffffff">
      <h2 style="margin:0 0 12px;color:#1976d2;text-align:center;font-size:22px;font-weight:700">Reset Your Password</h2>
      <p style="margin:0 0 20px;font-size:15px;color:#424242;text-align:center">
        We received a request to reset the password for your account. Please use the verification code below to complete the process. This code is valid for 10 minutes.
      </p>
      <div style="background:#f6f8fa;padding:16px 20px;border-radius:8px;margin:16px auto;text-align:center;max-width:200px;border:1px dashed #1976d2">
        <code style="font-size:32px;font-weight:700;color:#d32f2f;letter-spacing:4px;font-family:Consolas,Monaco,monospace">${otp}</code>
      </div>
      <p style="margin:20px 0 0;font-size:13px;color:#757575;text-align:center;border-top:1px solid #eee;padding-top:12px">
        If you did not request a password reset, please ignore this email. Your password will remain unchanged.
      </p>
    </div>
  `;
  const text = `Verification Code for Password Reset\n\nHello,\n\nWe received a request to reset the password for your Enginuity account. Please use the verification code (OTP) below to complete the process. This code is valid for 10 minutes.\n\nVerification Code: ${otp}\n\nIf you did not request a password reset, please ignore this email.`;

  return sendMail({ to, subject, html, text });
}

