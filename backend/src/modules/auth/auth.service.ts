import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma';
import { PublicUser } from './auth.types';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

if (!JWT_SECRET) {
  // Do not throw in module load in case some scripts need to run without it, but warn.
  console.warn('JWT_SECRET is not set. Authentication will not work without it.');
}

export async function authenticateUser(email: string, password: string): Promise<{ token: string; user: PublicUser } | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  if (!user.isActive) return null;

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return null;

  if (!JWT_SECRET) throw new Error('JWT_SECRET is not configured');

  const payload = { userId: user.id, role: user.role };
  // cast options to any to avoid mismatches between jsonwebtoken runtime and types
  const token = jwt.sign(payload as any, JWT_SECRET as any, { expiresIn: JWT_EXPIRES_IN } as any);

  const publicUser: PublicUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };

  return { token, user: publicUser };
}
