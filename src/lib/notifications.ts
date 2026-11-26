import { prisma } from './prisma';
import nodemailer from 'nodemailer';

export interface SendOrderEmailParams {
  orderId: string;
  studentName: string;
  email: string;
  projectName: string;
  amount: number;
  downloadUrl?: string;
  receiptUrl: string;
  dashboardUrl?: string;
  assetAvailable?: boolean;
}

export interface SendLeadEmailParams {
  leadId: string;
  studentName: string;
  email: string;
  projectName?: string | null;
  phone: string;
}

export interface SendProgressNotificationParams {
  leadId: string;
  studentName: string;
  email: string;
  stage: string;
  customerMessage: string;
  estimatedCompletionDate?: string | null;
}

export interface SendTrackingOtpParams {
  lookupId: string;
  email: string;
  otp: string;
  expiresMinutes?: number;
}

export type EmailDispatchStatus = 'SENT' | 'SIMULATED' | 'SKIPPED' | 'FAILED';

export interface EmailDispatchResult {
  ok: boolean;
  status: EmailDispatchStatus;
  messageId?: string;
  rejectedRecipients?: string[];
  error?: string;
}

export function isSmtpConfigured(): boolean {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
  return Boolean(host && user && pass);
}

export function getConfiguredSenderAddress(): { from: string; isExplicit: boolean } {
  const configured = process.env.SMTP_FROM?.trim();
  if (configured) {
    return { from: configured, isExplicit: true };
  }
  return { from: 'Zivo AI Delivery <no-reply@zivo.ai>', isExplicit: false };
}

function getMailTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = port === 465;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  return null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function dispatchEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  type: string;
  orderId?: string;
}): Promise<EmailDispatchResult> {
  const { from, isExplicit } = getConfiguredSenderAddress();
  if (!isExplicit && process.env.NODE_ENV === 'production') {
    console.warn('[Email] SMTP_FROM is not explicitly configured; ensure sender aligns with SPF/DKIM/DMARC.');
  }

  try {
    const transporter = getMailTransporter();

    if (transporter) {
      const info = await transporter.sendMail({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });

      const rejected = Array.isArray(info.rejected)
        ? info.rejected.map((r) => String(r))
        : [];

      if (rejected.length > 0 && rejected.some((r) => r.toLowerCase() === params.to.toLowerCase())) {
        const errMessage = `SMTP server rejected recipient: ${rejected.join(', ')}`;
        await prisma.notificationLog.create({
          data: {
            recipientEmail: params.to,
            subject: params.subject,
            type: params.type,
            status: 'FAILED',
            providerMessageId: info.messageId || null,
            rejectedRecipients: JSON.stringify(rejected),
            error: errMessage,
            orderId: params.orderId ?? null,
          },
        });
        return { ok: false, status: 'FAILED', messageId: info.messageId, rejectedRecipients: rejected, error: errMessage };
      }

      await prisma.notificationLog.create({
        data: {
          recipientEmail: params.to,
          subject: params.subject,
          type: params.type,
          status: 'SENT',
          providerMessageId: info.messageId || null,
          rejectedRecipients: rejected.length > 0 ? JSON.stringify(rejected) : null,
          orderId: params.orderId ?? null,
        },
      });

      return { ok: true, status: 'SENT', messageId: info.messageId, rejectedRecipients: rejected };
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error('SMTP notification service is not configured in production.');
    }

    // Development/test simulation: NEVER mark as SENT and NEVER set Order.notificationSent = true
    console.log(`[Notification Simulated] SMTP unconfigured in ${process.env.NODE_ENV || 'dev'}. Logged ${params.type} for ${params.orderId || 'general'}.`);
    await prisma.notificationLog.create({
      data: {
        recipientEmail: params.to,
        subject: params.subject,
        type: params.type,
        status: 'SIMULATED',
        orderId: params.orderId ?? null,
      },
    });

    return { ok: true, status: 'SIMULATED' };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown notification error';
    console.error(`[Notification Failed:${params.type}]`, errorMessage);
    try {
      await prisma.notificationLog.create({
        data: {
          recipientEmail: params.to,
          subject: params.subject,
          type: params.type,
          status: 'FAILED',
          error: errorMessage.slice(0, 500),
          orderId: params.orderId ?? null,
        },
      });
    } catch {
      // Ignore secondary logging failure
    }
    return { ok: false, status: 'FAILED', error: errorMessage };
  }
}

