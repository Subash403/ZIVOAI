-- Additive migration: Security, Payment Stock Reservation, Audit Logs, Refunds & Tracking OTPs
-- Safe for zero-downtime deployment on Neon PostgreSQL (strictly additive, no destructive drops).

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Enquiry" ADD COLUMN IF NOT EXISTS "assignedTo" TEXT;
ALTER TABLE "Enquiry" ADD COLUMN IF NOT EXISTS "nextFollowUpAt" TIMESTAMP(3);
ALTER TABLE "Enquiry" ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Enquiry" ADD COLUMN IF NOT EXISTS "tags" TEXT;

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "reconciliationStatus" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "receiptTokenVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "NotificationLog" ADD COLUMN IF NOT EXISTS "providerMessageId" TEXT;
ALTER TABLE "NotificationLog" ADD COLUMN IF NOT EXISTS "rejectedRecipients" TEXT;

CREATE TABLE IF NOT EXISTS "StockReservation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StockReservation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StockReservation_orderId_key" ON "StockReservation"("orderId");
CREATE INDEX IF NOT EXISTS "StockReservation_projectId_status_expiresAt_idx" ON "StockReservation"("projectId", "status", "expiresAt");

CREATE TABLE IF NOT EXISTS "DownloadLog" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "reason" TEXT,
    "status" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DownloadLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DownloadLog_orderId_createdAt_idx" ON "DownloadLog"("orderId", "createdAt");

CREATE TABLE IF NOT EXISTS "Refund" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "razorpayRefundId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "reason" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "restoreStock" BOOLEAN NOT NULL DEFAULT false,
    "revokeAccess" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Refund_razorpayRefundId_key" ON "Refund"("razorpayRefundId");
CREATE INDEX IF NOT EXISTS "Refund_orderId_idx" ON "Refund"("orderId");
CREATE INDEX IF NOT EXISTS "Refund_status_idx" ON "Refund"("status");

CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "reason" TEXT,
    "metadata" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdminAuditLog_action_createdAt_idx" ON "AdminAuditLog"("action", "createdAt");
CREATE INDEX IF NOT EXISTS "AdminAuditLog_resourceType_resourceId_idx" ON "AdminAuditLog"("resourceType", "resourceId");

CREATE TABLE IF NOT EXISTS "OrderTrackingOtp" (
    "id" TEXT NOT NULL,
    "lookupId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderTrackingOtp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OrderTrackingOtp_lookupId_email_createdAt_idx" ON "OrderTrackingOtp"("lookupId", "email", "createdAt");

CREATE INDEX IF NOT EXISTS "Project_published_available_featured_idx" ON "Project"("published", "available", "featured");
CREATE INDEX IF NOT EXISTS "Project_category_idx" ON "Project"("category");
CREATE INDEX IF NOT EXISTS "Enquiry_userId_idx" ON "Enquiry"("userId");
CREATE INDEX IF NOT EXISTS "Enquiry_email_idx" ON "Enquiry"("email");
CREATE INDEX IF NOT EXISTS "Enquiry_status_archived_idx" ON "Enquiry"("status", "archived");
CREATE INDEX IF NOT EXISTS "Order_userId_idx" ON "Order"("userId");
CREATE INDEX IF NOT EXISTS "Order_email_idx" ON "Order"("email");
CREATE INDEX IF NOT EXISTS "Order_razorpayOrderId_idx" ON "Order"("razorpayOrderId");
CREATE INDEX IF NOT EXISTS "Order_paymentStatus_idx" ON "Order"("paymentStatus");
CREATE INDEX IF NOT EXISTS "NotificationLog_orderId_idx" ON "NotificationLog"("orderId");
CREATE INDEX IF NOT EXISTS "NotificationLog_status_idx" ON "NotificationLog"("status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StockReservation_orderId_fkey') THEN
    ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("orderId") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StockReservation_projectId_fkey') THEN
    ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DownloadLog_orderId_fkey') THEN
    ALTER TABLE "DownloadLog" ADD CONSTRAINT "DownloadLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("orderId") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Refund_orderId_fkey') THEN
    ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("orderId") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
