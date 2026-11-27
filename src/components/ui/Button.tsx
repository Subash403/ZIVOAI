'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'pill' | 'secondary' | 'outline' | 'outlineDark' | 'ghost' | 'icon';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-[#ED1C24] hover:bg-[#D1171F] active:bg-[#B9141B] text-white rounded-md font-heading font-bold uppercase tracking-[0.06em] shadow-sm hover:shadow-md hover:-translate-y-0.5',
  pill:
    'bg-[#ED1C24] hover:bg-[#D1171F] active:scale-[0.98] text-white rounded-full font-heading font-bold tracking-[0.04em] shadow-[0_8px_22px_rgba(237,28,36,0.28)] hover:shadow-[0_12px_26px_rgba(237,28,36,0.38)] hover:scale-[1.02]',
  secondary:
    'bg-[#0A0A0A] hover:bg-[#1F2937] active:bg-black text-white rounded-md font-heading font-bold uppercase tracking-[0.05em] shadow-sm hover:-translate-y-0.5',
  outline:
    'bg-white hover:bg-[#0A0A0A] text-[#0A0A0A] hover:text-white border border-[#0A0A0A] rounded-md font-heading font-bold uppercase tracking-[0.05em]',
  outlineDark:
    'bg-white/5 hover:bg-white/15 text-white border border-white/30 hover:border-white rounded-full font-heading font-bold uppercase tracking-[0.06em] backdrop-blur-xs',
  ghost:
    'bg-transparent hover:bg-[#F3F4F6] text-[#4B5563] hover:text-[#0A0A0A] rounded-lg font-medium',
  icon:
    'bg-white hover:bg-[#F9FAFB] text-[#4B5563] hover:text-[#0A0A0A] border border-[#E5E7EB] hover:border-[#D1D5DB] rounded-lg',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-xs gap-1.5',
  md: 'h-11 px-5 text-xs gap-2',
  lg: 'h-12 px-7 text-xs sm:text-sm gap-2.5',
  icon: 'h-10 w-10 p-0',
};

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra = ''): string {
  return [
    'inline-flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none select-none',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    extra,
  ]
    .filter(Boolean)
    .join(' ');
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={buttonClasses(variant, size, className)}
      {...rest}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
          <span>{loadingText || 'Processing...'}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
