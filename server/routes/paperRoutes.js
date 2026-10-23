import express from 'express';
import multer from 'multer';
import {
  uploadPaper,
  getPapers,
  getPaperById,
  getPaperChunks,
  reprocessPaper,
  searchPaperChunks,
  summarizePaper,
  getPaperSummary,
  getRelatedPapers,
  deletePaper,
} from '../controllers/paperController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { uploadRateLimiter, llmRateLimiter } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

// Multer configuration for PDF, LaTeX (.tex), Word (.docx), and Markdown (.md) upload (up to 25MB)
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    const isTex = file.mimetype === 'application/x-tex' ||
      file.mimetype === 'application/x-latex' ||
      file.mimetype === 'text/x-tex' ||
      file.mimetype === 'text/plain' ||
      file.originalname.toLowerCase().endsWith('.tex');
    const isDocx = file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.mimetype === 'application/msword' ||
      file.originalname.toLowerCase().endsWith('.docx');
    const isMd = file.mimetype === 'text/markdown' ||
      file.mimetype === 'text/x-markdown' ||
      file.originalname.toLowerCase().endsWith('.md') ||
      file.originalname.toLowerCase().endsWith('.markdown');

    if (!isPdf && !isTex && !isDocx && !isMd) {
      return cb(new Error('Only PDF (.pdf), LaTeX (.tex), Word (.docx), and Markdown (.md) files are allowed'), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
  },
});

// Middleware to handle Multer upload and support multiple field names ('pdf', 'file')
const uploadMiddleware = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'File upload failed' });
    }
    if (req.files && req.files.length > 0) {
      req.file = req.files[0];
    }
    next();
  });
};

router.post('/upload', authMiddleware, uploadRateLimiter, uploadMiddleware, uploadPaper);
router.get('/', authMiddleware, getPapers);
router.get('/:id', authMiddleware, getPaperById);
router.get('/:id/chunks', authMiddleware, getPaperChunks);
router.post('/:id/reprocess', authMiddleware, reprocessPaper);
router.post('/:id/search', authMiddleware, searchPaperChunks);
router.post('/:id/summarize', authMiddleware, llmRateLimiter, summarizePaper);
router.get('/:id/summary', authMiddleware, getPaperSummary);
router.get('/:id/related', authMiddleware, llmRateLimiter, getRelatedPapers);
router.delete('/:id', authMiddleware, deletePaper);

export default router;
