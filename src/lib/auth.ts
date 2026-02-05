import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require('bcryptjs');
import { connectDB } from './mongodb';
import User from '@/models/User';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'pm-secret-key-change-in-production-2026'
);

const SALT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export interface AuthUser {
  username: string;
  name: string;
  role: 'admin' | 'member';
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

export async function createToken(user: AuthUser): Promise<string> {
  return new SignJWT({ username: user.username, name: user.name, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      username: payload.username as string,
      name: payload.name as string,
      role: payload.role as 'admin' | 'member',
    };
  } catch {
    return null;
  }
}

export async function validateCredentials(
  username: string,
  password: string
): Promise<{ user: AuthUser | null; error?: string }> {
  await connectDB();

  const dbUser = await User.findOne({ username: username.toLowerCase().trim() });

  if (!dbUser) {
    return { user: null, error: 'Invalid credentials' };
  }

  if (!dbUser.isActive) {
    return { user: null, error: 'Account is deactivated' };
  }

  // Check if account is locked
  if (dbUser.lockedUntil && dbUser.lockedUntil > new Date()) {
    const remainingMin = Math.ceil((dbUser.lockedUntil.getTime() - Date.now()) / 60000);
    return { user: null, error: `Account locked. Try again in ${remainingMin} minutes` };
  }

  // Verify password
  const isMatch = await comparePassword(password, dbUser.password);

  if (!isMatch) {
    dbUser.failedAttempts += 1;
    if (dbUser.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      dbUser.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      dbUser.failedAttempts = 0;
    }
    await dbUser.save();
    return { user: null, error: 'Invalid credentials' };
  }

  // Successful login - reset counters
  dbUser.failedAttempts = 0;
  dbUser.lockedUntil = null;
  dbUser.lastLogin = new Date();
  await dbUser.save();

  return {
    user: {
      username: dbUser.username,
      name: dbUser.name,
      role: dbUser.role,
    },
  };
}

export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('pm-token')?.value;
    if (!token) return null;
    return await verifyToken(token);
  } catch {
    return null;
  }
}

/**
 * Seed default users if none exist
 */
export async function seedUsers() {
  await connectDB();
  const count = await User.countDocuments();
  if (count > 0) return;

  const yusifHash = await hashPassword(process.env.YUSIF_PASSWORD || 'Admin@2026!');
  const emp1Hash = await hashPassword(process.env.EMP1_PASSWORD || 'Worker@2026!');

  await User.create({
    username: 'yusif',
    name: 'Yusif',
    password: yusifHash,
    role: 'admin',
  });

  await User.create({
    username: 'employee-1',
    name: 'Employee-1',
    password: emp1Hash,
    role: 'member',
  });
}
