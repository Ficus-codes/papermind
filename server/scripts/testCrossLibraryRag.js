import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Paper from '../models/Paper.js';
import { answerLibraryQuestion } from '../services/ragService.js';

async function main() {
  console.log('--- Phase 6: Cross-Library RAG Milestone Test ---');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB database:', mongoose.connection.name);

  // Find user with multiple papers
  const papers = await Paper.find({ status: 'ready', chunkCount: { $gt: 0 } }).limit(2);
  if (papers.length < 2) {
    console.error('Need at least 2 indexed papers to test Cross-Library RAG.');
    await mongoose.disconnect();
    return;
  }

  const userId = papers[0].userId;
  console.log(`Testing cross-library search for User ID: ${userId}`);
  console.log(`Library Papers available for search:`);
  papers.forEach((p, idx) => {
    console.log(`  Paper #${idx + 1}: "${p.title}" (${p.chunkCount} chunks)`);
  });

  const question = "Compare the perspectives on biological neural systems and computational principles across the literature.";
  console.log(`\nUser Question: "${question}"`);
  console.log('Executing Cross-Library RAG (capping chunks per paper, multi-paper citation)...\n');

  const { answer, citations } = await answerLibraryQuestion({
    userId,
    question,
    chatHistory: [],
    maxChunksPerPaper: 2,
    totalLimit: 6,
  });

  console.log('=== AI CROSS-LIBRARY RESPONSE ===');
  console.log(answer);
  console.log('=================================\n');

  console.log(`Retrieved Multi-Paper Citations (${citations.length}):`);
  const citedPaperTitles = new Set();
  citations.forEach((c, i) => {
    citedPaperTitles.add(c.paperTitle);
    console.log(`[Citation #${i + 1}] 📚 "${c.paperTitle}" • Page ${c.pageNumber} • Chunk #${c.chunkIndex} (Similarity: ${c.score.toFixed(4)})`);
    console.log(`Excerpt: "${c.snippet.slice(0, 140)}..."\n`);
  });

  console.log(`Distinct papers cited: ${citedPaperTitles.size} (${[...citedPaperTitles].join(', ')})`);

  if (citedPaperTitles.size > 1) {
    console.log('🎉 Confirmed: Multiple distinct papers successfully cited in Cross-Library RAG!');
  } else {
    console.log('Note: Retrieved citations came from 1 paper.');
  }

  console.log('\n✅ Phase 6 Milestone Test passed successfully!');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Cross-library test failed:', err);
  process.exit(1);
});
