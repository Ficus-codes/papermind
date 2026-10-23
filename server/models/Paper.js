import mongoose from 'mongoose';

const paperSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  authors: [{
    type: String,
  }],
  rawText: {
    type: String,
  },
  pages: [{
    pageNumber: Number,
    text: String,
  }],
  uploadDate: {
    type: Date,
    default: Date.now,
  },
  fileType: {
    type: String,
    enum: ['pdf', 'tex', 'docx', 'md'],
    default: 'pdf',
  },
  status: {
    type: String,
    enum: ['processing', 'ready', 'failed'],
    default: 'processing',
  },
  chunkCount: {
    type: Number,
    default: 0,
  },
  summary: {
    tldr: {
      type: String,
    },
    keyTakeaways: [{
      type: String,
    }],
    problemStatement: {
      type: String,
    },
    coreAnalysis: {
      type: String,
    },
    conclusions: {
      type: String,
    },
    sections: [{
      heading: String,
      content: String,
    }],
    keyTerms: [{
      term: String,
      explanation: String,
    }],
    generatedAt: {
      type: Date,
    },
  },
  keywords: [{
    type: String,
  }],
  relatedPapers: [{
    title: String,
    authors: [String],
    year: Number,
    abstract: String,
    url: String,
    citationCount: Number,
    source: String,
  }],
  errorMessage: {
    type: String,
  },
});

export default mongoose.model('Paper', paperSchema);
