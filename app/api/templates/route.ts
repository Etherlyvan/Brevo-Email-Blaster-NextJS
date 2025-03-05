// app/api/templates/route.ts
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
    
    // Check if updating existing template
    if (data.id) {
      // Verify template belongs to user
      const existingTemplate = await prisma.emailTemplate.findFirst({
        where: {
          id: data.id,
          userId: session.user.id,
        },
      });
      
      if (!existingTemplate) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 });
      }
      
      // Update template
      const updatedTemplate = await prisma.emailTemplate.update({
        where: { id: data.id },
        data: {
          name: data.name,
          subject: data.subject,
          htmlContent: data.htmlContent,
          parameters,
        },
      });
      
      return NextResponse.json(updatedTemplate);
    }
    
    // Create new template
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
    console.error("Error with template:", error);
    return NextResponse.json({ error: "Failed to process template" }, { status: 500 });
  }
}