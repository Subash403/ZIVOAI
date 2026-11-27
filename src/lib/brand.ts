export const BRAND_NAME = 'Zivo AI';

export const BRAND_ASSETS = {
  horizontalLight: '/brand/zivo-logo-horizontal.png',
  horizontalDark: '/brand/zivo-logo-horizontal-dark.png',
  mark: '/brand/zivo-mark.png',
  ogImage: '/brand/zivo-og.png',
} as const;

export const LEGACY_LOGO_PATHS = new Set([
  '/logo.svg',
  '/favicon.ico',
  '/images/zivoai-logo.png',
]);

/**
 * Resolves a configured logoUrl safely: legacy outdated logo paths automatically
 * upgrade to the new centralized Zivo AI horizontal brand asset.
 */
export function resolveBrandLogoUrl(
  configuredUrl?: string | null,
  tone: 'light' | 'dark' = 'light'
): string {
  const trimmed = configuredUrl?.trim();
  if (!trimmed || LEGACY_LOGO_PATHS.has(trimmed)) {
    return tone === 'dark' ? BRAND_ASSETS.horizontalDark : BRAND_ASSETS.horizontalLight;
  }
  return trimmed;
}

export function resolveBrandFaviconUrl(configuredUrl?: string | null): string {
  const trimmed = configuredUrl?.trim();
  if (!trimmed || LEGACY_LOGO_PATHS.has(trimmed)) {
    return BRAND_ASSETS.mark;
  }
  return trimmed;
}
