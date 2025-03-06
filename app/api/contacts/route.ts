// app/api/contacts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { validateEmail, sanitizeEmail } from "@/lib/email";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Get query parameters
  const url = new URL(request.url);
  const groupId = url.searchParams.get('groupId');
  const search = url.searchParams.get('search');
  const page = parseInt(url.searchParams.get('page') ?? '1');
  const limit = parseInt(url.searchParams.get('limit') ?? '50');
  
  // Build where clause
  const where: Prisma.ContactWhereInput = {
    userId: session.user.id,
  };
  
  // Add group filter if provided
  if (groupId) {
    where.groups = {
      some: {
        groupId,
      },
    };
  }
  
  // Add search filter if provided
  if (search) {
    where.OR = [
      {
        email: {
          contains: search,
          mode: 'insensitive' as Prisma.QueryMode,
        },
      },
      {
        name: {
          contains: search,
          mode: 'insensitive' as Prisma.QueryMode,
        },
      },
    ];
  }
  
  // Get contacts with pagination
  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: {
        groups: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.contact.count({ where }),
  ]);
  
  // Format response
  const formattedContacts = contacts.map(contact => {
    // Extract groups from the contact object
    const contactGroups = contact.groups?.map(g => ({
      id: g.group.id,
      name: g.group.name,
    })) ?? [];
    
    return {
      id: contact.id,
      email: contact.email,
      name: contact.name,
      metadata: contact.metadata,
      groups: contactGroups,
      createdAt: contact.createdAt,
    };
  });
  
  return NextResponse.json({
    contacts: formattedContacts,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// Split the POST function into multiple smaller functions to reduce complexity
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    // Check if it's a form data request (bulk import)
    if (request.headers.get('content-type')?.includes('multipart/form-data')) {
      return handleBulkImport(request, session.user.id);
    } else {
      // Single contact creation
      return handleSingleContact(request, session.user.id);
    }
  } catch (error) {
    console.error("Error creating contact:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to create contact" 
    }, { status: 500 });
  }
}

// Handle bulk import of contacts
async function handleBulkImport(request: NextRequest, userId: string) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const groupIds = formData.get('groupIds') as string;
  
  if (!file) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }
  
  // Parse group IDs
  let parsedGroupIds: string[] = [];
  if (groupIds) {
    try {
      parsedGroupIds = JSON.parse(groupIds);
      if (!Array.isArray(parsedGroupIds)) {
        parsedGroupIds = [];
      }
    } catch (e) {
      console.error("Error parsing groupIds:", e);
    }
  }
  
  // Convert file to buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Parse contacts from Excel
  const { parseRecipientsFromExcel } = await import('@/lib/email');
  const contacts = parseRecipientsFromExcel(buffer);
  
  if (contacts.length === 0) {
    return NextResponse.json({ 
      error: "No valid contacts found in file" 
    }, { status: 400 });
  }
  
  return processContacts(contacts, parsedGroupIds, userId);
}

// Process contacts in batches
async function processContacts(
  contacts: Array<Record<string, unknown>>, 
  groupIds: string[], 
  userId: string
) {
  // Process contacts in batches to avoid timeout
  const batchSize = 100;
  let imported = 0;
  let duplicates = 0;
  
  for (let i = 0; i < contacts.length; i += batchSize) {
    const batch = contacts.slice(i, i + batchSize);
    
    // Process each contact in the batch
    const results = await Promise.all(
      batch.map(async (contact) => {
        try {
          const email = contact.email as string;
          
          // Check if contact already exists
          const existingContact = await prisma.contact.findFirst({
            where: {
              email,
              userId,
            },
          });
          
          if (existingContact) {
            // Update existing contact
            const updatedContact = await prisma.contact.update({
              where: { id: existingContact.id },
              data: {
                name: (contact.name as string) ?? existingContact.name,
                metadata: Prisma.JsonNull, // Reset metadata
                // Add to groups if specified
                ...(groupIds.length > 0 ? {
                  groups: {
                    createMany: {
                      data: groupIds.map(groupId => ({
                        groupId,
                      })),
                      skipDuplicates: true,
                    },
                  },
                } : {}),
              },
            });
            
            // Now update metadata separately to avoid type issues
            await prisma.contact.update({
              where: { id: updatedContact.id },
              data: {
                metadata: contact as Prisma.InputJsonValue,
              },
            });
            
            duplicates++;
            return { success: true, duplicate: true, id: updatedContact.id };
          }
          
          // Create new contact
          const newContact = await prisma.contact.create({
            data: {
              email,
              name: contact.name as string | null,
              metadata: contact as Prisma.InputJsonValue,
              userId,
              // Add to groups if specified
              ...(groupIds.length > 0 ? {
                groups: {
                  createMany: {
                    data: groupIds.map(groupId => ({
                      groupId,
                    })),
                  },
                },
              } : {}),
            },
          });
          imported++;
          return { success: true, id: newContact.id };
        } catch (error) {
          console.error(`Error importing contact:`, error);
          return { 
            success: false, 
            email: contact.email, 
            error: error instanceof Error ? error.message : String(error)
          };
        }
      })
    );
    
    // Check for any failures
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      console.warn(`${failures.length} contacts failed to import`);
    }
  }
  
  return NextResponse.json({
    success: true,
    imported,
    duplicates,
    total: contacts.length,
  });
}

// Handle single contact creation
async function handleSingleContact(request: NextRequest, userId: string) {
  const data = await request.json();
  
  if (!data.email || !validateEmail(data.email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  
  // Sanitize email
  const email = sanitizeEmail(data.email);
  
  // Check if contact already exists
  const existingContact = await prisma.contact.findFirst({
    where: {
      email,
      userId,
    },
  });
  
  if (existingContact) {
    return NextResponse.json({ 
      error: "Contact already exists", 
      contactId: existingContact.id 
    }, { status: 409 });
  }
  
  // Create contact
  const contact = await prisma.contact.create({
    data: {
      email,
      name: data.name ?? null,
      metadata: data.metadata ?? Prisma.JsonNull,
      userId,
      // Add to groups if specified
      ...(data.groupIds && Array.isArray(data.groupIds) ? {
        groups: {
          createMany: {
            data: data.groupIds.map((groupId: string) => ({
              groupId,
            })),
          },
        },
      } : {}),
    },
  });
  
  return NextResponse.json(contact);
}