// app/api/email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { parseRecipientsFromExcel, sanitizeEmail } from "@/lib/email";
import { triggerNextBatch } from "@/lib/queue";
import { Prisma } from "@prisma/client";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const formData = await request.formData();
    
    const campaignName = formData.get('name') as string;
    const templateId = formData.get('templateId') as string;
    const smtpConfigId = formData.get('smtpConfigId') as string;
    const recipientFile = formData.get('recipients') as File | null;
    const paramValuesStr = formData.get('paramValues') as string;
    const groupIdsStr = formData.get('groupIds') as string;
    const batchSizeStr = formData.get('batchSize') as string;
    
    // Parse batch size with a default of 20
    const batchSize = batchSizeStr ? parseInt(batchSizeStr, 10) : 20;
    
    let paramValues = {};
    if (paramValuesStr) {
      try {
        paramValues = JSON.parse(paramValuesStr);
      } catch (err) {
        console.error("Error parsing parameter values:", err);
      }
    }
    
    let groupIds: string[] = [];
    if (groupIdsStr) {
      try {
        groupIds = JSON.parse(groupIdsStr);
        if (!Array.isArray(groupIds)) {
          groupIds = [];
        }
      } catch (err) {
        console.error("Error parsing group IDs:", err);
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
    
    if (!recipientFile && groupIds.length === 0) {
      return NextResponse.json({ 
        error: "Either recipients file or contact groups must be provided" 
      }, { status: 400 });
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
    
    // Create campaign
    const campaign = await prisma.campaign.create({
      data: {
        name: campaignName,
        status: "queued",
        templateId,
        smtpConfigId,
        parameterValues: paramValues as Prisma.JsonObject,
        userId: session.user.id,
        startedAt: new Date(),
        // Link to target groups if provided
        ...(groupIds.length > 0 ? {
          targetGroups: {
            createMany: {
              data: groupIds.map(groupId => ({ groupId })),
            },
          },
        } : {}),
      },
    });
    
    // Process recipients from file if provided
    let fileRecipients: Array<{ email: string; name?: string; [key: string]: unknown }> = [];
    
    if (recipientFile) {
      const arrayBuffer = await recipientFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fileRecipients = parseRecipientsFromExcel(buffer);
      
      if (fileRecipients.length === 0 && groupIds.length === 0) {
        return NextResponse.json({ 
          error: "No valid recipients found in file and no contact groups selected" 
        }, { status: 400 });
      }
    }
    
    // Process recipients from contact groups if provided
    let groupContacts: Array<{ id: string; email: string; name: string | null; metadata: unknown }> = [];
    
    if (groupIds.length > 0) {
      groupContacts = await prisma.contact.findMany({
        where: {
          userId: session.user.id,
          groups: {
            some: {
              groupId: {
                in: groupIds,
              },
            },
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          metadata: true,
        },
      });
      
      if (groupContacts.length === 0 && fileRecipients.length === 0) {
        return NextResponse.json({ 
          error: "Selected contact groups contain no contacts and no valid recipients in file" 
        }, { status: 400 });
      }
    }
    
    // Combine all recipients
    const allRecipients = [
      // Process file recipients
      ...fileRecipients.map(recipient => ({
        email: sanitizeEmail(recipient.email),
        name: recipient.name as string | null,
        metadata: recipient as Prisma.JsonObject,
        contactId: null, // These aren't linked to contacts
      })),
      
      // Process group contacts
      ...groupContacts.map(contact => ({
        email: contact.email,
        name: contact.name,
        metadata: contact.metadata as Prisma.JsonObject,
        contactId: contact.id,
      })),
    ];
    
    // Deduplicate recipients by email
    const uniqueEmails = new Set<string>();
    const uniqueRecipients = allRecipients.filter(recipient => {
      if (uniqueEmails.has(recipient.email.toLowerCase())) {
        return false;
      }
      uniqueEmails.add(recipient.email.toLowerCase());
      return true;
    });
    
    // Update campaign with recipient count
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        recipientCount: uniqueRecipients.length,
      },
    });
    
    // Create recipients in batches to avoid timeout
    const creationBatchSize = 500; // Different from email sending batch size
    for (let i = 0; i < uniqueRecipients.length; i += creationBatchSize) {
      const batch = uniqueRecipients.slice(i, i + creationBatchSize);
      
      await prisma.recipient.createMany({
        data: batch.map(recipient => ({
          email: recipient.email,
          name: recipient.name,
          metadata: recipient.metadata,
          contactId: recipient.contactId,
          campaignId: campaign.id,
          status: 'pending',
        })),
      });
    }
    
    // Trigger the first batch processing asynchronously
    triggerNextBatch(campaign.id, 0, batchSize);
    
    return NextResponse.json({
      success: true,
      campaign: campaign.id,
      totalRecipients: uniqueRecipients.length,
      message: "Campaign created and processing started",
    });
  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to create campaign" 
    }, { status: 500 });
  }
}