// app/api/email/process-now/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  try {
    // Verifikasi otentikasi
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Dapatkan data dari body request
    const data = await request.json();
    const { id } = data;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }
    
    // Periksa apakah kampanye ada dan milik pengguna yang sedang login
    const campaign = await prisma.campaign.findUnique({
      where: {
        id,
        userId: session.user.id,
      },
    });
    
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }
    
    // Proses kampanye sekarang
    // Contoh: Update status campaign menjadi 'processing'
    await prisma.campaign.update({
      where: { id },
      data: {
        status: 'processing',
        startedAt: new Date(),
      },
    });
    
    // Anda mungkin ingin memanggil webhook atau fungsi lain untuk memproses email
    // Misalnya: await processNextEmail(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing campaign:', error);
    return NextResponse.json(
      { error: 'Failed to process campaign' },
      { status: 500 }
    );
  }
}