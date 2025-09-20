import app from './app';
import env from './config/env';

const PORT = env.PORT;

const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Environment: ${env.NODE_ENV}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📁 Uploads: http://localhost:${PORT}/uploads`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM recebido, fechando servidor...');
  server.close(() => {
    console.log('Servidor fechado.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT recebido, fechando servidor...');
  server.close(() => {
    console.log('Servidor fechado.');
    process.exit(0);
  });
});

export default server;