import cors from './middleware/cors.middleware';
import express, { Request, Response } from 'express';
import authRoutes from './modules/auth/auth.routes';
import customersRoutes from './modules/customers/customers.routes';
import authenticate from './middleware/auth.middleware';
import { requireRole } from './middleware/role.middleware';

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors);
app.use(express.json());

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/customers', customersRoutes);

app.listen(port, () => {
  console.log(`Backend API running on http://localhost:${port}`);
});
