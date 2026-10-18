import { google } from 'googleapis';

export interface EnquirySheetData {
  submissionDate: string;
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
  status: string;
  adminNotes?: string | null;
}

export async function syncEnquiryToGoogleSheets(data: EnquirySheetData): Promise<{ success: boolean; error?: string }> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!spreadsheetId || !clientEmail || !privateKey) {
    console.log('ℹ️ Google Sheets credentials not fully configured in environment variables.');
    return {
      success: false,
      error: 'Google Sheets credentials or Spreadsheet ID not configured in .env',
    };
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const row = [
      data.submissionDate,
      data.leadId,
      data.studentName,
      data.college || 'Individual/General',
      data.department || 'General',
      data.year || 'N/A',
      data.phone,
      data.whatsapp || 'N/A',
      data.email,
      data.projectId || 'N/A',
      data.projectName || 'Custom Project',
      data.domain || 'N/A',
      data.technology || 'N/A',
      data.projectType || 'N/A',
      data.deadline || 'N/A',
      data.requirements,
      data.callbackTime || 'Anytime',
      data.status,
      data.adminNotes || '',
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A:S',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    });

    return { success: true };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to communicate with Google Sheets API';
    console.error('Error appending to Google Sheet:', error);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

