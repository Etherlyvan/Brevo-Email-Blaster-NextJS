// app/api/smtp/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Await the params Promise to get the actual parameters
  const { id } = await params;
  
  try {
    // Check if the SMTP config exists and belongs to the user
    const smtpConfig = await prisma.smtpConfig.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    });
    
    if (!smtpConfig) {
      return NextResponse.json({ error: "SMTP configuration not found" }, { status: 404 });
    }
    
    // Check if any campaigns are using this SMTP config
    const campaignsUsingConfig = await prisma.campaign.count({
      where: {
        smtpConfigId: id,
      },
    });
    
    if (campaignsUsingConfig > 0) {
      return NextResponse.json({ 
        error: "Cannot delete SMTP configuration that is being used by campaigns",
        campaignsCount: campaignsUsingConfig
      }, { status: 400 });
    }
    
    // Delete the SMTP config
    await prisma.smtpConfig.delete({
      where: {
        id: id,
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting SMTP config:", error);
    return NextResponse.json({ error: "Failed to delete SMTP configuration" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Await the params Promise to get the actual parameters
  const { id } = await params;
  
  try {
    const smtpConfig = await prisma.smtpConfig.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
        secure: true,
        username: true,
        fromEmail: true,
        fromName: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    if (!smtpConfig) {
      return NextResponse.json({ error: "SMTP configuration not found" }, { status: 404 });
    }
    
    return NextResponse.json(smtpConfig);
  } catch (error) {
    console.error("Error fetching SMTP config:", error);
    return NextResponse.json({ error: "Failed to fetch SMTP configuration" }, { status: 500 });
  }
}