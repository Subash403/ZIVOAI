export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';
export type ProjectType = 'Major' | 'Minor' | 'Mini' | 'Research';
export type SalesType = 'fixed' | 'call';

export interface Project {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  category: string;
  technologies: string[]; // parsed from JSON
  difficulty: Difficulty | string;
  projectType: ProjectType | string;
  problemStatement?: string | null;
  proposedSolution?: string | null;
  features?: string[] | null; // parsed from JSON
  modules?: string[] | null; // parsed from JSON
  expectedOutput?: string | null;
  requirements?: string | null;
  workflow?: string | null;
  mainImage: string;
  gallery?: string[] | null; // parsed from JSON
  architectureImage?: string | null;
  demoVideo?: string | null;
  includedMaterials?: string[] | null; // parsed from JSON
  available: boolean;
  featured: boolean;
  salesType: SalesType;
  price: number;
  createdAt: string;
  updatedAt: string;
}

export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'DISCUSSING'
  | 'FOLLOW_UP'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'NOT_INTERESTED';

export type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED';

export interface Enquiry {
  id: string;
  leadId: string;
  studentName: string;
  college: string;
  department: string;
  year?: string | null;
  phone: string;
  whatsapp?: string | null;
  email: string;
  projectId?: string | null;
  projectName?: string | null;
  domain?: string | null;
  technology?: string | null;
  projectType?: string | null;
  deadline?: string | null;
  requirements: string;
  callbackTime?: string | null;
  status: LeadStatus;
  adminNotes?: string | null;
  googleSheetSyncStatus: SyncStatus;
  googleSheetSyncError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus = 'CREATED' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED';

export interface Order {
  id: string;
  orderId: string;
  studentName: string;
  email: string;
  phone: string;
  projectId: string;
  projectName: string;
  amount: number;
  currency: string;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  razorpaySignature?: string | null;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SiteSettings {
  businessName: string;
  logoUrl: string;
  phoneNumber: string;
  whatsappNumber: string;
  supportEmail: string;
  razorpayKeyId: string;
  googleSheetId: string;
  announcementNotice: string;
}
