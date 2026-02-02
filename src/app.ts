/**
 * Express Application Configuration
 * Main app setup with middleware and routes
 */

import express from 'express';
import cors from 'cors';
import { authRoutes, collegeRoutes, anneeScolaireRoutes, departementRoutes, matiereRoutes, salleRoutes, enseignantRoutes, etudiantRoutes, parentRoutes, inscriptionRoutes, noteRoutes } from './routes';
import { errorHandler } from './middlewares/errorHandler.middleware';
import { authenticateToken } from './middlewares/auth.middleware';
import { requireRoles } from './middlewares/rbac.middleware';
import * as collegeService from './services/college.service';
import setupRoutes from './routes/setup.routes.js';

const app = express();

/**
 * CORS Configuration
 * Allow localhost and specific ports for development
 */
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Apply CORS middleware FIRST - before all other middleware and routes
app.use(cors(corsOptions));

/**
 * Global middleware
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Health check route
 */
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Academic Management API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

/**
 * API Routes
 */
app.use('/api/auth', authRoutes);

/**
 * IMPORTANT: Admin college route MUST be before /api/colleges
 * to avoid being caught by /:id parameter
 */
app.get(
  '/api/admin-college/me',
  authenticateToken,
  requireRoles('ADMIN_COLLEGE'),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }
      const college = await collegeService.getMyCollege(req.user.id);
      res.json({
        success: true,
        data: college,
      });
    } catch (error) {
      next(error);
    }
  }
);

app.use('/api/colleges', collegeRoutes);
app.use('/api/annees', anneeScolaireRoutes);
app.use('/api/departements', departementRoutes);
app.use('/api/matieres', matiereRoutes);
app.use('/api/salles', salleRoutes);
app.use('/api/enseignants', enseignantRoutes);
app.use('/api/etudiants', etudiantRoutes);
app.use('/api/parents', parentRoutes);
app.use('/api/inscriptions', inscriptionRoutes);
app.use('/api/notes', noteRoutes);

/**
 * TEMPORARY: Setup routes for initial configuration
 * TODO: Remove in production
 */
app.use('/api/setup', setupRoutes);

/**
 * 404 handler for undefined routes
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND',
      path: req.path,
    },
  });
});

/**
 * Global error handler (must be last)
 */
app.use(errorHandler);

export default app;
