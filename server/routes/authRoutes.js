import express from 'express';
import { register, login, resetPassword, getUserActivity, changePassword, updateProfile } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { authRateLimiter } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.post('/reset-password', authRateLimiter, resetPassword);

// Protected route to update profile details
router.put('/profile', authMiddleware, updateProfile);

// Protected route to update password
router.put('/change-password', authMiddleware, changePassword);

// Protected route to retrieve user activity and telemetry
router.get('/activity', authMiddleware, getUserActivity);

// Protected test route to verify authentication
router.get('/me', authMiddleware, (req, res) => {
  res.status(200).json({
    message: 'Authentication successful',
    user: req.user,
  });
});

export default router;

