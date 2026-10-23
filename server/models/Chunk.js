import mongoose from 'mongoose';

const chunkSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  paperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paper',
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  embedding: [{
    type: Number,
  }],
  pageNumber: {
    type: Number,
  },
  chunkIndex: {
    type: Number,
  },
  tokenCount: {
    type: Number,
  },
}, { timestamps: true });

chunkSchema.index({ paperId: 1, chunkIndex: 1 });
chunkSchema.index({ userId: 1 });

export default mongoose.model('Chunk', chunkSchema);
