import Paper from '../models/Paper.js';
import Chunk from '../models/Chunk.js';
import Note from '../models/Note.js';
import ChatSession from '../models/ChatSession.js';
import { extractText } from '../services/pdfService.js';
import { extractLatexText } from '../services/latexService.js';
import { extractDocxText } from '../services/docxService.js';
import { extractMarkdownText } from '../services/markdownService.js';
import { chunkPages } from '../services/chunkService.js';
import { generateEmbeddings, generateSingleEmbedding } from '../services/embeddingService.js';
import { searchChunks } from '../services/vectorSearchService.js';
import { generatePaperSummary } from '../services/summaryService.js';
import { findRelatedPapers } from '../services/externalPaperService.js';

/**
 * Process a paper's text: chunks pages, generates OpenAI embeddings, and stores chunks.
 */
const processPaperChunksAndEmbeddings = async (paperId, userId, pages) => {
  console.log(`[Processing] Starting chunking and embedding for paper: ${paperId}`);

  // 1. Chunk pages (~500 tokens, 50 overlap, preserving page numbers)
  const chunks = chunkPages(pages, { maxTokens: 500, overlapTokens: 50 });
  if (chunks.length === 0) {
    throw new Error('No extractable text segments found to chunk');
  }

  console.log(`[Processing] Generated ${chunks.length} chunks for paper ${paperId}`);

  // 2. Generate embeddings via OpenAI
  const chunkTexts = chunks.map(c => c.text);
  const embeddings = await generateEmbeddings(chunkTexts, { batchSize: 50 });

  if (embeddings.length !== chunks.length) {
    throw new Error('Mismatch between chunk count and generated embeddings count');
  }

  // 3. Prepare chunk documents
  const chunkDocs = chunks.map((chunk, index) => ({
    userId,
    paperId,
    text: chunk.text,
    pageNumber: chunk.pageNumber,
    chunkIndex: chunk.chunkIndex,
    tokenCount: chunk.tokenCount,
    embedding: embeddings[index],
  }));

  // 4. Save to Chunk collection (replace any existing chunks for this paper)
  await Chunk.deleteMany({ paperId });
  await Chunk.insertMany(chunkDocs);

  console.log(`[Processing] Successfully stored ${chunkDocs.length} embedded chunks for paper ${paperId}`);
  return chunkDocs.length;
};

/**
 * Upload a research paper (PDF or LaTeX .tex)
 */
