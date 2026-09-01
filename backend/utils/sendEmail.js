/**
 * @file utils/sendEmail.js
 * @description Sends emails using Gmail SMTP through Nodemailer.
 */


const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, html }) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),  
            secure: false,   // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        await transporter.sendMail({
            from: process.env.MAIL_FROM || process.env.SMTP_USER,
            to,
            subject,
            html,
        });

        console.log(`📧 Email sent successfully to ${to}`);
    } catch (error) {
        console.error('Email sending failed:', error.message);
        throw error;
    }
};

module.exports = sendEmail;

