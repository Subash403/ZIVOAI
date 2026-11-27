import { prisma } from './prisma';
import nodemailer from 'nodemailer';
import { BRAND_ASSETS } from './brand';

function getEmailBrandLogoUrl(): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://zivo.ai').replace(/\/$/, '');
  return `${base}${BRAND_ASSETS.horizontalDark}`;
}

function renderBrandedEmailShell(subtitle: string, bodyHtml: string): string {
  const logoSrc = getEmailBrandLogoUrl();
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
    </head>
    <body style="margin:0; padding:24px; background-color:#F9FAFB; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#0A0A0A;">
      <div style="max-width:600px; margin:0 auto; background:#FFFFFF; border-radius:14px; border:1px solid #E5E7EB; overflow:hidden;">
        <div style="background:#0A0A0A; padding:24px; text-align:center; color:#FFFFFF;">
          <img src="${logoSrc}" alt="Zivo AI" style="height:36px; width:auto; display:inline-block; object-fit:contain;" />
          <p style="margin:8px 0 0 0; color:#9CA3AF; font-size:12px; letter-spacing:0.04em;">${escapeHtml(subtitle)}</p>
        </div>
        <div style="height:3px; background:linear-gradient(90deg,#0089CF 0%,#0089CF 25%,#ED1C24 25%,#ED1C24 50%,#FDB913 50%,#FDB913 75%,#008C44 75%,#008C44 100%);"></div>
        <div style="padding:28px 24px;">
          ${bodyHtml}
        </div>
        <div style="padding:18px 24px; text-align:center; font-size:12px; color:#6B7280; border-top:1px solid #F3F4F6; background:#F9FAFB;">
          <p style="margin:0;">Technical Support: support@zivo.ai &bull; Zivo AI Technology Marketplace</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

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

  const html = renderBrandedEmailShell(
    'Verified Payment & Secure Digital Access',
    `
      <h2 style="font-size:18px; margin-top:0; color:#0A0A0A;">Payment Confirmed</h2>
      <p style="font-size:14px; line-height:1.6; color:#4B5563;">
        Hi <strong>${safeName}</strong>, your Razorpay payment has been verified on our server.
        ${
          params.downloadUrl
            ? 'Your project archive is ready for secure download via the link below (no ZIP file is attached to this email).'
            : 'Your order is confirmed and our engineering team has been alerted to finalize your deliverable package.'
        }
      </p>

      <div style="background:#F9FAFB; border:1px solid #E5E7EB; border-radius:10px; padding:16px; margin:18px 0; font-size:13px;">
        <div style="padding:4px 0;"><strong>Order ID:</strong> ${safeOrderId}</div>
        <div style="padding:4px 0;"><strong>Project:</strong> ${safeProject}</div>
        <div style="padding:4px 0;"><strong>Amount Paid:</strong> INR ${params.amount.toLocaleString('en-IN')}</div>
        <div style="padding:4px 0;"><strong>Order Status:</strong> <span style="color:#008C44; font-weight:700;">${assetStatusLabel}</span></div>
      </div>

      ${
        params.downloadUrl
          ? `<div style="text-align:center; margin:24px 0;">
              <a href="${params.downloadUrl}" style="display:inline-block; background:#ED1C24; color:#FFFFFF; text-decoration:none; padding:13px 26px; border-radius:8px; font-weight:700; font-size:14px;">Access Secure Download Link</a>
            </div>
            <div style="background:#F0F9FF; border:1px solid #BAE6FD; border-radius:10px; padding:12px 14px; font-size:12px; color:#0A0A0A; margin-top:16px; line-height:1.5;">
              <strong>Download Policy:</strong> This email provides a secure download link (not an email attachment).
              The email link remains valid for <strong>7 days</strong>. Each time you click download, a short-lived
              <strong>1-hour</strong> private cloud storage URL is generated for your browser. If a link expires,
              sign in anytime to your <a href="${dashboardUrl}" style="color:#0089CF; font-weight:600;">Customer Dashboard</a>
              to generate a fresh download link within your download allowance.
            </div>`
          : `<div style="text-align:center; margin:24px 0;">
              <a href="${dashboardUrl}" style="display:inline-block; background:#ED1C24; color:#FFFFFF; text-decoration:none; padding:13px 26px; border-radius:8px; font-weight:700; font-size:14px;">Open Customer Dashboard</a>
            </div>`
      }

      <p style="font-size:13px; color:#4B5563; margin-top:20px;">
        Manage your purchases and downloads anytime in your Customer Dashboard:<br />
        <a href="${dashboardUrl}" style="color:#0089CF; font-weight:600;">${dashboardUrl}</a>
      </p>
    `
  );

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

  const html = renderBrandedEmailShell(
    'Custom Engineering & Scoping Desk',
    `
      <h2 style="color:#0A0A0A; margin-top:0; font-size:18px;">Custom Project Request Received</h2>
      <p style="font-size:14px; color:#4B5563;">Hi <strong>${safeName}</strong>,</p>
      <p style="font-size:14px; color:#4B5563;">We have received your custom project enquiry <strong>#${safeLeadId}</strong> (${safeProject}).</p>
      <div style="background:#F9FAFB; border:1px solid #E5E7EB; padding:14px 16px; border-radius:10px; margin:16px 0; font-size:13px; color:#374151; line-height:1.6;">
        <strong>What happens next:</strong><br/>
        Our engineering team reviews custom enquiries within <strong>1 business day</strong> and will reach out via phone/WhatsApp (${escapeHtml(params.phone)}) or email. You can view your 8-stage project milestone timeline anytime in your Zivo AI Customer Dashboard.
      </div>
    `
  );

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

  const html = renderBrandedEmailShell(
    '8-Stage Milestone Progress Update',
    `
      <h2 style="color:#0A0A0A; margin-top:0; font-size:18px;">Milestone Progress Update</h2>
      <p style="font-size:14px; color:#4B5563;">Hi <strong>${safeName}</strong>,</p>
      <p style="font-size:14px; color:#4B5563;">Your custom project <strong>#${safeLeadId}</strong> has moved to stage: <strong style="color:#0089CF;">${safeStage}</strong>.</p>
      <div style="background:#F9FAFB; border:1px solid #E5E7EB; padding:15px; border-radius:10px; margin:16px 0;">
        <p style="margin:0; font-size:14px; color:#0A0A0A;">${safeMessage}</p>
      </div>
      ${safeEta ? `<p style="font-size:13px; color:#374151;"><strong>Estimated Completion Date:</strong> ${safeEta}</p>` : ''}
      <p style="font-size:13px; color:#4B5563;">Sign in to your Customer Dashboard anytime to view your full 8-stage milestone timeline.</p>
    `
  );

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
  const html = renderBrandedEmailShell(
    'One-Time Order Verification Code',
    `
      <h2 style="color:#0A0A0A; margin-top:0; font-size:18px;">Verify Your Email to Access Order Details</h2>
      <p style="font-size:14px; color:#4B5563;">Use this one-time verification code to access reference <strong>#${escapeHtml(params.lookupId)}</strong>:</p>
      <div style="font-size:28px; font-weight:800; letter-spacing:6px; background:#F0F9FF; color:#0073B0; border:1px solid #BAE6FD; padding:16px; border-radius:10px; text-align:center; margin:18px 0;">
        ${escapeHtml(params.otp)}
      </div>
      <p style="font-size:13px; color:#4B5563;">This code expires in ${ttl} minutes and can be used once. If you did not request this, you can safely ignore this email.</p>
    `
  );
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
