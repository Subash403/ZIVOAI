'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface CheckoutCustomerData {
  studentName: string;
  email: string;
  phone: string;
  college?: string;
  department?: string;
  year?: string;
}

export interface UseRazorpayCheckoutOptions {
  onSuccess?: (orderId: string, receiptToken: string) => void;
  onCancel?: () => void;
  onError?: (errorMessage: string) => void;
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

export function validateCheckoutForm(data: CheckoutCustomerData): { [key: string]: string } {
  const errors: { [key: string]: string } = {};

  if (!data.studentName.trim()) {
    errors.studentName = 'Please enter your full name.';
  }

  const emailTrimmed = data.email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailTrimmed || !emailRegex.test(emailTrimmed) || emailTrimmed.length > 120) {
    errors.email = 'Please enter a valid email address.';
  }

  const phoneTrimmed = data.phone.trim().replace(/[\s\-\(\)]/g, '');
  const digitsOnly = phoneTrimmed.replace(/\D/g, '');
  if (!phoneTrimmed || digitsOnly.length < 10 || digitsOnly.length > 15) {
    errors.phone = 'Please enter a valid 10-digit WhatsApp number.';
  }

  return errors;
}

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function useRazorpayCheckout(options?: UseRazorpayCheckoutOptions) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const startCheckout = useCallback(
    async (projectId: string, customerData: CheckoutCustomerData) => {
      setErrorMsg(null);

      const fieldErrors = validateCheckoutForm(customerData);
      if (Object.keys(fieldErrors).length > 0) {
        return { isValid: false, errors: fieldErrors };
      }

      setLoading(true);

      try {
        // 1. Initialize server-side verified order
        const createRes = await fetch('/api/payments/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            studentName: customerData.studentName.trim(),
            email: customerData.email.trim(),
            phone: customerData.phone.trim(),
            college: customerData.college?.trim() || undefined,
            department: customerData.department?.trim() || undefined,
            year: customerData.year?.trim() || undefined,
          }),
        });

        const orderData = await createRes.json();
        if (!createRes.ok) {
          throw new Error(orderData.error || 'Failed to initialize payment');
        }

        // 2. Ensure Razorpay SDK is loaded
        const loaded = await loadRazorpayScript();
        if (!loaded || !window.Razorpay) {
          throw new Error('Razorpay payment gateway failed to load. Please check your internet connection.');
        }

        // 3. Configure and trigger Razorpay modal
        const rzpOptions = {
          key: orderData.keyId,
          amount: Math.round(orderData.amount * 100),
          currency: orderData.currency || 'INR',
          name: 'Zivo AI',
          description: `Purchase: ${orderData.projectName}`,
          order_id: orderData.razorpayOrderId,
          prefill: {
            name: customerData.studentName,
            email: customerData.email,
            contact: customerData.phone,
          },
          theme: {
            color: '#4f46e5',
          },
          handler: async function (response: RazorpayResponse) {
            setLoading(true);
            try {
              // 4. Verify Payment Server-side
              const verifyRes = await fetch('/api/payments/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  internalOrderId: orderData.internalOrderId,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                }),
              });

              const verifyData = await verifyRes.json();
              if (!verifyRes.ok) {
                throw new Error(verifyData.error || 'Payment signature verification failed.');
              }

              const receiptToken = verifyData.receiptToken || '';
              if (options?.onSuccess) {
                options.onSuccess(orderData.internalOrderId, receiptToken);
              }

              // Navigate with secure receipt token
              const targetUrl = receiptToken
                ? `/orders/confirmation/${orderData.internalOrderId}?token=${encodeURIComponent(receiptToken)}`
                : `/orders/confirmation/${orderData.internalOrderId}`;
              router.push(targetUrl);
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Payment verification failed.';
              setErrorMsg(msg);
              if (options?.onError) options.onError(msg);
              setLoading(false);
            }
          },
          modal: {
            ondismiss: function () {
              setLoading(false);
              if (options?.onCancel) options.onCancel();
            },
          },
        };

        const rzp = new window.Razorpay(rzpOptions);
        rzp.open();
        return { isValid: true, errors: {} };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Could not complete checkout initialization.';
        setErrorMsg(msg);
        if (options?.onError) options.onError(msg);
        setLoading(false);
        return { isValid: false, errors: { general: msg } };
      }
    },
    [options, router]
  );

  return {
    startCheckout,
    loading,
    errorMsg,
    setErrorMsg,
  };
}
