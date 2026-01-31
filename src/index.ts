/**
 * Server Entry Point
 * Starts the Express server
 */

import 'dotenv/config';
import app from './app';
import { env } from './config/env';

const PORT = env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${env.NODE_ENV}`);
  console.log(`✅ Ready to accept requests`);
  console.log(`🔧 Connected to database: ${env.DATABASE_URL}`);
});