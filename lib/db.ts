// lib/db.ts
import { PrismaClient, Prisma } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Konfigurasi Prisma untuk production
const prismaOptions = process.env.NODE_ENV === 'production'
  ? {
      // Untuk vercel production
      log: ['error', 'warn'] as Prisma.LogLevel[],
      // Jika ada konfigurasi khusus untuk connection pooling
      // datasources: {
      //   db: {
      //     url: process.env.DATABASE_URL
      //   }
      // }
    }
  : {
      // Untuk development
      log: ['query', 'error', 'warn'] as Prisma.LogLevel[],
    };

export const prisma = globalForPrisma.prisma || new PrismaClient(prismaOptions);

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Supabase clients
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);