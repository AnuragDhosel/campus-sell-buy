/**
 * @file templates/otpEmail.js
 * @description HTML email template for OTP-based password reset.
 *
 * @param {Object} options
 * @param {string} options.userName - The user's display name.
 * @param {string} options.otp      - The 6-digit OTP to embed in the email.
 * @returns {string} HTML string ready to be passed to sendEmail().
 */
const otpEmail = ({ userName, otp, timeStr }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Reset OTP</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #E2E8F0;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background-color:#2F6B4F;padding:32px 40px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:12px;padding:12px 20px;">
                <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.5px;">🎓 Campus Marketplace</span>
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 8px;color:#1E293B;font-size:22px;font-weight:700;">Password Reset OTP</h2>
              <p style="margin:0 0 24px;color:#64748B;font-size:14px;line-height:1.6;">
                Hi <strong style="color:#1E293B;">${userName}</strong>,<br/>
                We received a request to reset your password. Use the OTP below to verify your identity.
              </p>

              <!-- OTP Box -->
              <div style="background:#F0FDF4;border:2px solid #2F6B4F;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
                <p style="margin:0 0 8px;color:#64748B;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Your One-Time Password</p>
                <div style="font-size:40px;font-weight:800;letter-spacing:10px;color:#2F6B4F;font-family:'Courier New',monospace;">${otp}</div>
                <p style="margin:12px 0 0;color:#64748B;font-size:12px;">Requested at <strong>${timeStr || 'just now'}</strong> (Valid for 10 minutes)</p>
              </div>

              <!-- Warning -->
              <div style="background:#FFF7ED;border-left:4px solid #D97757;border-radius:0 8px 8px 0;padding:14px 16px;margin:0 0 24px;">
                <p style="margin:0;color:#92400E;font-size:13px;line-height:1.5;">
                  <strong>⚠ Do not share this OTP</strong> with anyone. Campus Marketplace staff will never ask for your OTP.
                  If you did not request a password reset, you can safely ignore this email.
                </p>
              </div>

              <p style="margin:0;color:#94A3B8;font-size:12px;line-height:1.6;">
                This OTP will expire automatically after 10 minutes and can only be used once.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#94A3B8;font-size:12px;">
                © ${new Date().getFullYear()} Campus Marketplace. This is an automated message — please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

module.exports = otpEmail;
