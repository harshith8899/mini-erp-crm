import { Request, Response } from 'express';
import { validateLogin } from './auth.validation';
import { authenticateUser } from './auth.service';

export async function loginHandler(req: Request, res: Response) {
  try {
    await validateAndLogin(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function validateAndLogin(req: Request, res: Response) {
  // run validation middleware logic inline
  const { email, password } = req.body ?? {};
  if (!email || typeof email !== 'string') return res.status(400).json({ error: 'Email is required' });
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return res.status(400).json({ error: 'Email is invalid' });
  if (!password || typeof password !== 'string') return res.status(400).json({ error: 'Password is required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const result = await authenticateUser(email, password);
  if (!result) return res.status(401).json({ error: 'Invalid email or password' });

  res.json({ token: result.token, user: result.user });
}

export async function meHandler(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  res.json(user);
}
