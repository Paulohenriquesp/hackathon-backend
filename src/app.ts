import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

// Import tipos personalizados

import authRoutes from './routes/auth';
import materialsRoutes from './routes/materials';
import env from './config/env';

const app = express();

// Security middlewares
app.use(helmet());
app.use(cors({
  origin: env.NODE_ENV === 'production' ? ['https://yourdomain.com'] : true,
  credentials: true
}));

// Logging
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/materials', materialsRoutes);

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
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erro não tratado:', error);
  
  if (env.NODE_ENV === 'development') {
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor',
      details: error.message,
      stack: error.stack
    });
  } else {
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

export default app;