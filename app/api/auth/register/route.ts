// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcrypt";
import { z } from "zod";
import { cacheUserImage } from "@/lib/user-image";

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  googleId: z.string().optional(),
  image: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = registerSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }
    
    const { name, email, password, googleId, image } = validation.data;
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user (initially without cachedImagePath)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        image,
      },
    });
    
    // If user has an image, cache it
    let cachedImagePath = null;
    if (image) {
      try {
        cachedImagePath = await cacheUserImage(user.id, image);
        
        // Update the user with the cached image path
        await prisma.user.update({
          where: { id: user.id },
          data: { cachedImagePath }
        });
      } catch (cacheError) {
        console.error("Error caching profile image during registration:", cacheError);
        // Continue with registration even if image caching fails
      }
    }
    
    // If this user is registering with Google, create the Account
    if (googleId) {
      await prisma.account.create({
        data: {
          userId: user.id,
          type: "oauth",
          provider: "google",
          providerAccountId: googleId,
        },
      });
    }
    
    // Return user without password
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      cachedImagePath
    });
  } catch (error) {
    console.error("Error during registration:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}