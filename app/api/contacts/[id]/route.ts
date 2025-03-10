// app/api/contacts/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const { id } = await params;
  
  try {
    // Check if contact exists and belongs to user
    const contact = await prisma.contact.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });
    
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    
    // Delete contact
    await prisma.contact.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting contact:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to delete contact" 
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const { id } = await params;
  
  try {
    // Get contact with groups
    const contact = await prisma.contact.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
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
    });
    
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    
    // Format response
    const formattedContact = {
      id: contact.id,
      email: contact.email,
      name: contact.name,
      metadata: contact.metadata,
      groups: contact.groups.map(g => ({
        id: g.group.id,
        name: g.group.name,
      })),
      createdAt: contact.createdAt.toISOString(),
    };
    
    return NextResponse.json(formattedContact);
  } catch (error) {
    console.error("Error fetching contact:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to fetch contact" 
    }, { status: 500 });
  }
}

// Similar fixes needed for PUT method
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const { id } = await params;
  
  try {
    const data = await request.json();
    
    // Validate request data
    if (!data.email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    
    // Check if contact exists and belongs to user
    const existingContact = await prisma.contact.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });
    
    if (!existingContact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    
    // Update contact in a transaction
    const updatedContact = await prisma.$transaction(async (tx) => {
      // Update contact
      const contact = await tx.contact.update({
        where: { id },
        data: {
          email: data.email,
          name: data.name,
          metadata: data.metadata || {},
        },
      });
      
      // Remove old group assignments
      await tx.contactsOnGroups.deleteMany({
        where: { contactId: id },
      });
      
      // Add new group assignments if provided
      if (data.groupIds && Array.isArray(data.groupIds) && data.groupIds.length > 0) {
        await tx.contactsOnGroups.createMany({
          data: data.groupIds.map((groupId: string) => ({
            contactId: id,
            groupId,
          })),
        });
      }
      
      return contact;
    });
    
    return NextResponse.json({
      id: updatedContact.id,
      email: updatedContact.email,
      name: updatedContact.name,
      success: true,
    });
  } catch (error) {
    console.error("Error updating contact:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to update contact" 
    }, { status: 500 });
  }
}