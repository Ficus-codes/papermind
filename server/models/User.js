import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  age: {
    type: Number,
    min: 18,
    max: 120,
  },
  affiliation: {
    type: String,
    trim: true,
  },
  academicRole: {
    type: String,
    trim: true,
  },
  researchField: {
    type: String,
    trim: true,
  },
  orcid: {
    type: String,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 300,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('User', userSchema);
