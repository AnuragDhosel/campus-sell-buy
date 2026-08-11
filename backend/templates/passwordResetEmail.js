/**
 * @file templates/passwordResetEmail.js
 * @description HTML email template for Campus Marketplace password-reset emails.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * Responsibility of this file:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   ONLY generate and return the HTML string for the password-reset email.
 *
 *   This file does NOT:
 *     - Access MongoDB or any database.
 *     - Generate or hash reset tokens.
 *     - Send emails (that is sendEmail.js's job).
 *     - Contain SMTP configuration or credentials.
 *     - Contain any authentication logic.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * How this fits into the overall flow:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   authController.js          (business logic)
 *       ↓
 *   generates rawResetToken
 *       ↓
 *   hashes it → stores hash in DB
 *       ↓
 *   builds resetUrl
 *       ↓
 *   calls passwordResetEmail({ userName, resetUrl })  ← YOU ARE HERE
 *       ↓
 *   gets back HTML string
 *       ↓
 *   calls sendEmail({ to, subject, html })
 *       ↓
 *   sendEmail.js → Nodemailer → SMTP → Gmail → User's inbox
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * Why use inline CSS in emails?
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   Most email clients (Gmail, Outlook, Apple Mail) do NOT support:
 *     - External CSS files   (linked stylesheets are ignored)
 *     - <style> blocks       (often stripped by email clients)
 *     - CSS custom properties (CSS variables like --color-primary)
 *     - Flexbox / Grid       (inconsistent or unsupported)
 *
 *   Email HTML must use:
 *     - Inline style="" attributes on every element.
 *     - Table-based layouts for maximum compatibility.
 *     - Web-safe fonts or a short list of common fonts.
 *     - Specific pixel values rather than relative units.
 *
 *   That is why all styles in this template are inline.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * Design:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   Colors used (matching the Campus Marketplace design system):
 *     Deep Forest Green  → #2F6B4F  (brand primary, button, accent)
 *     Sage Green         → #84A98C  (secondary accent)
 *     Terracotta         → #D97757  (warning, expiration notice)
 *     Dark Slate         → #1E293B  (headings, primary text)
 *     Slate              → #64748B  (secondary text)
 *     Muted              → #94A3B8  (footer, notices)
 *     Light Background   → #F8FAFC  (outer email background)
 *     White              → #FFFFFF  (card background)
 *     Warm Orange Light  → #FFF7ED  (expiration warning box background)
 *     Warm Orange Border → #FFEDD5  (expiration warning box border)
 */

/**
 * Generates the HTML content for the password-reset email.
 *
 * @param {Object} options           - Template data.
 * @param {string} options.userName  - The display name of the user (e.g., "Anurag").
 * @param {string} options.resetUrl  - The full password-reset URL the user should click.
 *                                     e.g., http://localhost:5173/reset-password/abc123...
 *
 * @returns {string} Complete HTML string ready to be passed to sendEmail().
 *
 * @example
 *   const html = passwordResetEmail({
 *     userName: 'Anurag',
 *     resetUrl: 'http://localhost:5173/reset-password/abc123xyz456...'
 *   });
 *
 *   await sendEmail({
 *     to: user.email,
 *     subject: 'Campus Marketplace Password Reset',
 *     html,
 *   });
 */
const passwordResetEmail = ({ userName, resetUrl }) => {
  // ── Dynamic Values ─────────────────────────────────────────────────────────
  // currentYear is computed at call time so the footer always shows the
  // correct year without needing to update this file annually.
  const currentYear = new Date().getFullYear();

  // ── HTML Template ──────────────────────────────────────────────────────────
  // Uses a template literal so we can interpolate userName, resetUrl,
  // and currentYear directly into the HTML string.
  //
  // Structure:
  //   Outer container   → light gray background, max-width 600px
  //   Inner card        → white background, rounded corners, subtle shadow
  //   ├── Header        → green icon + "Campus Marketplace" title
  //   ├── Greeting      → "Hello <userName>,"
  //   ├── Body copy     → explanation of what the email is for
  //   ├── Reset button  → green CTA button linking to resetUrl
  //   ├── Fallback link → plain-text URL in case button doesn't render
  //   ├── Expiry notice → orange warning box: "expires in 30 minutes"
  //   └── Security note → "if you didn't request this, ignore this email"
  //   Footer            → copyright line with current year
  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F8FAFC; padding: 40px 20px;">
      <div style="background-color: #FFFFFF; border-radius: 16px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">

        <!-- ── Logo / Header ─────────────────────────────────────────── -->
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background-color: #2F6B4F; border-radius: 12px; padding: 12px; margin-bottom: 16px;">
            <span style="color: #FFFFFF; font-size: 24px;">🛒</span>
          </div>
          <h1 style="color: #1E293B; font-size: 24px; font-weight: 700; margin: 0;">
            Campus Marketplace
          </h1>
        </div>

        <!-- ── Greeting ──────────────────────────────────────────────── -->
        <!-- userName is provided by authController.js (user.name from MongoDB) -->
        <p style="color: #1E293B; font-size: 16px; margin-bottom: 8px;">
          Hello <strong>${userName}</strong>,
        </p>

        <!-- ── Body Copy ─────────────────────────────────────────────── -->
        <p style="color: #64748B; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
          We received a request to reset the password for your Campus Marketplace account.
          Click the button below to create a new password.
        </p>

        <!-- ── Reset Button ──────────────────────────────────────────── -->
        <!-- resetUrl is built in authController.js:
             \${process.env.FRONTEND_URL}/reset-password/\${rawResetToken}
             The href contains the RAW token — the one the user received.    -->
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${resetUrl}"
             style="display: inline-block; background-color: #2F6B4F; color: #FFFFFF; text-decoration: none;
                    font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(47, 107, 79, 0.3);">
            Reset Password
          </a>
        </div>

        <!-- ── Fallback Link ─────────────────────────────────────────── -->
        <!-- Some email clients block or hide buttons. The raw URL here    -->
        <!-- gives the user an alternative way to reach the reset page.   -->
        <p style="color: #64748B; font-size: 12px; line-height: 1.6; margin-bottom: 24px; word-break: break-all;">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${resetUrl}" style="color: #2F6B4F;">${resetUrl}</a>
        </p>

        <!-- ── Expiration Warning ────────────────────────────────────── -->
        <!-- Token expiry (30 min) is set in authController.js:           -->
        <!-- user.resetPasswordExpire = Date.now() + 30 * 60 * 1000;      -->
        <div style="background-color: #FFF7ED; border: 1px solid #FFEDD5; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px;">
          <p style="color: #D97757; font-size: 13px; margin: 0;">
            ⏰ This link will expire in <strong>30 minutes</strong>.
          </p>
        </div>

        <!-- ── Security Notice ───────────────────────────────────────── -->
        <p style="color: #94A3B8; font-size: 12px; line-height: 1.6; margin: 0;">
          If you did not request this password reset, you can safely ignore this email.
          Your password will remain unchanged.
        </p>

      </div>

      <!-- ── Footer ───────────────────────────────────────────────────── -->
      <!-- currentYear is computed at call time in this template function. -->
      <p style="text-align: center; color: #94A3B8; font-size: 11px; margin-top: 24px;">
        &copy; ${currentYear} Campus Marketplace. All rights reserved.
      </p>
    </div>
  `;
};

module.exports = passwordResetEmail;
