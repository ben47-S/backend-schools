/**
 * Environment Configuration
 * Validates and exports environment variables using Zod
 */

import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('Invalid database URL'),

  // Server
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
});

// Parse and validate environment variables
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;

// Type export for TypeScript
export type Env = z.infer<typeof envSchema>;
