const nodemailer = require("nodemailer");

let cachedTransport = null;

const getTransport = () => {
  if (cachedTransport) return cachedTransport;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP is not configured");
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "false") === "true";

  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });

  return cachedTransport;
};

const sendWelcomeEmail = async ({ to, name, password, role }) => {
  const transport = getTransport();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const appUrl = (process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:5173").replace(
    /\/$/,
    ""
  );
  const loginUrl = `${appUrl}/login`;

  const safeName = name?.trim() || "User";

  const subject = "🎉 Welcome to English Portal - Your Account Details";

  const text = `Hello ${safeName},

Welcome to English Portal! 🎉

Your account has been successfully created. Below are your login details:

Email: ${to}
Password: ${password}
Role: ${role}

Login here: ${loginUrl}

For security reasons, please log in and change your password immediately after your first login.

If you did not request this account, please ignore this email or contact our support team.

Best regards,
English Portal Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.7; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
      <h2 style="color: #2563eb; margin-bottom: 10px;">🎉 Welcome to English Portal, ${safeName}!</h2>
      
      <p style="font-size: 15px; color: #111827;">
        Your account has been successfully created. Below are your login details:
      </p>

      <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e5e7eb;">
        <p style="margin: 6px 0;"><strong>Email:</strong> ${to}</p>
        <p style="margin: 6px 0;"><strong>Password:</strong> ${password}</p>
        <p style="margin: 6px 0;"><strong>Role:</strong> ${role}</p>
      </div>

      <div style="margin: 16px 0 10px;">
        <a href="${loginUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; padding: 10px 18px; border-radius: 8px;">
          Go to English Portal
        </a>
      </div>

      <p style="font-size: 14px; color: #374151;">
        🔐 For security reasons, please log in and change your password immediately after your first login.
      </p>

      <p style="font-size: 14px; color: #6b7280;">
        If you did not request this account, please ignore this email or contact our support team.
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

      <p style="font-size: 13px; color: #9ca3af;">
        Best regards,<br/>
        <strong>English Portal Team</strong>
      </p>
    </div>
  `;

  await transport.sendMail({ from, to, subject, text, html });
};

const sendResetCodeEmail = async ({ to, name, code }) => {
  const transport = getTransport();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const safeName = name?.trim() || "User";

  const subject = "Your password reset code - English Portal";

  const text = `Hello ${safeName},

Use the following 6-digit code to reset your password:

${code}

If you did not request this, you can ignore this email.

Best regards,
English Portal Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.7; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
      <h2 style="color: #2563eb; margin-bottom: 10px;">Password Reset Code</h2>
      <p style="font-size: 15px; color: #111827;">
        Hello ${safeName}, use the code below to reset your password:
      </p>

      <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e5e7eb; text-align: center;">
        <p style="margin: 6px 0; font-size: 22px; letter-spacing: 6px; font-weight: 700;">${code}</p>
      </div>

      <p style="font-size: 14px; color: #6b7280;">
        If you did not request this, you can safely ignore this email.
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

      <p style="font-size: 13px; color: #9ca3af;">
        Best regards,<br/>
        <strong>English Portal Team</strong>
      </p>
    </div>
  `;

  await transport.sendMail({ from, to, subject, text, html });
};

const sendGoogleLoginCodeEmail = async ({ to, name, code }) => {
  const transport = getTransport();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const safeName = name?.trim() || "User";

  const subject = "Your Google login verification code - English Portal";

  const text = `Hello ${safeName},

Use the following 6-digit code to complete your Google login:

${code}

If you did not request this, you can ignore this email.

Best regards,
English Portal Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.7; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
      <h2 style="color: #2563eb; margin-bottom: 10px;">Google Login Verification Code</h2>
      <p style="font-size: 15px; color: #111827;">
        Hello ${safeName}, use the code below to complete your Google login:
      </p>

      <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e5e7eb; text-align: center;">
        <p style="margin: 6px 0; font-size: 22px; letter-spacing: 6px; font-weight: 700;">${code}</p>
      </div>

      <p style="font-size: 14px; color: #6b7280;">
        If you did not request this, you can safely ignore this email.
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

      <p style="font-size: 13px; color: #9ca3af;">
        Best regards,<br/>
        <strong>English Portal Team</strong>
      </p>
    </div>
  `;

  await transport.sendMail({ from, to, subject, text, html });
};

const sendPasswordResetEmail = async ({ to, name, resetToken }) => {
  const transport = getTransport();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const appUrl = (process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:5173").replace(
    /\/$/,
    ""
  );
  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(
    resetToken
  )}&email=${encodeURIComponent(to)}`;

  const safeName = name?.trim() || "User";

  const subject = "Reset your English Portal password";

  const text = `Hello ${safeName},

We received a request to reset your password.

Reset your password using this link:
${resetUrl}

If you did not request a password reset, you can ignore this email.

Best regards,
English Portal Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.7; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
      <h2 style="color: #2563eb; margin-bottom: 10px;">Reset your password, ${safeName}</h2>
      <p style="font-size: 15px; color: #111827;">
        We received a request to reset your password. Click the button below to continue.
      </p>
      <div style="margin: 16px 0 10px;">
        <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; padding: 10px 18px; border-radius: 8px;">
          Reset Password
        </a>
      </div>
      <p style="font-size: 14px; color: #6b7280;">
        If you did not request this, you can safely ignore this email.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="font-size: 13px; color: #9ca3af;">
        Best regards,<br/>
        <strong>English Portal Team</strong>
      </p>
    </div>
  `;

  await transport.sendMail({ from, to, subject, text, html });
};

const sendForgotPasswordEmail = async ({ to, name, password }) => {
  const transport = getTransport();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const appUrl = (process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:5173").replace(
    /\/$/,
    ""
  );
  const loginUrl = `${appUrl}/login`;

  const safeName = name?.trim() || "User";

  const subject = "Your temporary password - English Portal";

  const text = `Hello ${safeName},

We have reset your password. Here is your temporary password:

Password: ${password}

Login here: ${loginUrl}

For security reasons, please log in and change your password immediately.

Best regards,
English Portal Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.7; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
      <h2 style="color: #2563eb; margin-bottom: 10px;">Your temporary password</h2>
      <p style="font-size: 15px; color: #111827;">
        Hello ${safeName}, your password has been reset. Use the temporary password below to sign in.
      </p>

      <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e5e7eb;">
        <p style="margin: 6px 0;"><strong>Temporary Password:</strong> ${password}</p>
      </div>

      <div style="margin: 16px 0 10px;">
        <a href="${loginUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; padding: 10px 18px; border-radius: 8px;">
          Go to English Portal
        </a>
      </div>

      <p style="font-size: 14px; color: #374151;">
        For security reasons, please log in and change your password immediately.
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

      <p style="font-size: 13px; color: #9ca3af;">
        Best regards,<br/>
        <strong>English Portal Team</strong>
      </p>
    </div>
  `;

  await transport.sendMail({ from, to, subject, text, html });
};

module.exports = {
  sendWelcomeEmail,
  sendResetCodeEmail,
  sendGoogleLoginCodeEmail,
  sendPasswordResetEmail,
  sendForgotPasswordEmail
};
