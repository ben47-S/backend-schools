import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Créer un pool de connexions avec des timeouts augmentés pour Neon
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 100, // Maximum 100 connexions simultanées
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  // Log les requêtes en développement
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});