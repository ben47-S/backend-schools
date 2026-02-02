/**
 * Server Entry Point
 * Starts the Express server
 */

import 'dotenv/config';
import app from './app';
import { env } from './config/env';
// import { startScheduler } from './jobs/scheduler'; // ❌ DÉSACTIVÉ - Causait des erreurs de transaction P2028

const PORT = env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${env.NODE_ENV}`);
  console.log(`✅ Ready to accept requests`);

  // Start scheduled jobs
  // startScheduler(); // ❌ DÉSACTIVÉ - Causait des erreurs de transaction P2028
});