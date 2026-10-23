import express from 'express';
import {
  chatWithPaper,
  getPaperChatHistory,
  clearPaperChatHistory,
  chatWithLibrary,
  getLibraryChatHistory,
  clearLibraryChatHistory,
} from '../controllers/chatController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { llmRateLimiter } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

// Cross-Library RAG Routes (Phase 6)
router.post('/library', authMiddleware, llmRateLimiter, chatWithLibrary);
router.get('/library', authMiddleware, getLibraryChatHistory);
router.delete('/library', authMiddleware, clearLibraryChatHistory);

// Single-Paper RAG Routes (Phase 5)
router.post('/paper/:paperId', authMiddleware, llmRateLimiter, chatWithPaper);
router.get('/paper/:paperId', authMiddleware, getPaperChatHistory);
router.delete('/paper/:paperId', authMiddleware, clearPaperChatHistory);

export default router;
