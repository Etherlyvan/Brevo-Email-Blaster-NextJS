// app/api/smtp/test/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { createSmtpTransport } from "@/lib/email";
import { SmtpConfig } from "@prisma/client";

interface TempSmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const data = await request.json();
  
  try {
    // Email validation
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    const testEmail = data.testEmail || null;
    
    if (testEmail && !emailRegex.test(testEmail)) {
      return NextResponse.json({ error: "Invalid test email format" }, { status: 400 });
    }
    
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
      
      // Create the transporter
      const transporter = await createSmtpTransport(smtpConfig);
      
      // Sanitize emails
      const fromEmail = smtpConfig.fromEmail.replace(/[^\x00-\x7F]/g, '');
      const toEmail = testEmail ? testEmail.replace(/[^\x00-\x7F]/g, '') : fromEmail;
      
      // Send test email
      const info = await transporter.sendMail({
        from: `"${smtpConfig.fromName}" <${fromEmail}>`,
        to: toEmail,
        subject: "SMTP Test Email",
        text: "This is a test email to verify your SMTP configuration is working correctly.",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #4a5568;">SMTP Configuration Test</h2>
            <p>This is a test email to verify your SMTP configuration is working correctly.</p>
            <div style="margin-top: 20px; padding: 15px; background-color: #f7fafc; border-radius: 5px;">
              <p style="margin: 5px 0;"><strong>Server:</strong> ${smtpConfig.host}:${smtpConfig.port}</p>
              <p style="margin: 5px 0;"><strong>Security:</strong> ${smtpConfig.secure ? 'SSL/TLS' : 'None'}</p>
              <p style="margin: 5px 0;"><strong>From:</strong> ${smtpConfig.fromName} &lt;${smtpConfig.fromEmail}&gt;</p>
              <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <p style="margin-top: 20px; font-size: 0.9em; color: #718096;">
              This is an automated test email from your Brevo Email App.
            </p>
          </div>
        `,
      });
      
      return NextResponse.json({ 
        success: true, 
        messageId: info.messageId,
        recipient: toEmail
      });
    } 
    // Otherwise use provided config without saving
    else if (data.config) {
      const { host, port, secure, username, password, fromEmail, fromName } = data.config;
      
      if (!host || !port || !username || !password || !fromEmail) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }
      
      const tempConfig: TempSmtpConfig = {
        host,
        port: parseInt(port),
        secure: !!secure,
        username,
        password,
        fromEmail,
        fromName: fromName || fromEmail,
      };
      
      // Create the transporter
      const transporter = await createSmtpTransport(tempConfig as SmtpConfig);
      
      // Sanitize emails
      const fromEmailSanitized = tempConfig.fromEmail.replace(/[^\x00-\x7F]/g, '');
      const toEmail = testEmail ? testEmail.replace(/[^\x00-\x7F]/g, '') : fromEmailSanitized;
      
      // Send test email
      const info = await transporter.sendMail({
        from: `"${tempConfig.fromName}" <${fromEmailSanitized}>`,
        to: toEmail,
        subject: "SMTP Test Email",
        text: "This is a test email to verify your SMTP configuration is working correctly.",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #4a5568;">SMTP Configuration Test</h2>
            <p>This is a test email to verify your SMTP configuration is working correctly.</p>
            <div style="margin-top: 20px; padding: 15px; background-color: #f7fafc; border-radius: 5px;">
              <p style="margin: 5px 0;"><strong>Server:</strong> ${tempConfig.host}:${tempConfig.port}</p>
              <p style="margin: 5px 0;"><strong>Security:</strong> ${tempConfig.secure ? 'SSL/TLS' : 'None'}</p>
              <p style="margin: 5px 0;"><strong>From:</strong> ${tempConfig.fromName} &lt;${tempConfig.fromEmail}&gt;</p>
              <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <p style="margin-top: 20px; font-size: 0.9em; color: #718096;">
              This is an automated test email from your Brevo Email App.
            </p>
          </div>
        `,
      });
      
      return NextResponse.json({ 
        success: true, 
        messageId: info.messageId,
        recipient: toEmail
      });
    } else {
      return NextResponse.json({ error: "Either smtpId or config must be provided" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error testing SMTP config:", error);
    
    let errorMessage = "Failed to send test email";
    let errorDetails = "Unknown error occurred";
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Extract more meaningful error messages for common SMTP errors
      if (error.message.includes('ECONNREFUSED')) {
        errorDetails = "Connection refused. Please check your SMTP server address and port.";
      } else if (error.message.includes('ETIMEDOUT')) {
        errorDetails = "Connection timed out. Please check your SMTP server address and port.";
      } else if (error.message.includes('Invalid login')) {
        errorDetails = "Invalid login credentials. Please check your username and password.";
      } else if (error.message.includes('certificate')) {
        errorDetails = "SSL/TLS certificate error. Try disabling secure connection or check your server settings.";
      } else {
        errorDetails = error.message;
      }
    }
    
    return NextResponse.json({ 
      error: errorMessage, 
      details: errorDetails 
    }, { status: 500 });
  }
}