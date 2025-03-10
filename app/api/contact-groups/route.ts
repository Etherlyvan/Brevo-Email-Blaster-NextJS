// app/api/contact-groups/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

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
    // Get group with contact count
    const group = await prisma.contactGroup.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        _count: {
          select: {
            contacts: true,
          },
        },
      },
    });
    
    if (!group) {
      return NextResponse.json({ error: "Contact group not found" }, { status: 404 });
    }
    
    // Format response
    const formattedGroup = {
      id: group.id,
      name: group.name,
      description: group.description,
      contactCount: group._count.contacts,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
    
    return NextResponse.json(formattedGroup);
  } catch (error) {
    console.error("Error fetching contact group:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to fetch contact group" 
    }, { status: 500 });
  }
}

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
    
    if (!data.name) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }
    
    // Check if group exists and belongs to user
    const existingGroup = await prisma.contactGroup.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });
    
    if (!existingGroup) {
      return NextResponse.json({ error: "Contact group not found" }, { status: 404 });
    }
    
    // Update group
    const updatedGroup = await prisma.contactGroup.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
      },
    });
    
    return NextResponse.json(updatedGroup);
  } catch (error) {
    console.error("Error updating contact group:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to update contact group" 
    }, { status: 500 });
  }
}

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
    // Check if group exists and belongs to user
    const existingGroup = await prisma.contactGroup.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });
    
    if (!existingGroup) {
      return NextResponse.json({ error: "Contact group not found" }, { status: 404 });
    }
    
    // Delete group
    await prisma.contactGroup.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting contact group:", error);
    
    // Check for foreign key constraint errors
    if (error instanceof Error && error.message.includes('Foreign key constraint failed')) {
      return NextResponse.json({ 
        error: "Cannot delete this group because it's being used by campaigns or contacts" 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to delete contact group" 
    }, { status: 500 });
  }
}