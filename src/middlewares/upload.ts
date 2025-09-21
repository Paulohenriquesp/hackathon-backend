import multer from 'multer';
import { Request } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Criar diretório de uploads se não existir
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Tipos de arquivo permitidos
const allowedMimeTypes = [
  'application/pdf',                    // PDF
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'application/msword',                 // DOC
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
  'application/vnd.ms-powerpoint',      // PPT
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
  'application/vnd.ms-excel',           // XLS
  'image/jpeg',                         // JPEG
  'image/png',                          // PNG
  'image/gif',                          // GIF
  'image/svg+xml',                      // SVG
  'text/plain',                         // TXT
];

// Extensões permitidas
const allowedExtensions = [
  '.pdf', '.docx', '.doc', '.pptx', '.ppt', 
  '.xlsx', '.xls', '.jpg', '.jpeg', '.png', 
  '.gif', '.svg', '.txt'
];

// Configuração do storage
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    // Gerar nome único: random + timestamp + extensão original
    const extension = path.extname(file.originalname);
    const uniqueName = `${crypto.randomUUID()}${extension}`;
    cb(null, uniqueName);
  }
});

// Filtro de arquivos
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Verificar MIME type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`));
  }

  // Verificar extensão
  const extension = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    return cb(new Error(`Extensão de arquivo não permitida: ${extension}`));
  }

  cb(null, true);
};

// Configuração do multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB em bytes
    files: 1, // Apenas 1 arquivo por upload
  }
});

// Função para obter URL do arquivo
export const getFileUrl = (filename: string): string => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
  return `${baseUrl}/uploads/${filename}`;
};

// Função para deletar arquivo
export const deleteFile = (filename: string): void => {
  const filePath = path.join(uploadsDir, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

// Middleware para validar arquivo após upload
export const validateUploadedFile = (req: Request, res: any, next: any) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'Nenhum arquivo foi enviado'
    });
  }

  // Verificar se o arquivo foi salvo corretamente
  const filePath = path.join(uploadsDir, req.file.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(500).json({
      success: false,
      error: 'Erro ao salvar arquivo'
    });
  }

  next();
};

// Tipos para TypeScript
export interface UploadedFile {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
}