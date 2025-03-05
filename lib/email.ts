// lib/email.ts
import { SmtpConfig } from '@prisma/client';
import * as XLSX from 'xlsx';
import nodemailer from 'nodemailer';
// Simplified approach to suppress the punycode deprecation warning
// This avoids dealing with the complex types of process.emitWarning
if (typeof process !== 'undefined') {
  // Replace the problematic code with a simpler approach that fixes the argument count error
  const originalConsoleWarn = console.warn;
  console.warn = function(...args: unknown[]) {
    // Skip punycode deprecation warnings
    if (
      args.length > 0 && 
      typeof args[0] === 'string' && 
      args[0].includes('The `punycode` module is deprecated')
    ) {
      return;
    }
    return originalConsoleWarn.apply(console, args);
  };
}

// Define a TypeScript interface for recipient data
interface RecipientData {
  email: string;
  name?: string;
  // Use a more specific index signature instead of 'any'
  [key: string]: string | number | boolean | undefined;
}

// Email validation function that doesn't rely on punycode
export function validateEmail(email: string): boolean {
  // Fix control character in regex by using a standard ASCII-only regex
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

// Sanitize email to avoid punycode issues
export function sanitizeEmail(email: string): string {
  return email.replace(/[^\x00-\x7F]/g, '');
}

export async function createSmtpTransport(smtpConfig: SmtpConfig) {
  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: {
      user: smtpConfig.username,
      pass: smtpConfig.password,
    },
    // Increase timeout for slow SMTP servers
    connectionTimeout: 10000,
    // Logger for debugging
    ...(process.env.NODE_ENV === 'development' ? {
      debug: true,
      logger: true,
    } : {}),
  });
  
  // Verify connection configuration
  await transporter.verify();
  
  return transporter;
}
export async function sendTestEmail(config: SmtpConfig) {
  const transporter = await createSmtpTransport(config);
  
  // Sanitize fromEmail to avoid punycode issues
  const sanitizedFromEmail = sanitizeEmail(config.fromEmail);
  // Use nullish coalescing instead of logical OR
  const sanitizedFromName = config.fromName ?? sanitizedFromEmail;
  
  const info = await transporter.sendMail({
    from: `"${sanitizedFromName}" <${sanitizedFromEmail}>`,
    to: sanitizedFromEmail,
    subject: "SMTP Test",
    text: "This is a test email to verify SMTP configuration.",
    html: "<p>This is a test email to verify SMTP configuration.</p>",
  });
  
  return info;
}

// lib/email.ts (add better error handling and debugging)

// lib/email.ts (fix for any types)

export function parseRecipientsFromExcel(file: Buffer): RecipientData[] {
    try {
      // Log buffer size for debugging
      console.log(`Parsing Excel file with buffer size: ${file.length} bytes`);
      
      // Handle empty buffer
      if (file.length === 0) {
        console.error("Empty file buffer provided");
        return [];
      }
      
      // Read Excel file
      const workbook = XLSX.read(file, { type: 'buffer' });
      
      // Check if workbook was parsed
      if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
        console.error("Failed to parse Excel workbook or no sheets found");
        return [];
      }
      
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      if (!worksheet) {
        console.error(`Worksheet "${firstSheetName}" not found in Excel file`);
        return [];
      }
      
      // Parse worksheet to JSON with header: 1 to ensure column names are used
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Check if there's data in the worksheet
      if (!Array.isArray(rawData) || rawData.length < 2) {
        console.error("No data rows found in Excel file or missing headers");
        return [];
      }
      
      // Get headers from first row - use more specific type
      const headers = rawData[0] as Array<string | number>;
      
      // Check if 'email' column exists (handle both string and number headers)
      const hasEmailColumn = headers.some(h => 
        typeof h === 'string' && ['email', 'Email', 'EMAIL'].includes(h)
      );
      
      if (!hasEmailColumn) {
        console.error("No 'email' column found in Excel file");
        return [];
      }
      
      // Find the email column index (case insensitive)
      const emailIndex = headers.findIndex(h => 
        typeof h === 'string' && h.toLowerCase() === 'email'
      );
      
      if (emailIndex === -1) {
        console.error("Could not find email column index");
        return [];
      }
      
      // Convert rows to objects using headers
      const data: RecipientData[] = [];
      
      // Replace the 'any' type with a more specific type
      for (let i = 1; i < rawData.length; i++) {
        // Use unknown instead of any
        const row = rawData[i] as Array<string | number | boolean | null | undefined>;
        
        if (!row || !Array.isArray(row)) continue;
        
        // Use a more specific type for the object
        const obj: Record<string, string | number | boolean | null> = {};
        
        // Only process rows that have an email
        const emailValue = row[emailIndex];
        if (typeof emailValue !== 'string' || !emailValue) {
          continue;
        }
        
        // Add each column value to the object
        for (let j = 0; j < headers.length; j++) {
          const header = headers[j];
          if (header && row[j] !== undefined) {
            const headerKey = String(header);
            const value = row[j];
            
            // Only add values of supported types
            if (
              typeof value === 'string' || 
              typeof value === 'number' || 
              typeof value === 'boolean' || 
              value === null
            ) {
              obj[headerKey] = value;
            } else if (value !== undefined) {
              // Convert other types to string
              obj[headerKey] = String(value);
            }
          }
        }
        
        // Only add rows that have a valid email
        if (obj.email && typeof obj.email === 'string' && validateEmail(obj.email.trim())) {
          // Sanitize email
          obj.email = sanitizeEmail(obj.email.trim());
          
          // Cast the object to RecipientData
          data.push(obj as unknown as RecipientData);
        }
      }
      
      console.log(`Successfully parsed ${data.length} recipients from Excel file`);
      return data;
    } catch (error) {
      console.error("Error parsing Excel file:", error);
      return [];
    }
  }

export function replaceTemplateParams(template: string, params: Record<string, string>) {
  let result = template;
  Object.entries(params).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    // Use nullish coalescing instead of logical OR
    result = result.replace(regex, value ?? '');
  });
  return result;
}

export async function sendCampaignEmail(
  smtpConfig: SmtpConfig, 
  subject: string, 
  htmlContent: string, 
  recipient: RecipientData
) {
  const transporter = await createSmtpTransport(smtpConfig);
  
  // Sanitize email addresses to avoid punycode issues
  const sanitizedFromEmail = sanitizeEmail(smtpConfig.fromEmail);
  const sanitizedToEmail = sanitizeEmail(recipient.email);
  
  // Replace parameters in template
  const personalizedHtml = replaceTemplateParams(
    htmlContent,
    {
      ...recipient,
      // Use nullish coalescing instead of logical OR
      name: recipient.name ?? recipient.email,
    } as Record<string, string>
  );
  
  const personalizedSubject = replaceTemplateParams(
    subject,
    {
      ...recipient,
      // Use nullish coalescing instead of logical OR
      name: recipient.name ?? recipient.email,
    } as Record<string, string>
  );
  
  const info = await transporter.sendMail({
    from: `"${smtpConfig.fromName}" <${sanitizedFromEmail}>`,
    to: sanitizedToEmail,
    subject: personalizedSubject,
    html: personalizedHtml,
  });
  
  return info;
}