require('dotenv').config();
const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
    if (transporter) return transporter;

    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    // Strip spaces if user copied "abcd efgh ijkl mnop"
    const pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : null;

    if (user && pass) {
        if (host.includes('gmail') || user.endsWith('@gmail.com')) {
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: user,
                    pass: pass
                }
            });
            console.log(`📧 Gmail SMTP Transporter initialized for ${user}`);
        } else {
            transporter = nodemailer.createTransport({
                host: host,
                port: port,
                secure: port === 465,
                auth: {
                    user: user,
                    pass: pass
                }
            });
            console.log(`📧 SMTP Transporter initialized: ${host}:${port} (${user})`);
        }
    } else {
        console.log('⚠️ SMTP credentials not fully configured in .env.');
    }

    return transporter;
}

/**
 * Send 6-digit OTP email for registration
 * @param {string} toEmail 
 * @param {string} otp 
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendOtpEmail(toEmail, otp) {
    const mailTransporter = getTransporter();
    const user = process.env.SMTP_USER;
    const fromAddress = user 
        ? `"Gram Panchayat Samasya Nivaran" <${user}>`
        : (process.env.EMAIL_FROM || '"Gram Panchayat Samasya Nivaran" <no-reply@grampanchayat.gov.in>');

    if (!mailTransporter) {
        const errMsg = 'Email server not configured. Please set SMTP_USER and SMTP_PASS in .env';
        console.error(`❌ ${errMsg}`);
        return { success: false, error: errMsg };
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f7fc; margin: 0; padding: 20px; }
            .email-card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border: 1px solid #e1e8f0; }
            .header { background: linear-gradient(135deg, #1a4480, #0f274a); color: #ffffff; padding: 24px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 20px; letter-spacing: 0.5px; }
            .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; color: #fed7aa; }
            .content { padding: 28px 24px; color: #333333; line-height: 1.6; }
            .otp-box { background: #f0f6ff; border: 2px dashed #1a4480; border-radius: 8px; text-align: center; padding: 18px; margin: 20px 0; }
            .otp-code { font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #1a4480; margin: 0; }
            .warning { font-size: 13px; color: #777777; margin-top: 20px; border-top: 1px solid #eeeeee; padding-top: 14px; }
            .footer { background: #f8fafc; padding: 14px; text-align: center; font-size: 12px; color: #888888; }
        </style>
    </head>
    <body>
        <div class="email-card">
            <div class="header">
                <h1>🏛️ ग्रामपंचायत समस्या निवारण</h1>
                <p>Government of Maharashtra • Citizen Grievance Redressal</p>
            </div>
            <div class="content">
                <p>Namaskar / Hello,</p>
                <p>Your One-Time Password (OTP) for account registration is:</p>
                
                <div class="otp-box">
                    <p class="otp-code">${otp}</p>
                </div>

                <p>हा OTP पुढील <strong>10 मिनिटांसाठी</strong> वैध आहे. कृपया हा कोणाशीही शेअर करू नका.</p>
                <p>This OTP is valid for <strong>10 minutes</strong>. Please do not share this code with anyone.</p>

                <div class="warning">
                    <p>If you did not request this registration, please ignore this email.</p>
                </div>
            </div>
            <div class="footer">
                &copy; Government of Maharashtra | Gram Panchayat Samasya Nivaran
            </div>
        </div>
    </body>
    </html>
    `;

    const textContent = `🏛️ Gram Panchayat Samasya Nivaran\n\nYour Registration OTP is: ${otp}\n\nThis OTP is valid for 10 minutes. Do not share it with anyone.`;

    try {
        const info = await mailTransporter.sendMail({
            from: fromAddress,
            to: toEmail,
            subject: `[Gram Panchayat] Your Registration OTP is: ${otp}`,
            text: textContent,
            html: htmlContent
        });

        console.log(`✅ OTP email successfully delivered to ${toEmail} (Message ID: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error(`❌ Failed to send email to ${toEmail}:`, err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Send Grievance Resolution Email to Citizen
 * @param {Object} details
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendResolutionEmail({
    toEmail,
    citizenName = 'Citizen',
    complaintId = '',
    comment = '',
    location = '',
    village = '',
    taluka = '',
    district = '',
    resolutionNote = '',
    completedPhotoDataUrl = '',
    officerName = 'Gram Panchayat Officer'
}) {
    const mailTransporter = getTransporter();
    const user = process.env.SMTP_USER;
    const fromAddress = user 
        ? `"Gram Panchayat Samasya Nivaran" <${user}>`
        : (process.env.EMAIL_FROM || '"Gram Panchayat Samasya Nivaran" <no-reply@grampanchayat.mah.gov.in>');

    if (!mailTransporter) {
        const errMsg = 'Email server not configured. Please set SMTP_USER and SMTP_PASS in .env';
        console.error(`❌ ${errMsg}`);
        return { success: false, error: errMsg };
    }

    const shortId = complaintId ? (complaintId.length > 8 ? complaintId.slice(-8).toUpperCase() : complaintId) : 'N/A';
    const resolvedDate = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
            .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
            .header { background: linear-gradient(135deg, #0f274a 0%, #1a4480 100%); color: #ffffff; padding: 28px 24px; text-align: center; border-bottom: 4px solid #059669; }
            .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.3px; }
            .header p { margin: 6px 0 0; font-size: 13px; color: #a7f3d0; font-weight: 600; }
            .status-banner { background: #ecfdf5; border-left: 4px solid #059669; padding: 14px 18px; margin: 20px 24px 10px; border-radius: 6px; }
            .status-title { font-size: 15px; font-weight: 700; color: #065f46; margin: 0; }
            .status-desc { font-size: 13px; color: #047857; margin: 4px 0 0; }
            .content { padding: 14px 24px 24px; }
            .info-table { width: 100%; border-collapse: collapse; margin: 16px 0; background: #f8fafc; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
            .info-table td { padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
            .info-label { font-weight: 700; color: #475569; width: 35%; }
            .info-val { color: #0f172a; font-weight: 600; }
            .resolution-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px 16px; margin: 16px 0; }
            .resolution-title { font-size: 13px; font-weight: 700; color: #1e40af; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px; }
            .resolution-text { font-size: 14px; color: #1e293b; margin: 0; line-height: 1.5; }
            .footer { background: #f8fafc; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
            .button { display: inline-block; background: #1a4480; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 13px; margin-top: 14px; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="header">
                <h1>🏛️ महाराष्ट्र शासन</h1>
                <p>Gram Panchayat Samasya Nivaran • Grievance Redressal</p>
            </div>
            
            <div class="status-banner">
                <p class="status-title">✅ Grievance Resolved / तक्रार निवारण पूर्ण झाले</p>
                <p class="status-desc">Your registered complaint has been investigated and marked as RESOLVED by the local authority.</p>
            </div>

            <div class="content">
                <p>Namaskar <strong>${citizenName}</strong>,</p>
                <p style="font-size:14px; color:#334155;">
                    This is an official confirmation from the <strong>Gram Panchayat Administration</strong> that the village issue reported by you has been successfully addressed and resolved.
                </p>

                <table class="info-table">
                    <tr>
                        <td class="info-label">Grievance Ref No:</td>
                        <td class="info-val">#${shortId}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Gram Panchayat:</td>
                        <td class="info-val">${village || 'Local Village'}, ${taluka}, ${district}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Problem Reported:</td>
                        <td class="info-val">${comment || 'Village issue'}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Location / Landmark:</td>
                        <td class="info-val">${location || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Resolved On:</td>
                        <td class="info-val">${resolvedDate}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Officer In-charge:</td>
                        <td class="info-val">${officerName}</td>
                    </tr>
                </table>

                ${resolutionNote ? `
                <div class="resolution-box">
                    <p class="resolution-title">Action Taken / केलेली कार्यवाही:</p>
                    <p class="resolution-text">${resolutionNote}</p>
                </div>
                ` : ''}

                <div style="text-align:center; margin-top:20px;">
                    <a href="http://localhost:3000/mycomplaints.html" class="button">
                        View Grievance Status on Portal →
                    </a>
                </div>
            </div>

            <div class="footer">
                <p style="margin:0 0 6px;">📞 Toll-Free Helpline: 1800-120-8040 | ✉️ support@grampanchayat.mah.gov.in</p>
                <p style="margin:0;">&copy; Government of Maharashtra. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const textContent = `🏛️ Government of Maharashtra - Gram Panchayat Samasya Nivaran\n\n` +
        `GRIEVANCE RESOLVED / तक्रार निवारण पूर्ण झाले\n\n` +
        `Dear ${citizenName},\n` +
        `Your grievance (Ref: #${shortId}) at ${village}, ${taluka}, ${district} has been marked as RESOLVED.\n\n` +
        `Problem: ${comment}\n` +
        `Location: ${location}\n` +
        (resolutionNote ? `Action Taken: ${resolutionNote}\n` : '') +
        `Resolved Date: ${resolvedDate}\n\n` +
        `You can review your complaint status at http://localhost:3000/mycomplaints.html\n\n` +
        `Toll-Free Helpline: 1800-120-8040`;

    try {
        const info = await mailTransporter.sendMail({
            from: fromAddress,
            to: toEmail,
            subject: `[Gram Panchayat] Grievance Resolved: #${shortId} (${village || taluka})`,
            text: textContent,
            html: htmlContent
        });

        console.log(`✅ Resolution email successfully delivered to ${toEmail} (Message ID: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error(`❌ Failed to send resolution email to ${toEmail}:`, err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Send 6-digit OTP email for password reset
 * @param {string} toEmail 
 * @param {string} otp 
 * @param {string} name 
 * @param {string} role 
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendPasswordResetOtpEmail(toEmail, otp, name = 'Citizen / Officer', role = 'citizen') {
    const mailTransporter = getTransporter();
    const user = process.env.SMTP_USER;
    const fromAddress = user 
        ? `"Gram Panchayat Security" <${user}>`
        : (process.env.EMAIL_FROM || '"Gram Panchayat Security" <no-reply@grampanchayat.gov.in>');

    if (!mailTransporter) {
        const errMsg = 'Email server not configured. Please set SMTP_USER and SMTP_PASS in .env';
        console.error(`❌ ${errMsg}`);
        return { success: false, error: errMsg };
    }

    const roleBadge = role === 'operator' ? 'Government Official Account' : 'Citizen Account';
    const roleBadgeMr = role === 'operator' ? 'शासकीय अधिकारी खाते' : 'नागरिक खाते';

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f7fc; margin: 0; padding: 20px; }
            .email-card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border: 1px solid #e1e8f0; }
            .header { background: linear-gradient(135deg, #1e3a8a, #0f172a); color: #ffffff; padding: 24px 20px; text-align: center; border-bottom: 3px solid #f59e0b; }
            .header h1 { margin: 0; font-size: 20px; letter-spacing: 0.5px; }
            .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; color: #fed7aa; }
            .role-badge { display: inline-block; background: rgba(245, 158, 11, 0.2); border: 1px solid #f59e0b; color: #fef3c7; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; margin-top: 8px; }
            .content { padding: 28px 24px; color: #333333; line-height: 1.6; }
            .greeting { font-size: 15px; font-weight: 600; color: #1e293b; margin-top: 0; }
            .otp-box { background: #fefce8; border: 2px dashed #d97706; border-radius: 8px; text-align: center; padding: 18px; margin: 20px 0; }
            .otp-label { font-size: 12px; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
            .otp-code { font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #b45309; margin: 0; font-family: monospace; }
            .warning-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 14px; margin: 20px 0; border-radius: 4px; font-size: 13px; color: #991b1b; }
            .warning-box p { margin: 0; }
            .footer { background: #f8fafc; padding: 14px; text-align: center; font-size: 12px; color: #888888; border-top: 1px solid #e2e8f0; }
        </style>
    </head>
    <body>
        <div class="email-card">
            <div class="header">
                <h1>🏛️ ग्रामपंचायत समस्या निवारण</h1>
                <p>Government of Maharashtra • Password Reset Request</p>
                <div class="role-badge">${roleBadge} / ${roleBadgeMr}</div>
            </div>
            <div class="content">
                <p class="greeting">Namaskar ${name ? `<strong>${name}</strong>` : ''},</p>
                <p>We received a request to reset the password for your portal account. Use the One-Time Password (OTP) below to proceed with resetting your password:</p>
                
                <div class="otp-box">
                    <div class="otp-label">Password Reset Code / पासवर्ड रीसेट कोड</div>
                    <p class="otp-code">${otp}</p>
                </div>

                <p>हा OTP पुढील <strong>10 मिनिटांसाठी</strong> वैध आहे. सुरक्षिततेसाठी हा कोणाशीही शेअर करू नका.</p>
                <p>This code is valid for <strong>10 minutes</strong>. For your security, do NOT share this OTP with anyone.</p>

                <div class="warning-box">
                    <p><strong>⚠️ Security Alert:</strong> If you did NOT request a password reset, your account may be secure, but you should check your login credentials immediately.</p>
                </div>
            </div>
            <div class="footer">
                &copy; Government of Maharashtra | Gram Panchayat Samasya Nivaran Portal
            </div>
        </div>
    </body>
    </html>
    `;

    const textContent = `🏛️ Gram Panchayat Samasya Nivaran - Password Reset\n\n` +
        `Hello ${name},\n\n` +
        `Your Password Reset OTP is: ${otp}\n\n` +
        `Account Type: ${roleBadge}\n` +
        `This OTP is valid for 10 minutes. Do NOT share it with anyone.\n\n` +
        `If you did not request this, please ignore this email.`;

    try {
        const info = await mailTransporter.sendMail({
            from: fromAddress,
            to: toEmail,
            subject: `[Security OTP] ${otp} is your Password Reset Code - Gram Panchayat Portal`,
            text: textContent,
            html: htmlContent
        });

        console.log(`✅ Password reset OTP email successfully delivered to ${toEmail} (Message ID: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error(`❌ Failed to send password reset email to ${toEmail}:`, err.message);
        return { success: false, error: err.message };
    }
}

module.exports = {
    sendOtpEmail,
    sendResolutionEmail,
    sendPasswordResetOtpEmail
};

