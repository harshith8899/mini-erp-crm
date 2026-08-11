import { Request } from 'express';

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export interface AuthRequest extends Request {
  user?: PublicUser;
}