export async function dispatchOrderConfirmationEmail(params: SendOrderEmailParams): Promise<EmailDispatchResult> {
  const safeName = escapeHtml(params.studentName);
  const safeProject = escapeHtml(params.projectName);
  const safeOrderId = escapeHtml(params.orderId);
  const dashboardUrl = params.dashboardUrl || params.receiptUrl.replace(/\/orders\/confirmation\/.*/, '/account');
  const subject = `Payment Confirmed: ${params.projectName} (#${params.orderId}) - Zivo AI`;

  const assetStatusLabel = params.downloadUrl
    ? 'Payment Confirmed — Download Available'
    : params.assetAvailable === false
    ? 'Payment Confirmed — Deliverable Preparation In Progress'
    : 'Payment Confirmed — Order Recorded';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 20px; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background: #4f46e5; padding: 28px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
        .content { padding: 28px 24px; }
        .btn { display: inline-block; background: #4f46e5; color: #ffffff !important; text-decoration: none; padding: 13px 26px; border-radius: 10px; font-weight: 700; font-size: 14px; margin-top: 12px; }
        .meta-box { background: #f1f5f9; border-radius: 12px; padding: 16px; margin: 18px 0; font-size: 13px; }
        .meta-row { padding: 4px 0; }
        .note-box { background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 10px; padding: 12px 14px; font-size: 12px; color: #312e81; margin-top: 16px; }
        .footer { padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>ZIVO AI</h1>
          <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 13px;">Verified Payment &amp; Secure Digital Access</p>
        </div>
        <div class="content">
          <h2 style="font-size: 18px; margin-top: 0; color: #0f172a;">Payment Confirmed</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #475569;">
            Hi <strong>${safeName}</strong>, your Razorpay payment has been verified on our server.
            ${
              params.downloadUrl
                ? 'Your project archive is ready for secure download via the link below (no ZIP file is attached to this email).'
                : 'Your order is confirmed and our engineering team has been alerted to finalize your deliverable package.'
            }
          </p>

          <div class="meta-box">
            <div class="meta-row"><strong>Order ID:</strong> ${safeOrderId}</div>
            <div class="meta-row"><strong>Project:</strong> ${safeProject}</div>
            <div class="meta-row"><strong>Amount Paid:</strong> INR ${params.amount.toLocaleString('en-IN')}</div>
            <div class="meta-row"><strong>Order Status:</strong> <span style="color: #16a34a; font-weight: bold;">${assetStatusLabel}</span></div>
          </div>

          ${
            params.downloadUrl
              ? `<div style="text-align: center; margin: 24px 0;">
                  <a href="${params.downloadUrl}" class="btn">Access Secure Download Link</a>
                </div>
                <div class="note-box">
                  <strong>Download Policy:</strong> This email provides a secure download link (not an email attachment).
                  The email link remains valid for <strong>7 days</strong>. Each time you click download, a short-lived
                  <strong>1-hour</strong> private cloud storage URL is generated for your browser. If a link expires,
                  sign in anytime to your <a href="${dashboardUrl}" style="color: #4f46e5; font-weight: 600;">Customer Dashboard</a>
                  to generate a fresh download link within your download allowance.
                </div>`
              : `<div style="text-align: center; margin: 24px 0;">
                  <a href="${dashboardUrl}" class="btn">Open Customer Dashboard</a>
                </div>`
          }

          <p style="font-size: 13px; color: #475569; margin-top: 20px;">
            Manage your purchases and downloads anytime in your Customer Dashboard:
            <br />
            <a href="${dashboardUrl}" style="color: #4f46e5; font-weight: 600;">${dashboardUrl}</a>
          </p>
        </div>
        <div class="footer">
          <p style="margin: 0;">Technical Support: support@zivo.ai | Zivo AI</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = [
    `Zivo AI — Payment Confirmed (#${params.orderId})`,
    `Hi ${params.studentName},`,
    `Your payment of INR ${params.amount} for "${params.projectName}" has been verified.`,
    `Status: ${assetStatusLabel}`,
    params.downloadUrl
      ? `Secure Download Link (not an attachment; valid 7 days; generates a 1-hour cloud download URL per click): ${params.downloadUrl}`
      : `Your deliverable is being prepared. You can track status in your dashboard: ${dashboardUrl}`,
    `Customer Dashboard: ${dashboardUrl}`,
  ].join('\n\n');

  const result = await dispatchEmail({
    to: params.email,
    subject,
    html,
    text,
    type: 'ORDER_CONFIRMATION',
    orderId: params.orderId,
  });

  // ZAI-024: ONLY set notificationSent = true when an email was genuinely SENT via SMTP!
  if (result.status === 'SENT') {
    await prisma.order
      .update({
        where: { orderId: params.orderId },
        data: { notificationSent: true },
      })
      .catch(() => {});
  }

  return result;
}

export async function sendOrderConfirmationNotification(params: SendOrderEmailParams): Promise<boolean> {
  const result = await dispatchOrderConfirmationEmail(params);
  return result.ok;
}

export async function sendLeadConfirmationNotification(params: SendLeadEmailParams): Promise<EmailDispatchResult> {
  const subject = `Custom Project Request Received (#${params.leadId}) - Zivo AI`;
  const safeName = escapeHtml(params.studentName);
  const safeLeadId = escapeHtml(params.leadId);
  const safeProject = escapeHtml(params.projectName || 'Custom Software Architecture');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0f172a; margin-top: 0;">Custom Project Request Received</h2>
      <p>Hi <strong>${safeName}</strong>,</p>
      <p>We have received your custom project enquiry <strong>#${safeLeadId}</strong> (${safeProject}).</p>
      <div style="background: #f1f5f9; padding: 14px 16px; border-radius: 10px; margin: 16px 0; font-size: 13px;">
        <strong>What happens next:</strong><br/>
        Our engineering team reviews custom enquiries within <strong>1 business day</strong> and will reach out via phone/WhatsApp (${escapeHtml(params.phone)}) or email. You can view your 8-stage project milestone timeline anytime in your Zivo AI Customer Dashboard.
      </div>
      <p style="font-size: 12px; color: #64748b;">Zivo AI Engineering Team</p>
    </div>
  `;

  const text = `Hi ${params.studentName}, we received your custom project request #${params.leadId} (${params.projectName || 'Custom Architecture'}). Our team reviews enquiries within 1 business day. Track progress in your Zivo AI Customer Dashboard.`;

  return dispatchEmail({
    to: params.email,
    subject,
    html,
    text,
    type: 'LEAD_RECEIVED',
  });
}

export async function sendCustomProjectProgressNotification(
  params: SendProgressNotificationParams
): Promise<EmailDispatchResult> {
  const subject = `Progress Update: ${params.stage} for Project Ref #${params.leadId} - Zivo AI`;
  const safeName = escapeHtml(params.studentName);
  const safeLeadId = escapeHtml(params.leadId);
  const safeStage = escapeHtml(params.stage);
  const safeMessage = escapeHtml(params.customerMessage);
  const safeEta = params.estimatedCompletionDate ? escapeHtml(params.estimatedCompletionDate) : null;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0f172a; margin-top: 0;">Zivo AI — Milestone Progress Update</h2>
      <p>Hi <strong>${safeName}</strong>,</p>
      <p>Your custom project <strong>#${safeLeadId}</strong> has moved to stage: <strong>${safeStage}</strong>.</p>
      <div style="background: #f1f5f9; padding: 15px; border-radius: 10px; margin: 16px 0;">
        <p style="margin: 0; font-size: 14px;">${safeMessage}</p>
      </div>
      ${safeEta ? `<p><strong>Estimated Completion Date:</strong> ${safeEta}</p>` : ''}
      <p>Sign in to your Customer Dashboard anytime to view your full 8-stage milestone timeline.</p>
      <p style="font-size: 12px; color: #64748b;">Zivo AI Engineering Team</p>
    </div>
  `;

  const text = `Hi ${params.studentName}, your custom project #${params.leadId} is now in stage "${params.stage}". Update: ${params.customerMessage}${params.estimatedCompletionDate ? ` Estimated completion: ${params.estimatedCompletionDate}.` : ''}`;

  return dispatchEmail({
    to: params.email,
    subject,
    html,
    text,
    type: 'STAGE_UPDATE',
  });
}

export async function sendTrackingOtpNotification(params: SendTrackingOtpParams): Promise<EmailDispatchResult> {
  const ttl = params.expiresMinutes ?? 10;
  const subject = `Your Zivo AI Verification Code (${params.otp}) for #${params.lookupId}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #1e293b; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #0f172a; margin-top: 0;">Verify Your Email to Access Order Details</h2>
      <p>Use this one-time verification code to access reference <strong>#${escapeHtml(params.lookupId)}</strong>:</p>
      <div style="font-size: 28px; font-weight: 800; letter-spacing: 6px; background: #eef2ff; color: #312e81; padding: 16px; border-radius: 12px; text-align: center; margin: 18px 0;">
        ${escapeHtml(params.otp)}
      </div>
      <p style="font-size: 13px; color: #475569;">This code expires in ${ttl} minutes and can be used once. If you did not request this, you can safely ignore this email.</p>
    </div>
  `;
  const text = `Your Zivo AI verification code for #${params.lookupId} is ${params.otp}. It expires in ${ttl} minutes.`;

  return dispatchEmail({
    to: params.email,
    subject,
    html,
    text,
    type: 'TRACKING_OTP',
    orderId: params.lookupId.startsWith('ORD-') ? params.lookupId : undefined,
  });
}
