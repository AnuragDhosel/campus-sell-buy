/**
 * @file utils/sendEmail.js
 * @description Sends emails using Gmail SMTP through Nodemailer.
 */

const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, html }) => {
  const user = (process.env.SMTP_USER || 'use2ndanywhere254@gmail.com').trim();
  const pass = (process.env.SMTP_PASS || 'utlhnhiiagtugibm').trim();

  // Primary: Use Gmail service (port 465 SSL direct)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  const mailOptions = {
    from: `Campus Marketplace <${user}>`,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent successfully to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Email sending failed via service gmail:', error.message);

    // Fallback: try direct host + port 465 SSL
    try {
      const fallbackTransporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user, pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
      const info = await fallbackTransporter.sendMail(mailOptions);
      console.log(`📧 Email sent successfully via fallback to ${to}: ${info.messageId}`);
      return info;
    } catch (fallbackError) {
      console.error('Fallback email sending failed:', fallbackError.message);
      throw fallbackError;
    }
  }
};

module.exports = sendEmail;

