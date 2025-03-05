// app/api/templates/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

// Direct implementation without custom interfaces
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const template = await prisma.emailTemplate.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });
    
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    
    return NextResponse.json(template);
  } catch (error) {
    console.error("Error fetching template:", error);
    return NextResponse.json({ error: "Failed to fetch template" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    // Verify template belongs to user
    const template = await prisma.emailTemplate.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });
    
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    
    // Delete template
    await prisma.emailTemplate.delete({
      where: { id: params.id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}