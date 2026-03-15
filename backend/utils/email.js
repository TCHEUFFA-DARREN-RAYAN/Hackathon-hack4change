/**
 * Email notifications via nodemailer.
 * Donation confirmation and thank-you emails.
 * Non-blocking: failures never break the donation flow.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const nodemailer = require('nodemailer');
const logger = require('./logger');

const SMTP_ENABLED = process.env.SMTP_ENABLED === 'true' || process.env.SMTP_ENABLED === '1';
const SMTP_USE_ETHEREAL = process.env.SMTP_USE_ETHEREAL === 'true' || process.env.SMTP_USE_ETHEREAL === '1';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.mailtrap.io';
const SMTP_PORT = parseInt(process.env.SMTP_PORT) || 2525;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || 'CommonGround <noreply@commonground.ca>';

let etherealTransporter = null;

async function getTransport() {
    if (SMTP_USE_ETHEREAL) {
        if (!etherealTransporter) {
            const testAccount = await nodemailer.createTestAccount();
            etherealTransporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: { user: testAccount.user, pass: testAccount.pass },
                tls: { rejectUnauthorized: false }
            });
            logger.info('Ethereal test account created — view emails at https://ethereal.email', {
                user: testAccount.user,
                pass: testAccount.pass
            });
        }
        return etherealTransporter;
    }
    if (!SMTP_ENABLED || !SMTP_USER || !SMTP_PASS) return null;
    return nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS }
    });
}

/**
 * Send an email. Never throws — logs errors only.
 */
async function sendEmail(to, subject, html) {
    const transport = await getTransport();
    if (!transport) return;
    try {
        const info = await transport.sendMail({
            from: SMTP_FROM,
            to,
            subject,
            html
        });
        const previewUrl = SMTP_USE_ETHEREAL ? nodemailer.getTestMessageUrl(info) : null;
        logger.info('Email sent', { to, subject: subject.substring(0, 50), previewUrl: previewUrl || undefined });
    } catch (err) {
        logger.error('Email send failed', { to, error: err.message });
    }
}

/**
 * Send donor confirmation when donation is matched.
 */
async function sendDonationConfirmation(donation) {
    if (!donation || !donation.donor_email) return;
    const name = donation.donor_name || 'Donor';
    const item = donation.item_name || 'items';
    const qty = donation.quantity || 1;
    const unit = donation.unit || 'items';
    const orgName = donation.matched_org_name || 'the organization';
    const ref = donation.id || '';
    const orgEmail = donation.matched_org_email || '';
    const orgAddress = donation.matched_org_address || '';

    const subject = 'Your donation has been received — CommonGround';
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Donation Confirmation</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #4F46E5;">Thank you, ${escapeHtml(name)}</h2>
  <p>Your donation has been received and matched to an organization in need.</p>
  <p><strong>Donation details:</strong></p>
  <ul>
    <li>Item: ${escapeHtml(item)} — ${qty} ${escapeHtml(unit)}</li>
    <li>Matched to: <strong>${escapeHtml(orgName)}</strong></li>
    ${ref ? `<li>Reference: <code>${escapeHtml(ref)}</code></li>` : ''}
  </ul>
  <p>The organization will contact you at the email or phone number you provided to arrange pickup or drop-off.</p>
  ${orgEmail || orgAddress ? `<p><strong>Organization contact:</strong><br>${orgEmail ? escapeHtml(orgEmail) : ''}${orgAddress ? (orgEmail ? '<br>' : '') + escapeHtml(orgAddress) : ''}</p>` : ''}
  <p style="margin-top: 24px; color: #64748b; font-size: 0.9rem;">— CommonGround · Smarter Giving. Stronger Community.</p>
</body>
</html>`;

    await sendEmail(donation.donor_email, subject, html);
}

/**
 * Send thank-you when donation is marked as resolved (confirmed receipt).
 */
async function sendDonationThankYou(donation) {
    if (!donation || !donation.donor_email) return;
    const name = donation.donor_name || 'Donor';
    const item = donation.item_name || 'items';
    const orgName = donation.matched_org_name || 'the organization';

    const subject = 'Thank you — your donation has been received';
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Thank You</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #059669;">Thank you, ${escapeHtml(name)}</h2>
  <p><strong>${escapeHtml(orgName)}</strong> has confirmed receipt of your donation of <strong>${escapeHtml(item)}</strong>.</p>
  <p>Your generosity helps support our community. Thank you for making a difference.</p>
  <p style="margin-top: 24px; color: #64748b; font-size: 0.9rem;">— CommonGround · Smarter Giving. Stronger Community.</p>
</body>
</html>`;

    await sendEmail(donation.donor_email, subject, html);
}

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

module.exports = {
    sendEmail,
    sendDonationConfirmation,
    sendDonationThankYou
};
