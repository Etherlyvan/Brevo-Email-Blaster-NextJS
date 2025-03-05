// app/api/smtp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

// Email validation function
function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

// Sanitize email to avoid encoding issues
function sanitizeEmail(email: string): string {
  return email.replace(/[^\x00-\x7F]/g, '');
}

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const smtpConfigs = await prisma.smtpConfig.findMany({
    where: {
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
  
  return NextResponse.json(smtpConfigs);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const data = await request.json();
  
  try {
    // Basic validation
    if (!data.name || !data.host || !data.port || !data.username || !data.password || !data.fromEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    // Validate email format
    if (!validateEmail(data.fromEmail)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    
    // Sanitize email
    const sanitizedFromEmail = sanitizeEmail(data.fromEmail);
    
    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await prisma.smtpConfig.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false },
      });
    }
    
    const smtpConfig = await prisma.smtpConfig.create({
      data: {
        name: data.name,
        host: data.host,
        port: parseInt(data.port),
        secure: !!data.secure,
        username: data.username,
        password: data.password,
        fromEmail: sanitizedFromEmail,
        fromName: data.fromName || sanitizedFromEmail,
        isDefault: !!data.isDefault,
        userId: session.user.id,
      },
    });
    
    return NextResponse.json({
      id: smtpConfig.id,
      name: smtpConfig.name,
      success: true,
    });
  } catch (error) {
    console.error("Error creating SMTP config:", error);
    return NextResponse.json({ error: "Failed to create SMTP configuration" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const data = await request.json();
  
  try {
    // Basic validation
    if (!data.id || !data.name || !data.host || !data.port || !data.username || !data.fromEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    // Validate email format
    if (!validateEmail(data.fromEmail)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    
    // Sanitize email
    const sanitizedFromEmail = sanitizeEmail(data.fromEmail);
    
    // Check if config exists and belongs to user
    const existingConfig = await prisma.smtpConfig.findFirst({
      where: {
        id: data.id,
        userId: session.user.id,
      },
    });
    
    if (!existingConfig) {
      return NextResponse.json({ error: "SMTP configuration not found" }, { status: 404 });
    }
    
    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await prisma.smtpConfig.updateMany({
        where: { 
          userId: session.user.id,
          id: { not: data.id },
        },
        data: { isDefault: false },
      });
    }
    
    // Create update data object
    interface UpdateData {
      name: string;
      host: string;
      port: number;
      secure: boolean;
      username: string;
      fromEmail: string;
      fromName: string;
      isDefault: boolean;
      password?: string;
    }
    
    const updateData: UpdateData = {
      name: data.name,
      host: data.host,
      port: parseInt(data.port),
      secure: !!data.secure,
      username: data.username,
      fromEmail: sanitizedFromEmail,
      fromName: data.fromName || sanitizedFromEmail,
      isDefault: !!data.isDefault,
    };
    
    // Only update password if provided
    if (data.password) {
      updateData.password = data.password;
    }
    
    const updatedConfig = await prisma.smtpConfig.update({
      where: { id: data.id },
      data: updateData,
    });
    
    return NextResponse.json({
      id: updatedConfig.id,
      name: updatedConfig.name,
      success: true,
    });
  } catch (error) {
    console.error("Error updating SMTP config:", error);
    return NextResponse.json({ error: "Failed to update SMTP configuration" }, { status: 500 });
  }
}