import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';

// Import das rotas e middlewares
import authRoutes from './routes/authRoutes';
import { materialRoutes } from './routes/materialRoutes';
import { globalErrorHandler } from './utils/errorHandler';
import env from './config/env';

const app = express();

// Security middlewares
app.use(helmet());
app.use(cors({
  origin: env.NODE_ENV === 'production'
    ? ['https://yourdomain.com']
    : ['http://localhost:3000', 'http://localhost:3009', 'http://localhost:3010'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));

// Logging
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Cookie parsing
app.use(cookieParser());

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/materials', materialRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Banco Colaborativo de Recursos Didáticos API',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Rota não encontrada',
    path: req.originalUrl
  });
});

// Global error handler
app.use(globalErrorHandler);

export default app;