export const ALLOWED_SETTING_KEYS = [
  'businessName',
  'logoUrl',
  'faviconUrl',
  'themeColor',
  'fontFamily',
  'phoneNumber',
  'whatsappNumber',
  'supportEmail',
  'announcementNotice',

  // Hero Section
  'heroHeading',
  'heroSubheading',
  'heroBadgeText',
  'heroPrimaryButtonText',
  'heroSecondaryButtonText',
  'heroBannerActive',

  // Section Visibilities
  'showFeaturedSection',
  'showHowItWorksSection',
  'showTestimonialsSection',
  'showFaqSection',
  'showStatsSection',

  // Social & Address
  'githubUrl',
  'linkedinUrl',
  'instagramUrl',
  'youtubeUrl',
  'address',

  // Policies
  'refundPolicy',
  'deliveryPolicy',
  'termsConditions',
  'privacyPolicy',

  // FAQs JSON
  'faqItems',

  // Integrations (Admin-only)
  'razorpayKeyId',
  'googleSheetId',
] as const;

export interface PublicSettings {
  businessName: string;
  logoUrl: string;
  faviconUrl?: string;
  themeColor?: string;
  fontFamily?: string;
  phoneNumber: string;
  whatsappNumber: string;
  supportEmail: string;
  announcementNotice: string;

  heroHeading?: string;
  heroSubheading?: string;
  heroBadgeText?: string;
  heroPrimaryButtonText?: string;
  heroSecondaryButtonText?: string;
  heroBannerActive?: boolean;

  showFeaturedSection?: boolean;
  showHowItWorksSection?: boolean;
  showTestimonialsSection?: boolean;
  showFaqSection?: boolean;
  showStatsSection?: boolean;

  githubUrl?: string;
  linkedinUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  address?: string;

  refundPolicy?: string;
  deliveryPolicy?: string;
  termsConditions?: string;
  privacyPolicy?: string;

  faqItems?: string;
}

export interface AdminSettings extends PublicSettings {
  razorpayKeyId?: string;
  googleSheetId?: string;
}

export function filterPublicSettings(settingsObj: Record<string, string>): PublicSettings {
  const configuredLogoUrl = settingsObj.logoUrl;
  const configuredFaviconUrl = settingsObj.faviconUrl;

  return {
    businessName: settingsObj.businessName || 'Zivo AI',
    logoUrl:
      configuredLogoUrl && configuredLogoUrl !== '/logo.svg'
        ? configuredLogoUrl
        : '/images/zivoai-logo.png',
    faviconUrl:
      configuredFaviconUrl && configuredFaviconUrl !== '/favicon.ico'
        ? configuredFaviconUrl
        : '/images/zivoai-logo.png',
    themeColor: settingsObj.themeColor || '#4f46e5',
    fontFamily: settingsObj.fontFamily || 'Inter',
    phoneNumber: settingsObj.phoneNumber || '+91 8220303164',
    whatsappNumber: settingsObj.whatsappNumber || '918220303164',
    supportEmail: settingsObj.supportEmail || 'support@zivo.ai',
    announcementNotice:
      settingsObj.announcementNotice ||
      '🔥 Production-Ready AI & Full-Stack Architectures with Instant Automated Delivery',

    heroHeading:
      settingsObj.heroHeading || 'Production-Ready AI & Full-Stack Projects with Instant Delivery',
    heroSubheading:
      settingsObj.heroSubheading ||
      'Discover, benchmark, and deploy verified AI agents, machine learning pipelines, full-stack web applications, and software architectures with complete source code & live documentation.',
    heroBadgeText: settingsObj.heroBadgeText || '⚡ Modern AI & Software Engineering Platform',
    heroPrimaryButtonText: settingsObj.heroPrimaryButtonText || 'Explore Project Catalog',
    heroSecondaryButtonText: settingsObj.heroSecondaryButtonText || 'Request Custom Architecture',
    heroBannerActive: settingsObj.heroBannerActive !== 'false',

    showFeaturedSection: settingsObj.showFeaturedSection !== 'false',
    showHowItWorksSection: settingsObj.showHowItWorksSection !== 'false',
    showTestimonialsSection: settingsObj.showTestimonialsSection !== 'false',
    showFaqSection: settingsObj.showFaqSection !== 'false',
    showStatsSection: settingsObj.showStatsSection !== 'false',

    githubUrl: settingsObj.githubUrl || 'https://github.com',
    linkedinUrl: settingsObj.linkedinUrl || 'https://linkedin.com',
    instagramUrl: settingsObj.instagramUrl || 'https://instagram.com',
    youtubeUrl: settingsObj.youtubeUrl || 'https://youtube.com',
    address: settingsObj.address || 'Chennai / Bangalore, India',

    refundPolicy:
      settingsObj.refundPolicy ||
      'We provide replacement or full refund if source code execution fails our verified specifications and cannot be resolved by our technical setup engineers within 48 hours.',
    deliveryPolicy:
      settingsObj.deliveryPolicy ||
      'Automated digital delivery for fixed-price packages occurs immediately following payment confirmation. Custom projects follow agreed milestone reviews.',
    termsConditions:
      settingsObj.termsConditions ||
      'Projects are provided with complete source code, architecture documentation, and setup guides for software engineers, founders, researchers, and technical builders.',
    privacyPolicy:
      settingsObj.privacyPolicy ||
      'We respect your privacy. Contact details and account information are strictly used for project support, licensing, and digital delivery.',

    faqItems: settingsObj.faqItems || '',
  };
}
