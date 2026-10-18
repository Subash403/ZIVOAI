export interface EnquiryInput {
  studentName?: string;
  college?: string;
  department?: string;
  year?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  projectId?: string;
  projectName?: string;
  domain?: string;
  technology?: string;
  projectType?: string;
  deadline?: string;
  requirements?: string;
  callbackTime?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitized?: {
    studentName: string;
    college: string;
    department: string;
    phone: string;
    whatsapp: string;
    email: string;
    requirements: string;
  };
}

export function validateEnquiryInput(data: EnquiryInput): ValidationResult {
  const trimmedName = (data.studentName || '').trim();
  const trimmedCollege = (data.college || '').trim();
  const trimmedDept = (data.department || '').trim();
  const trimmedPhone = (data.phone || '').trim().replace(/[\s\-\(\)]/g, '');
  const trimmedEmail = (data.email || '').trim().toLowerCase();
  const trimmedRequirements = (data.requirements || '').trim();

  if (!trimmedName || !trimmedPhone || !trimmedEmail || !trimmedRequirements) {
    return {
      isValid: false,
      error: 'Please fill in all required fields (Name, Phone, Email, Requirements)',
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail) || trimmedEmail.length > 120) {
    return {
      isValid: false,
      error: 'Please enter a valid email address.',
    };
  }

  if (trimmedPhone.replace(/\D/g, '').length < 10) {
    return {
      isValid: false,
      error: 'Please enter a valid 10-digit phone number.',
    };
  }

  return {
    isValid: true,
    sanitized: {
      studentName: trimmedName,
      college: trimmedCollege || 'Individual/Self',
      department: trimmedDept || 'General',
      phone: trimmedPhone,
      whatsapp: data.whatsapp ? String(data.whatsapp).trim() : trimmedPhone,
      email: trimmedEmail,
      requirements: trimmedRequirements,
    },
  };
}
