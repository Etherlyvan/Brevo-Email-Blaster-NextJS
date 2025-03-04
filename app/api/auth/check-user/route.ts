// app/api/auth/check-user/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ exists: false }, { status: 400 });
    }
    
    const user = await prisma.user.findUnique({
      where: { email },
    });
    
    return NextResponse.json({ exists: !!user });
  } catch (error) {
    console.error("Error checking user:", error);
    return NextResponse.json({ exists: false, error: "Failed to check user" }, { status: 500 });
  }
}