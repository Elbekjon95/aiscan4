import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
    const session = await getSession();
    await session.destroy();
    
    // Redirect to login page relative to the current site
    const loginUrl = new URL('/admin/login', req.url);
    return NextResponse.redirect(loginUrl);
}
