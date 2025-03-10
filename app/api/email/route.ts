// app/api/email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { parseRecipientsFromExcel, sanitizeEmail } from "@/lib/email";
import { startCampaignProcessing } from "@/lib/queue";
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
    const contactIdsStr = formData.get('contactIds') as string;
    const batchSizeStr = formData.get('batchSize') as string;
    const recipientSourceStr = formData.get('recipientSource') as string || 'file';
    
    // Automatic sending and scheduling
    const sendImmediatelyStr = formData.get('sendImmediately') as string;
    const isScheduledStr = formData.get('isScheduled') as string;
    const scheduledForStr = formData.get('scheduledFor') as string;
    
    // Parse batch size with a default of 20
    const batchSize = batchSizeStr ? parseInt(batchSizeStr, 10) : 20;
    
    // Determine schedule and sending status with defaults
    const isScheduled = isScheduledStr === 'true';
    // Default: If not scheduled, send immediately (true)
    const sendImmediately = sendImmediatelyStr === undefined 
      ? !isScheduled  // Default to true if not scheduled
      : sendImmediatelyStr === 'true';
    
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
    
    let contactIds: string[] = [];
    if (contactIdsStr) {
      try {
        contactIds = JSON.parse(contactIdsStr);
        if (!Array.isArray(contactIds)) {
          contactIds = [];
        }
      } catch (err) {
        console.error("Error parsing contact IDs:", err);
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
    
    const recipientSource = recipientSourceStr as 'file' | 'groups' | 'contacts';
    
    // Validate based on recipient source
    if (recipientSource === 'file' && !recipientFile) {
      return NextResponse.json({ 
        error: "Recipients file is required when using file as source" 
      }, { status: 400 });
    }
    
    if (recipientSource === 'groups' && groupIds.length === 0) {
      return NextResponse.json({ 
        error: "At least one contact group must be selected when using groups as source" 
      }, { status: 400 });
    }
    
    if (recipientSource === 'contacts' && contactIds.length === 0) {
      return NextResponse.json({ 
        error: "At least one contact must be selected when using contacts as source" 
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
    
    // Prepare scheduling data
    let scheduledDate: Date | null = null;
    if (isScheduled && scheduledForStr) {
      scheduledDate = new Date(scheduledForStr);
      
      // Validate scheduled date is in the future
      if (scheduledDate <= new Date()) {
        return NextResponse.json({ error: "Scheduled time must be in the future" }, { status: 400 });
      }
    }
    
    // Create the campaign with appropriate status
    const campaign = await prisma.campaign.create({
      data: {
        name: campaignName,
        // If scheduled -> queued
        // If not scheduled but send immediately -> processing
        // If not scheduled and not send immediately -> draft
        status: isScheduled 
          ? 'queued' 
          : (sendImmediately ? 'processing' : 'draft'),
        templateId,
        smtpConfigId,
        parameterValues: paramValues as Prisma.JsonObject,
        userId: session.user.id,
        batchSize,
        // Add scheduling data
        isScheduled: isScheduled,
        scheduledFor: scheduledDate,
        // Set startedAt if processing immediately
        startedAt: sendImmediately && !isScheduled ? new Date() : null,
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
    
    console.log(`Created campaign: ${campaign.id} (${campaignName})`);
    console.log(`Is scheduled: ${isScheduled}, Send immediately: ${sendImmediately}`);
    
    // Process recipients based on source
    let allRecipients: Array<{
      email: string;
      name: string | null;
      metadata: Record<string, unknown>;
      contactId: string | null;
    }> = [];
    
    // 1. Process file recipients if provided
    if (recipientSource === 'file' && recipientFile) {
      console.log(`Processing recipient file: ${recipientFile.name}`);
      const arrayBuffer = await recipientFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileRecipients = parseRecipientsFromExcel(buffer);
      
      if (fileRecipients.length === 0) {
        return NextResponse.json({ 
          error: "No valid recipients found in file" 
        }, { status: 400 });
      }
      
      console.log(`Found ${fileRecipients.length} recipients in file`);
      
      // Map file recipients to the right format
      allRecipients = [
        ...allRecipients,
        ...fileRecipients.map(recipient => ({
          email: sanitizeEmail(recipient.email),
          name: recipient.name as string | null,
          metadata: recipient as Record<string, unknown>,
          contactId: null, // These aren't linked to contacts
        }))
      ];
    }
    
    // 2. Process contacts if selected
    if (recipientSource === 'contacts' && contactIds.length > 0) {
      console.log(`Processing ${contactIds.length} selected contacts`);
      
      const contacts = await prisma.contact.findMany({
        where: {
          id: { in: contactIds },
          userId: session.user.id,
        },
        select: {
          id: true,
          email: true,
          name: true,
          metadata: true,
        },
      });
      
      if (contacts.length === 0) {
        return NextResponse.json({ 
          error: "No valid contacts found with the provided IDs" 
        }, { status: 400 });
      }
      
      // Map contacts to the right format
      allRecipients = [
        ...allRecipients,
        ...contacts.map(contact => ({
          email: contact.email,
          name: contact.name,
          metadata: contact.metadata as Record<string, unknown> || {},
          contactId: contact.id,
        }))
      ];
    }
    
    // 3. Process contact groups if selected
    if (recipientSource === 'groups' && groupIds.length > 0) {
      console.log(`Processing contacts from ${groupIds.length} groups`);
      
      const groupContacts = await prisma.contact.findMany({
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
      
      if (groupContacts.length === 0) {
        return NextResponse.json({ 
          error: "Selected contact groups contain no contacts" 
        }, { status: 400 });
      }
      
      console.log(`Found ${groupContacts.length} contacts in selected groups`);
      
      // Map group contacts to the right format
      allRecipients = [
        ...allRecipients,
        ...groupContacts.map(contact => ({
          email: contact.email,
          name: contact.name,
          metadata: contact.metadata as Record<string, unknown> || {},
          contactId: contact.id,
        }))
      ];
    }
    
    // Ensure we have recipients
    if (allRecipients.length === 0) {
      return NextResponse.json({ 
        error: "No recipients found from any source" 
      }, { status: 400 });
    }
    
    // Deduplicate recipients by email
    const uniqueEmails = new Set<string>();
    const uniqueRecipients = allRecipients.filter(recipient => {
      const email = recipient.email.toLowerCase();
      if (uniqueEmails.has(email)) {
        return false;
      }
      uniqueEmails.add(email);
      return true;
    });
    
    console.log(`Total unique recipients: ${uniqueRecipients.length}`);
    
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
      
      console.log(`Creating batch of ${batch.length} recipients (${i+1}-${i+batch.length} of ${uniqueRecipients.length})`);
      
      await prisma.recipient.createMany({
        data: batch.map(recipient => ({
          email: recipient.email,
          name: recipient.name,
          metadata: recipient.metadata as Prisma.JsonObject,
          contactId: recipient.contactId,
          campaignId: campaign.id,
          status: 'pending',
        })),
      });
    }
    
    // Start campaign processing if needed
    if (sendImmediately && !isScheduled) {
      console.log(`Starting immediate processing for campaign ${campaign.id}`);
      const processingStarted = await startCampaignProcessing(campaign.id);
      console.log(`Campaign processing started: ${processingStarted ? 'success' : 'failed'}`);
    }
    
    return NextResponse.json({
      success: true,
      campaign: campaign.id,
      totalRecipients: uniqueRecipients.length,
      message: sendImmediately && !isScheduled ? 
        "Campaign created and processing started" : 
        isScheduled ? 
          `Campaign created and scheduled for ${scheduledDate?.toLocaleString()}` :
          "Campaign created successfully",
    });
  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to create campaign" 
    }, { status: 500 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    // Get all campaigns for the user
    const campaigns = await prisma.campaign.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        template: {
          select: {
            name: true,
          },
        },
        smtpConfig: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return NextResponse.json(campaigns);
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to fetch campaigns" 
    }, { status: 500 });
  }
}