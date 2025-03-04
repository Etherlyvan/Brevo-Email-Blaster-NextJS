// app/api/smtp/test/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { createTransport } from 'nodemailer';
import { SmtpConfig } from "@prisma/client";

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

// Define an interface for temporary SMTP configurations
interface TempSmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
}

// Define an error type for better error handling
interface ApiError extends Error {
  response?: string;
  details?: string;
  code?: string;
}

// Email validation function that doesn't rely on punycode
function validateEmail(email: string): boolean {
  // Fix control character in regex by using a standard ASCII-only regex
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

// Sanitize email to avoid punycode issues
function sanitizeEmail(email: string): string {
  // Remove any non-ASCII characters that might trigger punycode
  return email.replace(/[^\x00-\x7F]/g, '');
}

// Create SMTP transporter with sanitized email
async function createSmtpTransport(config: SmtpConfig | TempSmtpConfig) {
  return createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.username,
      pass: config.password,
    },
    debug: process.env.NODE_ENV !== 'production',
  });
}

// Send test email with sanitized emails
async function sendTestEmail(config: SmtpConfig | TempSmtpConfig) {
  const transporter = await createSmtpTransport(config);
  
  // Sanitize fromEmail to avoid punycode issues
  const sanitizedFromEmail = sanitizeEmail(config.fromEmail);
  const sanitizedFromName = config.fromName || sanitizedFromEmail;
  
  const info = await transporter.sendMail({
    from: `"${sanitizedFromName}" <${sanitizedFromEmail}>`,
    to: sanitizedFromEmail,
    subject: "SMTP Test",
    text: "This is a test email to verify SMTP configuration.",
    html: "<p>This is a test email to verify SMTP configuration.</p>",
  });
  
  return info;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const data = await request.json();
  
  try {
    // If smtpId is provided, use existing config
    if (data.smtpId) {
      const smtpConfig = await prisma.smtpConfig.findUnique({
        where: {
          id: data.smtpId,
          userId: session.user.id,
        },
      });
      
      if (!smtpConfig) {
        return NextResponse.json({ error: "SMTP configuration not found" }, { status: 404 });
      }
      
      const result = await sendTestEmail(smtpConfig);
      return NextResponse.json({ success: true, messageId: result.messageId });
    } 
    // Otherwise use provided config without saving
    else if (data.config) {
      const { host, port, secure, username, password, fromEmail, fromName } = data.config;
      
      if (!host || !port || !username || !password || !fromEmail) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }
      
      // Validate email format
      if (!validateEmail(fromEmail)) {
        return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
      }
      
      const sanitizedFromEmail = sanitizeEmail(fromEmail);
      
      const tempConfig: TempSmtpConfig = {
        host,
        port: parseInt(port),
        secure: !!secure,
        username,
        password,
        fromEmail: sanitizedFromEmail,
        fromName: fromName || sanitizedFromEmail,
      };
      
      // Cast to SmtpConfig only for the sendTestEmail function
      const result = await sendTestEmail(tempConfig);
      return NextResponse.json({ success: true, messageId: result.messageId });
    } else {
      return NextResponse.json({ error: "Either smtpId or config must be provided" }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error("Error testing SMTP config:", error);
    
    // Type guard and proper error handling
    const typedError = error as ApiError;
    
    return NextResponse.json({ 
      error: "Failed to send test email", 
      details: typedError.message || "Unknown error occurred"
    }, { status: 500 });
  }
}