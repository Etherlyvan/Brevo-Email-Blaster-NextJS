// app/api/email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { 
  createSmtpTransport, 
  parseRecipientsFromExcel, 
  replaceTemplateParams,
  sanitizeEmail
} from "@/lib/email";
import { Prisma } from "@prisma/client";

// Simplified approach to suppress the punycode deprecation warning
if (typeof process !== 'undefined') {
  const originalConsoleWarn = console.warn;
  console.warn = function(...args: unknown[]) {
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

// app/api/email/route.ts (update the Excel parsing part)

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    try {
      const formData = await request.formData();
      
      // Debug log
      console.log("Form data keys:", Array.from(formData.keys()));
      
      const campaignName = formData.get('name') as string;
      const templateId = formData.get('templateId') as string;
      const smtpConfigId = formData.get('smtpConfigId') as string;
      const recipientFile = formData.get('recipients') as File | null;
      const paramValuesStr = formData.get('paramValues') as string;
      
      let paramValues = {};
      if (paramValuesStr) {
        try {
          paramValues = JSON.parse(paramValuesStr);
        } catch (err) {
          console.error("Error parsing parameter values:", err);
        }
      }
      
      // Validate required fields
      if (!campaignName) {
        return NextResponse.json({ error: "Campaign name is required" }, { status: 400 });
      }
      
      if (!templateId) {
        return NextResponse.json({ error: "Email template is required" }, { status: 400 });
      }
      
      if (!smtpConfigId) {
        return NextResponse.json({ error: "SMTP configuration is required" }, { status: 400 });
      }
      
      if (!recipientFile) {
        return NextResponse.json({ error: "Recipients file is required" }, { status: 400 });
      }
      
      // Get template and SMTP config
      const [template, smtpConfig] = await Promise.all([
        prisma.emailTemplate.findUnique({
          where: { id: templateId, userId: session.user.id },
        }),
        prisma.smtpConfig.findUnique({
          where: { id: smtpConfigId, userId: session.user.id },
        }),
      ]);
      
      if (!template) {
        return NextResponse.json({ error: "Email template not found" }, { status: 404 });
      }
      
      if (!smtpConfig) {
        return NextResponse.json({ error: "SMTP configuration not found" }, { status: 404 });
      }
      
      // Convert File to Buffer for Excel parsing
      const arrayBuffer = await recipientFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Use the parseRecipientsFromExcel function to get recipients
      const recipients = parseRecipientsFromExcel(buffer);
      
      if (recipients.length === 0) {
        return NextResponse.json({ 
          error: "No valid recipients found in file. Make sure it has an 'email' column with valid email addresses." 
        }, { status: 400 });
      }
      
      console.log(`Processing campaign for ${recipients.length} recipients`);
      
      // Create campaign
      const campaign = await prisma.campaign.create({
        data: {
          name: campaignName,
          status: "processing",
          recipientCount: recipients.length,
          templateId,
          smtpConfigId,
          parameterValues: paramValues as Prisma.JsonObject,
          userId: session.user.id,
        },
      });
      
      // Store recipients
      const recipientPromises = recipients.map(recipient => {
        // Create a metadata object with proper typing for Prisma
        const metadata: Prisma.JsonObject = {};
        
        // Only add properties that aren't email or name
        Object.keys(recipient).forEach(key => {
          if (key !== 'email' && key !== 'name') {
            // Ensure the value is serializable to JSON
            const value = recipient[key];
            if (
              typeof value === 'string' ||
              typeof value === 'number' ||
              typeof value === 'boolean' ||
              value === null
            ) {
              metadata[key] = value;
            } else {
              // Convert non-primitive values to string to ensure JSON compatibility
              metadata[key] = String(value);
            }
          }
        });
        
        return prisma.recipient.create({
          data: {
            email: sanitizeEmail(recipient.email),
            name: recipient.name ?? null,
            metadata,
            campaignId: campaign.id,
          },
        });
      });
      
      await Promise.all(recipientPromises);
      
      // Setup email transport
      const transporter = await createSmtpTransport(smtpConfig);
      
      // Send emails
      let successCount = 0;
      let failCount = 0;
      
      for (const recipient of recipients) {
        try {
          // Sanitize email addresses
          const sanitizedFromEmail = sanitizeEmail(smtpConfig.fromEmail);
          const sanitizedToEmail = sanitizeEmail(recipient.email);
          
          // Prepare parameters for this recipient
          const recipientParams: Record<string, string> = {
            ...recipient,
            name: recipient.name ?? recipient.email,
          } as Record<string, string>;
          
          // Add default parameter values for missing parameters
          if (paramValues && typeof paramValues === 'object') {
            Object.entries(paramValues).forEach(([key, value]) => {
              if (!recipientParams[key] && typeof value === 'string') {
                recipientParams[key] = value;
              }
            });
          }
          
          // Replace parameters in template
          const personalizedHtml = replaceTemplateParams(
            template.htmlContent,
            recipientParams
          );
          
          const personalizedSubject = replaceTemplateParams(
            template.subject,
            recipientParams
          );
          
          await transporter.sendMail({
            from: `"${smtpConfig.fromName}" <${sanitizedFromEmail}>`,
            to: sanitizedToEmail,
            subject: personalizedSubject,
            html: personalizedHtml,
          });
          
          successCount++;
        } catch (error) {
          console.error(`Failed to send email to ${recipient.email}:`, error);
          failCount++;
        }
      }
      
      // Determine campaign status based on success and failure counts
      let campaignStatus: string;
      
      if (failCount === 0) {
        campaignStatus = "sent";
      } else if (failCount === recipients.length) {
        campaignStatus = "failed";
      } else {
        campaignStatus = "partial";
      }
      
      // Update campaign status
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          status: campaignStatus,
        },
      });
      
      return NextResponse.json({
        success: true,
        campaign: campaign.id,
        totalRecipients: recipients.length,
        successCount,
        failCount,
      });
    } catch (error: unknown) {
      console.error("Error sending campaign:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json({ error: `Failed to process campaign: ${errorMessage}` }, { status: 500 });
    }
  }