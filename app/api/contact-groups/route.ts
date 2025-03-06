// app/api/contact-groups/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

export async function GET() {  // Removed the unused 'request' parameter
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Get groups with contact count
  const groups = await prisma.contactGroup.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      _count: {
        select: {
          contacts: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });
  
  // Format response
  const formattedGroups = groups.map(group => ({
    id: group.id,
    name: group.name,
    description: group.description,
    contactCount: group._count.contacts,
    createdAt: group.createdAt,
  }));
  
  return NextResponse.json(formattedGroups);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const data = await request.json();
  
  if (!data.name) {
    return NextResponse.json({ error: "Group name is required" }, { status: 400 });
  }
  
  try {
    const group = await prisma.contactGroup.create({
      data: {
        name: data.name,
        description: data.description,
        userId: session.user.id,
      },
    });
    
    return NextResponse.json(group);
  } catch (error) {
    console.error("Error creating contact group:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to create contact group" 
    }, { status: 500 });
  }
}