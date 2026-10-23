import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
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
  content: {
    type: String,
    required: true,
  },
  tags: [{
    type: String,
  }],
}, { timestamps: true });

export default mongoose.model('Note', noteSchema);
