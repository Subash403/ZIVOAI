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
  prerequisites?: string | null;
  setupInstructions?: string | null;
  documentation?: string | null;
  mainImage: string;
  gallery?: string[] | null; // parsed from JSON
  architectureImage?: string | null;
  demoVideo?: string | null;
  includedMaterials?: string[] | null; // parsed from JSON
  available: boolean;
  published: boolean;
  featured: boolean;
  salesType: SalesType;
  price: number;
  stockLimit?: number | null;
  downloadFileName?: string | null;
  downloadFileUrl?: string | null;
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

export type CustomProjectStage =
  | 'Request Received'
  | 'Planning'
  | 'Requirement Analysis'
  | 'Building'
  | 'Testing'
  | 'Final Review'
  | 'Ready for Delivery'
  | 'Delivered'
  | 'On Hold'
  | 'Cancelled';

export const CUSTOM_PROJECT_STAGES: CustomProjectStage[] = [
  'Request Received',
  'Planning',
  'Requirement Analysis',
  'Building',
  'Testing',
  'Final Review',
  'Ready for Delivery',
  'Delivered',
];

export interface CustomProjectTimelineItem {
  id: string;
  enquiryId: string;
  stage: CustomProjectStage | string;
  statusMessage?: string | null;
  adminNote?: string | null;
  estimatedDate?: string | null;
  createdAt: string;
}

export interface Enquiry {
  id: string;
  leadId: string;
  studentName: string;
  college?: string | null;
  department?: string | null;
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
  currentStage?: CustomProjectStage | string;
  customerProgressMessage?: string | null;
  estimatedCompletionDate?: string | null;
  adminNotes?: string | null;
  googleSheetSyncStatus: SyncStatus;
  googleSheetSyncError?: string | null;
  userId?: string | null;
  timeline?: CustomProjectTimelineItem[];
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus = 'CREATED' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
export type DeliveryStatus = 'PENDING' | 'PROCESSING' | 'DELIVERED' | 'FAILED';

export interface Order {
  id: string;
  orderId: string;
  studentName: string;
  email: string;
  phone: string;
  college?: string | null;
  department?: string | null;
  year?: string | null;
  projectId: string;
  projectName: string;
  amount: number;
  currency: string;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  razorpaySignature?: string | null;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  paidAt?: string | null;
  deliveredAt?: string | null;
  adminNotes?: string | null;
  userId?: string | null;
  downloadToken?: string | null;
  downloadTokenExpiry?: string | null;
  downloadCount?: number;
  downloadLimit?: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CUSTOMER';
  avatarUrl?: string | null;
  phone?: string | null;
  college?: string | null;
  department?: string | null;
  year?: string | null;
  createdAt: string;
}

export interface SiteSettings {
  businessName: string;
  logoUrl: string;
  faviconUrl?: string;
  themeColor?: string;
  fontFamily?: string;
  phoneNumber: string;
  whatsappNumber: string;
  supportEmail: string;
  announcementNotice: string;
  razorpayKeyId?: string;
  googleSheetId?: string;

  // Hero Section
  heroHeading?: string;
  heroSubheading?: string;
  heroBadgeText?: string;
  heroPrimaryButtonText?: string;
  heroSecondaryButtonText?: string;
  heroBannerActive?: boolean;

  // Section Visibilities
  showFeaturedSection?: boolean;
  showHowItWorksSection?: boolean;
  showTestimonialsSection?: boolean;
  showFaqSection?: boolean;
  showStatsSection?: boolean;

  // Social & Footer
  githubUrl?: string;
  linkedinUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  address?: string;

  // Policies
  refundPolicy?: string;
  deliveryPolicy?: string;
  termsConditions?: string;
  privacyPolicy?: string;
}
