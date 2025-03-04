// app/api/email/template/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const templates = await prisma.emailTemplate.findMany({
    where: {
      userId: session.user.id,
    },
  });
  
  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const data = await request.json();
  
  try {
    // Basic validation
    if (!data.name || !data.subject || !data.htmlContent) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    // Extract parameters from HTML content
    const paramRegex = /{{([^{}]+)}}/g;
    const matches = [...data.htmlContent.matchAll(paramRegex)];
    const parameters = [...new Set(matches.map(match => match[1].trim()))];
    
    const template = await prisma.emailTemplate.create({
      data: {
        name: data.name,
        subject: data.subject,
        htmlContent: data.htmlContent,
        parameters,
        userId: session.user.id,
      },
    });
    
    return NextResponse.json(template);
  } catch (error) {
    console.error("Error creating email template:", error);
    return NextResponse.json({ error: "Failed to create email template" }, { status: 500 });
  }
}