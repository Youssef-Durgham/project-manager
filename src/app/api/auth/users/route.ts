import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, seedUsers, hashPassword } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

// GET /api/auth/users - List all users (admin only)
export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();
    await seedUsers();
    const users = await User.find({}).select('-password -failedAttempts -lockedUntil').sort({ createdAt: 1 });
    return NextResponse.json({ success: true, users });
  } catch (err) {
    console.error('List users error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/auth/users - Create user (admin only)
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();
    const { username, name, password, role } = await req.json();

    // Validation
    if (!username || !name || !password) {
      return NextResponse.json({ error: 'Username, name, and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Check password strength
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      return NextResponse.json(
        { error: 'Password must contain uppercase, lowercase, number, and special character' },
        { status: 400 }
      );
    }

    // Check duplicate
    const existing = await User.findOne({ username: username.toLowerCase().trim() });
    if (existing) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      username: username.toLowerCase().trim(),
      name,
      password: hashedPassword,
      role: role || 'member',
    });

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (err) {
    console.error('Create user error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/auth/users - Update user (admin only)
export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();
    const { userId, name, password, role, isActive } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (name) user.name = name;
    if (role) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    if (password) {
      if (password.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
      }
      user.password = await hashPassword(password);
    }

    // Unlock if locked
    user.failedAttempts = 0;
    user.lockedUntil = null;
    await user.save();

    return NextResponse.json({ success: true, user });
  } catch (err) {
    console.error('Update user error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
