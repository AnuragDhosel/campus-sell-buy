/**
 * @file utils/sendEmail.js
 * @description Safe transactional email sending utility.
 * Supports Resend API (recommended for production & real testing), Nodemailer SMTP,
 * and safe console logging in development.
 */

const { Resend } = require('resend');
const nodemailer = require('nodemailer');

/**
 * Sends an email using Resend API or Nodemailer SMTP, with safe console fallback.
 *
 * @param {Object} options          - Email options
 * @param {string} options.to       - Recipient email address
 * @param {string} options.subject  - Email subject line
 * @param {string} options.html     - Email body in HTML format
 */
const sendEmail = async ({ to, subject, html }) => {
  // Extract reset URL from HTML if present
  const linkMatch = html.match(/href="([^"]+)"/);
  const resetUrl = linkMatch ? linkMatch[1] : null;

  // Helper function to print reset info cleanly to terminal
  const printDevEmail = (reason) => {
    console.log('\n=========================================================');
    console.log(`📧 [DEV EMAIL MODE] ${reason}`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    if (resetUrl) {
      console.log(`🔗 RESET URL: ${resetUrl}`);
    }
    console.log('=========================================================\n');
  };

  // ── 1. RESEND API INTEGRATION ─────────────────────────────────────────────
  // If RESEND_API_KEY is present and valid, send via Resend API
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_')) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromAddress = process.env.MAIL_FROM || 'Campus Marketplace <onboarding@resend.dev>';
      
      const { data, error } = await resend.emails.send({
        from: fromAddress.includes('resend.dev') ? 'onboarding@resend.dev' : fromAddress,
        to: [to],
        subject,
        html,
      });

      if (error) {
        console.error('Resend API returned error:', error.message || error);
        printDevEmail(`Resend API Error (${error.message || 'Failed'}). Fallback to Console:`);
        return;
      }

      console.log(`📧 Real Email Sent via Resend API! ID: ${data?.id}`);
      return;
    } catch (err) {
      console.error('Resend API Exception:', err.message);
      printDevEmail(`Resend Exception (${err.message}). Fallback to Console:`);
      return;
    }
  }

  // ── 2. NODEMAILER SMTP FALLBACK ───────────────────────────────────────────
  const isPlaceholder =
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS ||
    process.env.SMTP_USER.includes('your-email') ||
    process.env.SMTP_USER.includes('example.com') ||
    process.env.SMTP_PASS.includes('your-gmail') ||
    process.env.SMTP_PASS.includes('placeholder');

  if (isPlaceholder) {
    printDevEmail('Safe Local Console Mode (No SMTP/Resend API Credentials)');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const message = {
      from: process.env.MAIL_FROM || `Campus Marketplace <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(message);
    console.log(`📧 Email sent successfully via SMTP: ${info.messageId}`);
  } catch (err) {
    printDevEmail(`SMTP Error (${err.message}). Safe Fallback to Console:`);
  }
};

module.exports = sendEmail;
