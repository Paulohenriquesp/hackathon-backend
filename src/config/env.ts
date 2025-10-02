import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default(3001),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  MAX_FILE_SIZE: z.string().transform(Number).optional(),
  UPLOAD_DIR: z.string().default('uploads'),
  OPENAI_API_KEY: z.string().optional(),
});

const env = envSchema.parse(process.env);

export default env;