export const ALLOWED_SETTING_KEYS = [
  'businessName',
  'logoUrl',
  'faviconUrl',
  'themeColor',
  'fontFamily',
  'phoneNumber',
  'whatsappNumber',
  'supportEmail',
  'footerDescription',
  'footerCopyright',
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
  'showGithub',
  'showLinkedin',
  'showInstagram',
  'showYoutube',
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
  footerDescription: string;
  footerCopyright: string;
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
  showGithub?: boolean;
  showLinkedin?: boolean;
  showInstagram?: boolean;
  showYoutube?: boolean;
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
    footerDescription:
      settingsObj.footerDescription ||
      'Modern project discovery and digital delivery platform. Verified production AI, full-stack architectures, computer vision pipelines, and custom software systems with instant automated delivery.',
    footerCopyright:
      settingsObj.footerCopyright || 'Engineering the future with modern AI, cloud architectures, and developer-first digital assets.',
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
    showGithub: settingsObj.showGithub === 'true',
    showLinkedin: settingsObj.showLinkedin === 'true',
    showInstagram: settingsObj.showInstagram !== 'false',
    showYoutube: settingsObj.showYoutube === 'true',
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

const URL_SETTING_KEYS = new Set([
  'githubUrl',
  'linkedinUrl',
  'instagramUrl',
  'youtubeUrl',
]);

// Email validation is handled inline in validateSettingPayload (supportEmail key)
const PHONE_SETTING_KEYS = new Set(['phoneNumber', 'whatsappNumber']);
const BOOLEAN_SETTING_KEYS = new Set([
  'heroBannerActive',
  'showFeaturedSection',
  'showHowItWorksSection',
  'showTestimonialsSection',
  'showFaqSection',
  'showStatsSection',
  'showGithub',
  'showLinkedin',
  'showInstagram',
  'showYoutube',
]);

export function isSafeHttpUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

const SETTING_MAX_LENGTHS: Record<string, number> = {
  logoUrl: 2048,
  faviconUrl: 2048,
  announcementNotice: 500,
  heroHeading: 200,
  heroSubheading: 1000,
  heroBadgeText: 200,
  heroPrimaryButtonText: 100,
  heroSecondaryButtonText: 100,
  address: 500,
  footerDescription: 1000,
  footerCopyright: 500,
  faqItems: 20000,
  refundPolicy: 10000,
  deliveryPolicy: 10000,
  termsConditions: 10000,
  privacyPolicy: 10000,
};

export function validateSettingPayload(payload: unknown): Record<string, string> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Invalid settings payload');
  }

  const validated: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!(ALLOWED_SETTING_KEYS as readonly string[]).includes(key)) {
      throw new Error(`Unsupported setting: ${key}`);
    }
    if (value === undefined || value === null) continue;

    if (BOOLEAN_SETTING_KEYS.has(key)) {
      if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
        throw new Error(`Invalid value for ${key}`);
      }
      validated[key] = String(value);
      continue;
    }

    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new Error(`Invalid value for ${key}`);
    }
    const sanitizedValue = String(value).trim();
    const maxLength = SETTING_MAX_LENGTHS[key] || 300;
    if (sanitizedValue.length > maxLength) {
      throw new Error(`${key} exceeds the maximum allowed length`);
    }
    if (key === 'supportEmail') {
      if (!sanitizedValue || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedValue)) {
        throw new Error('Invalid support email');
      }
    } else if (sanitizedValue !== '') {
      if (PHONE_SETTING_KEYS.has(key) && !/^\+?[\d\s().-]{7,25}$/.test(sanitizedValue)) {
        throw new Error(`Invalid ${key}`);
      }
      if (URL_SETTING_KEYS.has(key)) {
        let parsed: URL;
        try {
          parsed = new URL(sanitizedValue);
        } catch {
          throw new Error(`Invalid URL for ${key}`);
        }
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
          throw new Error(`Invalid URL protocol for ${key}`);
        }
      }
      if ((key === 'logoUrl' || key === 'faviconUrl') && !sanitizedValue.startsWith('/') && !/^https?:\/\//i.test(sanitizedValue)) {
        throw new Error(`Invalid asset URL for ${key}`);
      }
    }
    validated[key] = sanitizedValue;
  }
  return validated;
}
