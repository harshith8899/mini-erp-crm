import cors from 'cors';
import { RequestHandler } from 'express';

const corsOptions = {
  origin: [
    'http://localhost:5173',
    'https://mini-erp-crm-silk.vercel.app',
  ],
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

const corsMiddleware: RequestHandler = cors(corsOptions);

export default corsMiddleware;
