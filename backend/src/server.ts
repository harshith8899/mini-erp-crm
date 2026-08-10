import express, { Request, Response } from 'express';

const app = express();
const port = Number(process.env.PORT) || 3000;

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'API is running' });
});

app.listen(port, () => {
  console.log(`Backend API running on http://localhost:${port}`);
});
