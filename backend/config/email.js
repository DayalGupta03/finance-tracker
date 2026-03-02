/**
 * Email Configuration — Nodemailer transport
 * Uses Ethereal (fake SMTP) by default for development.
 * Switch to Gmail by setting EMAIL_USER and EMAIL_PASS in .env
 */
const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;
let etherealAccount = null;

async function getTransporter() {
  if (transporter) return transporter;

  // If real credentials provided, use them (Gmail / any SMTP)
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    console.log('📧 Email transport: Gmail (%s) on port 587', process.env.EMAIL_USER);
    return transporter;
  }

  // Fallback: Ethereal (fake SMTP — preview emails in browser)
  etherealAccount = await nodemailer.createTestAccount();
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: etherealAccount.user,
      pass: etherealAccount.pass,
    },
  });
  console.log('📧 Email transport: Ethereal (dev mode)');
  console.log('   Preview inbox: https://ethereal.email/login');
  console.log('   User: %s | Pass: %s', etherealAccount.user, etherealAccount.pass);
  return transporter;
}

/**
 * Send OTP verification email
 * @param {string} to - recipient email
 * @param {string} otp - plain-text OTP (6 digits)
 * @param {string} name - user's name for personalization
 */
async function sendOTP(to, otp, name = 'User') {
  const transport = await getTransporter();

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f8f9fb; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 40px;">💰</span>
        <h1 style="margin: 8px 0 0; font-size: 22px; color: #0f172a;">FinTrack</h1>
      </div>
      <div style="background: #ffffff; border-radius: 8px; padding: 24px; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 16px; color: #334155; font-size: 15px;">Hi ${name},</p>
        <p style="margin: 0 0 20px; color: #334155; font-size: 15px;">Your verification code is:</p>
        <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 20px;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #4f46e5;">${otp}</span>
        </div>
        <p style="margin: 0 0 8px; color: #64748b; font-size: 13px;">This code expires in <strong>10 minutes</strong>.</p>
        <p style="margin: 0; color: #64748b; font-size: 13px;">If you didn't request this, ignore this email.</p>
      </div>
      <p style="text-align: center; margin-top: 20px; color: #94a3b8; font-size: 12px;">© FinTrack — Secure Finance Tracking</p>
    </div>
  `;

  const info = await transport.sendMail({
    from: `"FinTrack" <${process.env.EMAIL_USER || etherealAccount?.user || 'noreply@fintrack.app'}>`,
    to,
    subject: `${otp} is your FinTrack verification code`,
    html,
  });

  // Log Ethereal preview URL in dev mode
  if (etherealAccount) {
    const preview = nodemailer.getTestMessageUrl(info);
    console.log('📬 OTP email preview: %s', preview);
    return { messageId: info.messageId, previewUrl: preview };
  }

  return { messageId: info.messageId };
}

module.exports = { sendOTP, getTransporter };
