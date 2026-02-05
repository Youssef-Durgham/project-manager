import { NextRequest, NextResponse } from 'next/server';
import { validateCredentials, createToken, seedUsers } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    // Ensure default users exist
    await seedUsers();

    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Rate limit basic check via header
    const { user, error } = await validateCredentials(username, password);

    if (!user) {
      // Intentional delay to slow down brute force
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
      return NextResponse.json(
        { success: false, error: error || 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = await createToken(user);

    const response = NextResponse.json({ success: true, user });
    response.cookies.set('pm-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
