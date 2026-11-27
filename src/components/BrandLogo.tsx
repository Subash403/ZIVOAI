'use client';

import React from 'react';
import { BRAND_ASSETS, BRAND_NAME, resolveBrandLogoUrl } from '@/lib/brand';

export interface BrandLogoProps {
  variant?: 'horizontal' | 'mark';
  tone?: 'light' | 'dark';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  src?: string | null;
  alt?: string;
  className?: string;
}

const HORIZONTAL_HEIGHT: Record<NonNullable<BrandLogoProps['size']>, string> = {
  xs: 'h-7',
  sm: 'h-8 sm:h-9',
  md: 'h-9 sm:h-10',
  lg: 'h-11 sm:h-12',
  xl: 'h-12 sm:h-14',
};

const MARK_SIZE: Record<NonNullable<BrandLogoProps['size']>, string> = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-14 w-14',
};

/**
 * Centralized Zivo AI brand mark and horizontal lockup component.
 * Preserves aspect ratio across light and dark surfaces without stretching.
 */
export default function BrandLogo({
  variant = 'horizontal',
  tone = 'light',
  size = 'md',
  src,
  alt = BRAND_NAME,
  className = '',
}: BrandLogoProps) {
  const resolvedSrc =
    variant === 'mark'
      ? BRAND_ASSETS.mark
      : resolveBrandLogoUrl(src, tone);

  const sizeClass = variant === 'mark' ? MARK_SIZE[size] : `${HORIZONTAL_HEIGHT[size]} w-auto`;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolvedSrc}
      alt={alt}
      decoding="async"
      className={`${sizeClass} object-contain select-none shrink-0 ${className}`.trim()}
    />
  );
}
