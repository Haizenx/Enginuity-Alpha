import nodemailer from "nodemailer";

// Read env with sensible defaults for Gmail
const {
  SMTP_HOST = "smtp.gmail.com",
  SMTP_PORT = "587",
  MAIL_FROM,
} = process.env;

const SMTP_USER = process.env.SMTP_USER || process.env.EMAIL_USER;
const SMTP_PASS = process.env.SMTP_PASS || process.env.EMAIL_PASS;

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
    throw new Error("SMTP_USER/SMTP_PASS (or EMAIL_USER/EMAIL_PASS in .env) are required for Gmail mailer. Please configure them in your environment variables.");
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
    <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); padding: 32px 24px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Enginuity</h1>
        <p style="margin: 8px 0 0; color: #e0e7ff; font-size: 16px;">Welcome to your workspace</p>
      </div>
      <div style="padding: 32px 24px;">
        <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 20px;">Hello ${fullName || "there"},</h2>
        <p style="margin: 0 0 24px; color: #475569; font-size: 16px;">Your <strong>${role === "project_manager" ? "Project Manager" : role === "client" ? "Client" : "User"}</strong> account has been officially created. Below are your temporary login credentials.</p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <div style="margin-bottom: 16px;">
            <p style="margin: 0 0 4px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">Username</p>
            <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 16px; font-family: monospace; font-size: 16px; font-weight: 600; color: #0f172a;">${username}</div>
          </div>
          <div>
            <p style="margin: 0 0 4px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">Temporary Password</p>
            <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 16px; font-family: monospace; font-size: 16px; font-weight: 600; color: #0f172a;">${tempPassword}</div>
          </div>
        </div>

        <div style="background-color: #fffbeb; border-left: 4px solid #fbbf24; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
          <p style="margin: 0; color: #b45309; font-size: 14px; font-weight: 500;"><strong>Security Notice:</strong> Please sign in using your username and immediately change your password in the Settings page.</p>
        </div>

        ${role === "client" ? `
        <div style="margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 24px;">
          <h3 style="margin: 0 0 12px; color: #1e293b; font-size: 16px;">Get the Mobile App</h3>
          <p style="margin: 0 0 16px; color: #475569; font-size: 14px;">As a client, you can track your project's progress directly from your phone.</p>
          <a href="https://drive.google.com/drive/u/0/folders/1Nh1Low3JWFhA9bHQPOuUpgiQJ9afJpqy?fbclid=IwY2xjawSXOkBleHRuA2FlbQIxMABicmlkETEzYjc3czZTSjV5QlVxTkNEc3J0YwZhcHBfaWQQMjIyMDM5MTc4ODIwMDg5MgABHiLyKXbGZ2tdKjSg5jZvL70gpKgHA8GLOLWP4jFZ3ZbQkzzfXtFsIAEpzaWq_aem_u5i_DVu_BKnwFhlpzI8pqw" style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 15px;">Download Android APK</a>
        </div>
        ` : `
        <div style="margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 24px; text-align: center;">
          <a href="https://enginuity-alpha.onrender.com" style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 15px;">Sign In to Portal</a>
        </div>
        `}
      </div>
      <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; color: #94a3b8; font-size: 12px;">This email was sent to ${to}</p>
        <p style="margin: 8px 0 0; color: #94a3b8; font-size: 12px;">&copy; ${new Date().getFullYear()} Enginuity. All rights reserved.</p>
      </div>
    </div>`;

  const text = `
Welcome to Enginuity

Hello ${fullName || "there"}, your Client account has been created.

Please install our private company app using the secure link below.

Download Link: https://drive.google.com/drive/u/0/folders/1Nh1Low3JWFhA9bHQPOuUpgiQJ9afJpqy?fbclid=IwY2xjawSXOkBleHRuA2FlbQIxMABicmlkETEzYjc3czZTSjV5QlVxTkNEc3J0YwZhcHBfaWQQMjIyMDM5MTc4ODIwMDg5MgABHiLyKXbGZ2tdKjSg5jZvL70gpKgHA8GLOLWP4jFZ3ZbQkzzfXtFsIAEpzaWq_aem_u5i_DVu_BKnwFhlpzI8pqw

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
    <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); padding: 24px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800;">Password Reset</h1>
      </div>
      <div style="padding: 32px 24px;">
        <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 18px;">Hello ${fullName || "there"},</h2>
        <p style="margin: 0 0 24px; color: #475569; font-size: 15px;">Your password was recently reset by an administrator per your request. Please use the temporary password below to sign in.</p>
        
        <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
          <p style="margin: 0 0 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">Temporary Password</p>
          <div style="font-family: monospace; font-size: 20px; font-weight: 700; color: #4f46e5; letter-spacing: 1px;">${tempPassword}</div>
        </div>

        <p style="margin: 0; color: #475569; font-size: 14px; text-align: center;">You will be required to change this password immediately upon logging in.</p>
      </div>
    </div>`;
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
    <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 500px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <div style="padding: 32px 24px; text-align: center;">
        <h2 style="margin: 0 0 12px; color: #1e293b; font-size: 22px; font-weight: 800;">Verification Code</h2>
        <p style="margin: 0 0 24px; color: #475569; font-size: 15px;">
          We received a request to reset your password. Use the code below to proceed. <strong>This code expires in 10 minutes.</strong>
        </p>
        
        <div style="background: #f8fafc; padding: 24px; border-radius: 8px; margin: 0 auto 24px; border: 2px dashed #cbd5e1; display: inline-block;">
          <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; color: #4f46e5; letter-spacing: 6px;">${otp}</div>
        </div>
        
        <p style="margin: 0; font-size: 13px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          If you didn't request this, you can safely ignore this email. Your password will not be changed.
        </p>
      </div>
    </div>`;
  const text = `Verification Code for Password Reset\n\nHello,\n\nWe received a request to reset the password for your Enginuity account. Please use the verification code (OTP) below to complete the process. This code is valid for 10 minutes.\n\nVerification Code: ${otp}\n\nIf you did not request a password reset, please ignore this email.`;

  return sendMail({ to, subject, html, text });
}

