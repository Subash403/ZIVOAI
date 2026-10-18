'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { LoginFormContent } from '../login/page';

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      }
    >
      <LoginFormContent defaultMode="register" />
    </Suspense>
  );
}