export const uploadPaper = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No manuscript file uploaded' });
    }

    const ext = req.file.originalname.toLowerCase();
    const mime = (req.file.mimetype || '').toLowerCase();

    let fileType = 'pdf';
    if (ext.endsWith('.tex') || mime === 'application/x-tex' || mime === 'application/x-latex' || mime === 'text/x-tex') {
      fileType = 'tex';
    } else if (ext.endsWith('.docx') || mime.includes('wordprocessingml') || mime.includes('msword')) {
      fileType = 'docx';
    } else if (ext.endsWith('.md') || ext.endsWith('.markdown') || mime.includes('markdown')) {
      fileType = 'md';
    } else if (ext.endsWith('.pdf') || mime === 'application/pdf') {
      fileType = 'pdf';
    }

    let parsedAuthors = [];
    if (req.body.authors) {
      if (Array.isArray(req.body.authors)) {
        parsedAuthors = req.body.authors;
      } else if (typeof req.body.authors === 'string') {
        try {
          parsedAuthors = JSON.parse(req.body.authors);
          if (!Array.isArray(parsedAuthors)) parsedAuthors = [parsedAuthors];
        } catch {
          parsedAuthors = req.body.authors.split(',').map((a) => a.trim()).filter(Boolean);
        }
      }
    }

    // Create a Paper document with status 'processing'
    const paper = new Paper({
      userId: req.user.userId,
      title: req.body.title || req.file.originalname,
      authors: parsedAuthors,
      fileType,
      status: 'processing',
    });

    await paper.save();

    // Process file asynchronously (extract -> chunk -> embed -> ready)
    setImmediate(async () => {
      try {
        let rawText = '';
        let pages = [];
        let extractedTitle = null;
        let extractedAuthors = [];

        if (fileType === 'md') {
          const mdResult = await extractMarkdownText(req.file.buffer);
          rawText = mdResult.rawText;
          pages = mdResult.pages;
          extractedTitle = mdResult.extractedTitle;
          extractedAuthors = mdResult.extractedAuthors;
        } else if (fileType === 'docx') {
          const docxResult = await extractDocxText(req.file.buffer);
          rawText = docxResult.rawText;
          pages = docxResult.pages;
          extractedTitle = docxResult.extractedTitle;
          extractedAuthors = docxResult.extractedAuthors;
        } else if (fileType === 'tex') {
          const texResult = await extractLatexText(req.file.buffer);
          rawText = texResult.rawText;
          pages = texResult.pages;
          extractedTitle = texResult.extractedTitle;
          extractedAuthors = texResult.extractedAuthors;
        } else {
          const pdfResult = await extractText(req.file.buffer);
          rawText = pdfResult.rawText;
          pages = pdfResult.pages;
        }

        // Chunk and generate embeddings
        const chunkCount = await processPaperChunksAndEmbeddings(paper._id, req.user.userId, pages);

        const updateData = {
          rawText,
          pages,
          chunkCount,
          status: 'ready',
          errorMessage: null,
        };

        // If title was not explicitly supplied, use extracted title
        if ((!req.body.title || req.body.title === req.file.originalname) && extractedTitle) {
          updateData.title = extractedTitle;
        }

        // If authors were not supplied, use extracted authors
        if ((!req.body.authors || paper.authors.length === 0) && extractedAuthors && extractedAuthors.length > 0) {
          updateData.authors = extractedAuthors;
        }

        await Paper.findByIdAndUpdate(paper._id, updateData);

        console.log(`[Paper ${paper._id} (${fileType.toUpperCase()})] Ready with ${chunkCount} chunks.`);
      } catch (error) {
        console.error(`[Paper ${paper._id}] Processing failed:`, error.message);
        await Paper.findByIdAndUpdate(paper._id, {
          status: 'failed',
          errorMessage: error.message,
        });
      }
    });

    const formatLabel = fileType === 'tex'
      ? 'LaTeX (.tex)'
      : fileType === 'docx'
        ? 'Word (.docx)'
        : fileType === 'md'
          ? 'Markdown (.md)'
          : 'PDF';
    res.status(201).json({
      message: `${formatLabel} manuscript uploaded and processing started`,
      paper,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Reprocess an existing paper (extract again or chunk & embed stored pages)
 */
export const reprocessPaper = async (req, res) => {
  try {
    const paper = await Paper.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!paper) {
      return res.status(404).json({ message: 'Paper not found' });
    }

    if (!paper.pages || paper.pages.length === 0) {
      return res.status(400).json({ message: 'Paper has no extracted pages to process' });
    }

    await Paper.findByIdAndUpdate(paper._id, {
      status: 'processing',
      errorMessage: null,
    });

    setImmediate(async () => {
      try {
        const chunkCount = await processPaperChunksAndEmbeddings(paper._id, req.user.userId, paper.pages);
        await Paper.findByIdAndUpdate(paper._id, {
          chunkCount,
          status: 'ready',
          errorMessage: null,
        });
      } catch (error) {
        console.error(`Reprocess failed for paper ${paper._id}:`, error.message);
        await Paper.findByIdAndUpdate(paper._id, {
          status: 'failed',
          errorMessage: error.message,
        });
      }
    });

    res.status(200).json({
      message: 'Paper reprocessing started',
      paperId: paper._id,
    });
  } catch (error) {
    console.error('Reprocess error:', error);
    res.status(500).json({ message: 'Error initiating reprocessing' });
  }
};

/**
 * Get all papers for the authenticated user
 */
export const getPapers = async (req, res) => {
  try {
    const papers = await Paper.find({ userId: req.user.userId })
      .select('-rawText -pages.text')
      .sort({ uploadDate: -1 });
    res.status(200).json(papers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching papers' });
  }
};

/**
 * Get a specific paper by ID
 */
export const getPaperById = async (req, res) => {
  try {
    const paper = await Paper.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!paper) {
      return res.status(404).json({ message: 'Paper not found' });
    }
    res.status(200).json(paper);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching paper' });
  }
};

/**
 * Get chunks for a specific paper
 */
export const getPaperChunks = async (req, res) => {
  try {
    const includeEmbeddings = req.query.includeEmbeddings === 'true';
    const projection = includeEmbeddings ? '' : '-embedding';

    const chunks = await Chunk.find({
      paperId: req.params.id,
      userId: req.user.userId,
    })
      .select(projection)
      .sort({ chunkIndex: 1 });

    res.status(200).json({
      paperId: req.params.id,
      count: chunks.length,
      chunks,
    });
  } catch (error) {
    console.error('Error fetching chunks:', error);
    res.status(500).json({ message: 'Error fetching chunks' });
  }
};

/**
 * Vector search query against a specific paper's chunks (Milestone Check)
 */
export const searchPaperChunks = async (req, res) => {
  try {
    const { query, limit = 5 } = req.body;
    if (!query || query.trim() === '') {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const paper = await Paper.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!paper) {
      return res.status(404).json({ message: 'Paper not found' });
    }

    // 1. Generate query embedding
    const queryVector = await generateSingleEmbedding(query);

    // 2. Perform vector search (Atlas $vectorSearch with cosine fallback)
    const results = await searchChunks({
      queryVector,
      paperId: paper._id,
      userId: req.user.userId,
      limit: parseInt(limit, 10),
    });

    res.status(200).json({
      paperId: paper._id,
      paperTitle: paper.title,
      query,
      resultsCount: results.length,
      results,
    });
  } catch (error) {
    console.error('Vector search error:', error);
    res.status(500).json({ message: error.message || 'Error executing vector search' });
  }
};

/**
 * Generate or retrieve structured summary for a research paper (Phase 4)
 */
export const summarizePaper = async (req, res) => {
  try {
    const { regenerate = false } = req.body;
    const paper = await Paper.findOne({ _id: req.params.id, userId: req.user.userId });

    if (!paper) {
      return res.status(404).json({ message: 'Paper not found' });
    }

    // Return existing summary if already generated and regenerate not requested
    if (paper.summary && paper.summary.tldr && !regenerate) {
      return res.status(200).json({
        message: 'Summary already available',
        summary: paper.summary,
        cached: true,
      });
    }

    console.log(`[Summarize] Generating summary for paper: ${paper._id} ("${paper.title}")`);
    const summary = await generatePaperSummary(paper);

    paper.summary = summary;
    await paper.save();

    res.status(200).json({
      message: 'Summary generated successfully',
      summary: paper.summary,
      cached: false,
    });
  } catch (error) {
    console.error('Summarize error:', error);
    res.status(500).json({ message: error.message || 'Error generating summary' });
  }
};

/**
 * Get summary for a research paper
 */
export const getPaperSummary = async (req, res) => {
  try {
    const paper = await Paper.findOne({ _id: req.params.id, userId: req.user.userId }).select('title summary authors uploadDate');

    if (!paper) {
      return res.status(404).json({ message: 'Paper not found' });
    }

    res.status(200).json({
      paperId: paper._id,
      title: paper.title,
      summary: paper.summary || null,
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ message: 'Error retrieving summary' });
  }
};

/**
 * Get or fetch related papers via Semantic Scholar / arXiv (Phase 7)
 * GET /api/papers/:id/related
 */
export const getRelatedPapers = async (req, res) => {
  try {
    const { refresh = 'false' } = req.query;
    const paper = await Paper.findOne({ _id: req.params.id, userId: req.user.userId });

    if (!paper) {
      return res.status(404).json({ message: 'Paper not found' });
    }

    if (paper.relatedPapers && paper.relatedPapers.length > 0 && refresh !== 'true') {
      return res.status(200).json({
        paperId: paper._id,
        keywords: paper.keywords || [],
        relatedPapers: paper.relatedPapers,
        cached: true,
      });
    }

    const { keywords, relatedPapers } = await findRelatedPapers(paper);

    paper.keywords = keywords;
    paper.relatedPapers = relatedPapers;
    await paper.save();

    res.status(200).json({
      paperId: paper._id,
      keywords,
      relatedPapers,
      cached: false,
    });
  } catch (error) {
    console.error('Related papers error:', error);
    res.status(500).json({ message: 'Error retrieving related literature' });
  }
};

/**
 * Delete a research paper and its associated chunks and notes
 * DELETE /api/papers/:id
 */
export const deletePaper = async (req, res) => {
  try {
    const paper = await Paper.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!paper) {
      return res.status(404).json({ message: 'Paper not found' });
    }

    // Cascade delete chunks, notes, and chat sessions
    await Promise.all([
      Paper.deleteOne({ _id: paper._id }),
      Chunk.deleteMany({ paperId: paper._id }),
      Note.deleteMany({ paperId: paper._id }),
      ChatSession.deleteMany({ paperId: paper._id }),
    ]);

    res.status(200).json({
      message: 'Paper and associated chunks/notes deleted successfully',
      paperId: paper._id,
    });
  } catch (error) {
    console.error('Delete paper error:', error);
    res.status(500).json({ message: 'Error deleting paper' });
  }
};

