import express, { Request, Response } from 'express';
import authRoutes from './modules/auth/auth.routes';

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'API is running' });
});

app.use('/api/auth', authRoutes);

app.listen(port, () => {
  console.log(`Backend API running on http://localhost:${port}`);
});
