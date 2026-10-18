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

export async function sendOrderConfirmationNotification(params: SendOrderEmailParams): Promise<boolean> {
  const subject = `Order Confirmed: ${params.projectName} (#${params.orderId}) - Zivo AI`;
  const fromAddress = process.env.SMTP_FROM || 'Zivo AI Automated Delivery <delivery@zivo.ai>';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 20px; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: #4f46e5; padding: 32px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        .content { padding: 32px 24px; }
        .btn { display: inline-block; background: #4f46e5; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 14px; margin-top: 16px; text-align: center; }
        .meta-box { background: #f1f5f9; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px; }
        .meta-row { display: flex; justify-content: space-between; padding: 4px 0; }
        .footer { padding: 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>ZIVO AI</h1>
          <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">Instant Digital Delivery</p>
        </div>
        <div class="content">
          <h2 style="font-size: 18px; margin-top: 0; color: #0f172a;">Order Confirmation & Download</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #475569;">
            Hi <strong>${params.studentName}</strong>, thank you for your order! Your payment has been securely verified and your project deliverables are ready.
          </p>

          <div class="meta-box">
            <div class="meta-row"><strong>Order ID:</strong> <span>${params.orderId}</span></div>
            <div class="meta-row"><strong>Project:</strong> <span>${params.projectName}</span></div>
            <div class="meta-row"><strong>Amount Paid:</strong> <span>₹${params.amount.toLocaleString('en-IN')}</span></div>
            <div class="meta-row"><strong>Status:</strong> <span style="color: #16a34a; font-weight: bold;">Verified & Delivered</span></div>
          </div>

          ${
            params.downloadUrl
              ? `<div style="text-align: center; margin: 28px 0;">
                  <a href="${params.downloadUrl}" class="btn">⬇️ Download Project Source Code</a>
                  <p style="font-size: 11px; color: #64748b; margin-top: 8px;">Download link is cryptographically protected and valid for 7 days.</p>
                </div>`
              : ''
          }

          <p style="font-size: 13px; color: #475569;">
            You can also view your verified order confirmation, tax invoice, and license credentials anytime at:
            <br />
            <a href="${params.receiptUrl}" style="color: #4f46e5; font-weight: 600;">${params.receiptUrl}</a>
          </p>
        </div>
        <div class="footer">
          <p style="margin: 0;">24/7 Technical Support: +91 8220303164 | support@zivo.ai</p>
          <p style="margin: 4px 0 0 0;">Zivo AI — Production AI & Software Engineering Platform</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const transporter = getMailTransporter();

    if (transporter) {
      await transporter.sendMail({
        from: fromAddress,
        to: params.email,
        subject,
        html: htmlContent,
      });
      console.log(`[Notification] Live email successfully dispatched to ${params.email} for order ${params.orderId}`);
    } else {
      console.log(`[Notification Dev-Mode] SMTP unconfigured. Order email logged for ${params.email} (Order: ${params.orderId})`);
    }

    // Record notification in database
    await prisma.notificationLog.create({
      data: {
        recipientEmail: params.email,
        subject,
        type: 'ORDER_CONFIRMATION',
        status: 'SENT',
        orderId: params.orderId,
      },
    });

    // Mark notificationSent on order
    await prisma.order.update({
      where: { orderId: params.orderId },
      data: { notificationSent: true },
    });

    return true;
  } catch (error: unknown) {
    console.error('Failed to dispatch order notification:', error);
    try {
      await prisma.notificationLog.create({
        data: {
          recipientEmail: params.email,
          subject,
          type: 'ORDER_CONFIRMATION',
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown notification error',
          orderId: params.orderId,
        },
      });
    } catch {
      // Ignore secondary db log error
    }
    return false;
  }
}

export async function sendLeadConfirmationNotification(params: SendLeadEmailParams): Promise<boolean> {
  const subject = `Project Requirement Received (#${params.leadId}) - Zivo AI`;
  try {
    console.log(`[Notification] Custom Project requirement registered for ${params.studentName} (${params.email})`);

    await prisma.notificationLog.create({
      data: {
        recipientEmail: params.email,
        subject,
        type: 'LEAD_RECEIVED',
        status: 'SENT',
      },
    });

    return true;
  } catch (error: unknown) {
    console.error('Failed to log lead notification:', error);
    return false;
  }
}

export async function sendCustomProjectProgressNotification(params: SendProgressNotificationParams): Promise<boolean> {
  const subject = `Progress Update: ${params.stage} for Project Ref #${params.leadId} - Zivo AI`;
  const fromAddress = process.env.SMTP_FROM || 'Zivo AI Custom Projects <support@zivo.ai>';

  try {
    const transporter = getMailTransporter();

    if (transporter) {
      await transporter.sendMail({
        from: fromAddress,
        to: params.email,
        subject,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
            <h2>Zivo AI — Milestone Progress Update</h2>
            <p>Hi ${params.studentName},</p>
            <p>Your custom project <strong>#${params.leadId}</strong> has progressed to stage: <strong>${params.stage}</strong>.</p>
            <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p style="margin: 0; font-size: 14px;">${params.customerMessage}</p>
            </div>
            ${params.estimatedCompletionDate ? `<p><strong>Estimated Completion Date:</strong> ${params.estimatedCompletionDate}</p>` : ''}
            <p>Track your project anytime using reference <strong>${params.leadId}</strong> at your customer dashboard.</p>
            <p>Zivo AI Engineering Team</p>
          </div>
        `,
      });
    } else {
      console.log(`[Notification Dev-Mode] Progress email logged for ${params.studentName} (${params.email}) - Stage: ${params.stage}`);
    }

    await prisma.notificationLog.create({
      data: {
        recipientEmail: params.email,
        subject,
        type: 'STAGE_UPDATE',
        status: 'SENT',
      },
    });

    return true;
  } catch (error: unknown) {
    console.error('Failed to send custom project progress notification:', error);
    return false;
  }
}
