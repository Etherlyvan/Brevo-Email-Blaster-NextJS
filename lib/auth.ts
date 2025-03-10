import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";
import bcrypt from "bcrypt";
import { cacheUserImage } from "./user-image";

// Extend the Session and JWT types to include the id property
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      cachedImagePath?: string | null;
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    cachedImagePath?: string | null;
  }
}

// Define a type for user data
interface UserWithCachedImage {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  cachedImagePath?: string | null;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user?.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          cachedImagePath: user.cachedImagePath,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.cachedImagePath = (user as UserWithCachedImage).cachedImagePath ?? null;
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        session.user.id = token.id;
        session.user.cachedImagePath = token.cachedImagePath ?? null;
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account: _account }) {
      // If this is a Google sign-in with a profile image
      if (_account?.provider === 'google' && user.id && user.image) {
        try {
          // Cache the profile image to avoid 429 errors
          const cachedImageUrl = await cacheUserImage(user.id, user.image);
          
          // Update the user with the cached image path
          await prisma.user.update({
            where: { id: user.id },
            data: { cachedImagePath: cachedImageUrl }
          });
        } catch (error) {
          console.error("Error caching Google profile image during sign in:", error);
          // Continue sign-in process even if image caching fails
        }
      }
    }
  },
  debug: process.env.NODE_ENV === 'development',
};