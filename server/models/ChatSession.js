import mongoose from 'mongoose';

const chatSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  scope: {
    type: String,
    enum: ['paper', 'library'],
    required: true,
  },
  paperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paper',
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    citedChunks: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chunk',
    }],
    citations: [{
      chunkId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chunk',
      },
      paperId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Paper',
      },
      paperTitle: String,
      pageNumber: Number,
      chunkIndex: Number,
      snippet: String,
      text: String,
      score: Number,
    }],
  }],
}, { timestamps: true });

export default mongoose.model('ChatSession', chatSessionSchema);
