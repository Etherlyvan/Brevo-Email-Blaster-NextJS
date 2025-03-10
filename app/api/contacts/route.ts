// app/api/contacts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
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
  const limit = parseInt(url.searchParams.get('limit') ?? '20');
  
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
          mode: 'insensitive',
        },
      },
      {
        name: {
          contains: search,
          mode: 'insensitive',
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
    const contactGroups = contact.groups.map(g => ({
      id: g.group.id,
      name: g.group.name,
    }));
    
    return {
      id: contact.id,
      email: contact.email,
      name: contact.name,
      metadata: contact.metadata,
      groups: contactGroups,
      createdAt: contact.createdAt.toISOString(),
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