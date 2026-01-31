/**
 * Express Application Configuration
 * Main app setup with middleware and routes
 */

import express from 'express';
import cors from 'cors';
import { authRoutes, collegeRoutes, anneeScolaireRoutes, departementRoutes, matiereRoutes, salleRoutes, enseignantRoutes, etudiantRoutes, parentRoutes, inscriptionRoutes, noteRoutes } from './routes';
import { errorHandler } from './middlewares/errorHandler.middleware';

const app = express();

/**
 * CORS Configuration
 */
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));

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
