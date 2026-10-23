import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Paper from '../models/Paper.js';
import { answerPaperQuestion } from '../services/ragService.js';

async function main() {
  console.log('--- Phase 5: Single-Paper RAG Milestone Test ---');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB database:', mongoose.connection.name);

  const paper = await Paper.findOne({ status: 'ready', chunkCount: { $gt: 0 } });
  if (!paper) {
    console.error('No ready paper with chunks found.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Testing with Paper: "${paper.title}" (ID: ${paper._id}, Chunks: ${paper.chunkCount})`);

  const question = "What is the biological perspective on consciousness presented in the paper?";
  console.log(`\nUser Question: "${question}"`);
  console.log('Retrieving relevant chunks and generating grounded response...\n');

  const { answer, citations } = await answerPaperQuestion({
    paper,
    question,
    chatHistory: [],
  });

  console.log('=== AI RESPONSE ===');
  console.log(answer);
  console.log('===================\n');

  console.log(`Retrieved Citations (${citations.length}):`);
  citations.forEach((c, i) => {
    console.log(`[Citation #${i + 1}] Page ${c.pageNumber} • Chunk #${c.chunkIndex} (Similarity: ${c.score.toFixed(4)})`);
    console.log(`Excerpt: "${c.snippet.slice(0, 140)}..."\n`);
  });

  console.log('✅ Phase 5 Milestone Test passed successfully!');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
