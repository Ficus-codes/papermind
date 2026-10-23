import ChatSession from '../models/ChatSession.js';
import Paper from '../models/Paper.js';
import { answerPaperQuestion, answerLibraryQuestion } from '../services/ragService.js';

/**
 * Chat with a single research paper (Phase 5: Single-Paper RAG Mode)
 * POST /api/chat/paper/:paperId
 */
export const chatWithPaper = async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const { paperId } = req.params;

    if (!message || message.trim() === '') {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const paper = await Paper.findOne({ _id: paperId, userId: req.user.userId });
    if (!paper) {
      return res.status(404).json({ message: 'Paper not found' });
    }

    // Find or create chat session for this paper
    let session = null;
    if (sessionId) {
      session = await ChatSession.findOne({ _id: sessionId, userId: req.user.userId });
    }

    if (!session) {
      // Find the most recent active session for this paper or create a new one
      session = await ChatSession.findOne({
        userId: req.user.userId,
        paperId: paper._id,
        scope: 'paper',
      }).sort({ updatedAt: -1 });

      if (!session) {
        session = new ChatSession({
          userId: req.user.userId,
          scope: 'paper',
          paperId: paper._id,
          messages: [],
        });
      }
    }

    // 1. Generate answer using Single-Paper RAG
    const { answer, citations } = await answerPaperQuestion({
      paper,
      question: message.trim(),
      chatHistory: session.messages,
    });

    // 2. Append User Message
    session.messages.push({
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
    });

    // 3. Append Assistant Message with citations
    const assistantMsg = {
      role: 'assistant',
      content: answer,
      timestamp: new Date(),
      citedChunks: citations.map(c => c.chunkId).filter(Boolean),
      citations: citations,
    };
    session.messages.push(assistantMsg);

    await session.save();

    res.status(200).json({
      sessionId: session._id,
      paperId: paper._id,
      paperTitle: paper.title,
      userMessage: message.trim(),
      assistantMessage: answer,
      citations: citations,
      totalMessages: session.messages.length,
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ message: error.message || 'Error processing chat query' });
  }
};

/**
 * Get message history for a paper
 * GET /api/chat/paper/:paperId
 */
export const getPaperChatHistory = async (req, res) => {
  try {
    const { paperId } = req.params;

    const session = await ChatSession.findOne({
      userId: req.user.userId,
      paperId,
      scope: 'paper',
    }).sort({ updatedAt: -1 });

    if (!session) {
      return res.status(200).json({
        sessionId: null,
        messages: [],
      });
    }

    res.status(200).json({
      sessionId: session._id,
      scope: session.scope,
      messages: session.messages,
    });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ message: 'Error retrieving chat history' });
  }
};

/**
 * Clear chat history for a paper
 * DELETE /api/chat/paper/:paperId
 */
export const clearPaperChatHistory = async (req, res) => {
  try {
    const { paperId } = req.params;

    await ChatSession.deleteMany({
      userId: req.user.userId,
      paperId,
      scope: 'paper',
    });

    res.status(200).json({ message: 'Chat history cleared successfully' });
  } catch (error) {
    console.error('Clear chat error:', error);
    res.status(500).json({ message: 'Error clearing chat history' });
  }
};

/**
 * Chat with complete user research library (Phase 6: Cross-Library RAG Mode)
 * POST /api/chat/library
 */
export const chatWithLibrary = async (req, res) => {
  try {
    const { message, sessionId, paperId } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ message: 'Message content is required' });
    }

    // Find or create library chat session
    let session = null;
    if (sessionId) {
      session = await ChatSession.findOne({ _id: sessionId, userId: req.user.userId, scope: 'library' });
    }

    if (!session) {
      session = await ChatSession.findOne({
        userId: req.user.userId,
        scope: 'library',
      }).sort({ updatedAt: -1 });

      if (!session) {
        session = new ChatSession({
          userId: req.user.userId,
          scope: 'library',
          messages: [],
        });
      }
    }

    // 1. Generate answer using Cross-Library RAG (optionally focused by paperId)
    const { answer, citations } = await answerLibraryQuestion({
      userId: req.user.userId,
      question: message.trim(),
      chatHistory: session.messages,
      maxChunksPerPaper: 2,
      totalLimit: 6,
      paperId: paperId || null,
    });

    // 2. Append User Message
    session.messages.push({
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
    });

    // 3. Append Assistant Message with multi-paper citations
    const assistantMsg = {
      role: 'assistant',
      content: answer,
      timestamp: new Date(),
      citedChunks: citations.map(c => c.chunkId).filter(Boolean),
      citations: citations,
    };
    session.messages.push(assistantMsg);

    await session.save();

    res.status(200).json({
      sessionId: session._id,
      userMessage: message.trim(),
      assistantMessage: answer,
      citations: citations,
      totalMessages: session.messages.length,
    });
  } catch (error) {
    console.error('Library chat error:', error);
    res.status(500).json({ message: error.message || 'Error processing library chat' });
  }
};

/**
 * Get message history for library chat
 * GET /api/chat/library
 */
export const getLibraryChatHistory = async (req, res) => {
  try {
    const session = await ChatSession.findOne({
      userId: req.user.userId,
      scope: 'library',
    }).sort({ updatedAt: -1 });

    if (!session) {
      return res.status(200).json({
        sessionId: null,
        messages: [],
      });
    }

    res.status(200).json({
      sessionId: session._id,
      scope: session.scope,
      messages: session.messages,
    });
  } catch (error) {
    console.error('Get library chat history error:', error);
    res.status(500).json({ message: 'Error retrieving library chat history' });
  }
};

/**
 * Clear message history for library chat
 * DELETE /api/chat/library
 */
export const clearLibraryChatHistory = async (req, res) => {
  try {
    await ChatSession.deleteMany({
      userId: req.user.userId,
      scope: 'library',
    });

    res.status(200).json({ message: 'Library chat history cleared successfully' });
  } catch (error) {
    console.error('Clear library chat error:', error);
    res.status(500).json({ message: 'Error clearing library chat history' });
  }
};
