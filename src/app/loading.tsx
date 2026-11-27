import BrandLogo from '@/components/BrandLogo';

export default function Loading() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 bg-white px-4 pt-24">
      <BrandLogo variant="mark" size="lg" alt="Zivo AI" className="animate-pulse" />
      <p className="font-heading text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
        Loading Zivo AI...
      </p>
    </div>
  );
}
