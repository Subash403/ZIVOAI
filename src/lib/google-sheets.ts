import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';

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

export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match?.[1]) {
    return match[1];
  }
  return trimmed;
}

export function formatPrivateKey(rawKey: string): string {
  let key = rawKey.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
}

export async function resolveGoogleSheetsConfig(): Promise<{
  spreadsheetId: string | null;
  clientEmail: string | null;
  privateKey: string | null;
}> {
  let spreadsheetId = process.env.GOOGLE_SHEET_ID ? extractSpreadsheetId(process.env.GOOGLE_SHEET_ID) : null;
  let clientEmail = process.env.GOOGLE_CLIENT_EMAIL?.trim() || null;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY ? formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY) : null;

  // Support full JSON service account credentials
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      const parsed = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      if (!clientEmail && parsed.client_email) clientEmail = parsed.client_email;
      if (!privateKey && parsed.private_key) privateKey = formatPrivateKey(parsed.private_key);
      if (!spreadsheetId && parsed.sheet_id) spreadsheetId = extractSpreadsheetId(parsed.sheet_id);
    } catch {
      console.warn('Could not parse GOOGLE_SERVICE_ACCOUNT_KEY JSON.');
    }
  }

  // Fallback to database setting for spreadsheetId if not in .env
  if (!spreadsheetId) {
    try {
      const setting = await prisma.setting.findUnique({ where: { key: 'googleSheetId' } });
      if (setting?.value?.trim()) {
        spreadsheetId = extractSpreadsheetId(setting.value);
      }
    } catch (err) {
      console.warn('Error reading googleSheetId setting from database:', err);
    }
  }

  return { spreadsheetId, clientEmail, privateKey };
}

export async function syncEnquiryToGoogleSheets(
  data: EnquirySheetData
): Promise<{ success: boolean; error?: string }> {
  const { spreadsheetId, clientEmail, privateKey } = await resolveGoogleSheetsConfig();

  if (!spreadsheetId) {
    return {
      success: false,
      error: 'Google Sheet ID is not configured. Please set GOOGLE_SHEET_ID in .env or under Admin Settings > Integrations.',
    };
  }

  if (!clientEmail || !privateKey) {
    return {
      success: false,
      error: 'Google Service Account credentials missing. Please set GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY in .env.',
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

    // Dynamically resolve target sheet tab title
    let targetRange = 'Sheet1!A:S';
    try {
      const metadata = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties.title',
      });
      const firstSheetTitle = metadata.data.sheets?.[0]?.properties?.title;
      if (firstSheetTitle) {
        const safeTitle =
          firstSheetTitle.includes(' ') || firstSheetTitle.includes("'")
            ? `'${firstSheetTitle.replace(/'/g, "\\'")}'`
            : firstSheetTitle;
        targetRange = `${safeTitle}!A:S`;
      }
    } catch {
      // Fall back to Sheet1!A:S if metadata lookup fails
    }

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
      range: targetRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    });

    return { success: true };
  } catch (error: unknown) {
    let errorMsg =
      error instanceof Error ? error.message : 'Failed to communicate with Google Sheets API';

    if (errorMsg.includes('The caller does not have permission') || errorMsg.includes('403')) {
      errorMsg = `Permission denied: Please share your Google Sheet with service account "${clientEmail}" and grant "Editor" access.`;
    } else if (
      errorMsg.includes('Requested entity was not found') ||
      errorMsg.includes('404') ||
      errorMsg.includes('not found')
    ) {
      errorMsg = `Spreadsheet not found: Check that Google Sheet ID "${spreadsheetId}" exists and is accessible.`;
    }

    console.error('Google Sheets sync error:', errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

export async function testGoogleSheetsConnection(): Promise<{
  success: boolean;
  message: string;
  details?: {
    spreadsheetId?: string | null;
    clientEmail?: string | null;
    sheetTitle?: string;
  };
}> {
  const { spreadsheetId, clientEmail, privateKey } = await resolveGoogleSheetsConfig();

  if (!spreadsheetId) {
    return {
      success: false,
      message: 'Google Sheet ID is missing. Please configure it in .env or Admin Settings > Integrations.',
    };
  }

  if (!clientEmail || !privateKey) {
    return {
      success: false,
      message: 'Service Account credentials are missing. Set GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY in .env.',
      details: { spreadsheetId, clientEmail },
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
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'properties.title,sheets.properties.title',
    });

    const docTitle = metadata.data.properties?.title || 'Google Sheet';
    const firstSheet = metadata.data.sheets?.[0]?.properties?.title || 'Sheet1';

    return {
      success: true,
      message: `Connected successfully to "${docTitle}" (Tab: ${firstSheet})`,
      details: {
        spreadsheetId,
        clientEmail,
        sheetTitle: docTitle,
      },
    };
  } catch (err: unknown) {
    let errorMsg = err instanceof Error ? err.message : 'Connection test failed';
    if (errorMsg.includes('The caller does not have permission') || errorMsg.includes('403')) {
      errorMsg = `Permission denied: Share your Google Sheet with "${clientEmail}" as "Editor".`;
    } else if (errorMsg.includes('Requested entity was not found') || errorMsg.includes('404')) {
      errorMsg = `Spreadsheet not found for ID "${spreadsheetId}".`;
    }
    return {
      success: false,
      message: errorMsg,
      details: { spreadsheetId, clientEmail },
    };
  }
}
