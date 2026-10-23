import express from 'express';
import {
  getNotesByPaper,
  createNote,
  updateNote,
  deleteNote,
} from '../controllers/noteController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/paper/:paperId', authMiddleware, getNotesByPaper);
router.post('/', authMiddleware, createNote);
router.post('/paper/:paperId', authMiddleware, createNote);
router.put('/:id', authMiddleware, updateNote);
router.delete('/:id', authMiddleware, deleteNote);

export default router;
