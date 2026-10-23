import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Paper from '../models/Paper.js';
import Chunk from '../models/Chunk.js';
import { chunkPages } from '../services/chunkService.js';
import { generateEmbeddings, generateSingleEmbedding } from '../services/embeddingService.js';
import { searchChunks } from '../services/vectorSearchService.js';

async function main() {
  console.log('--- Phase 3 Milestone Verification ---');

  if (!process.env.MONGO_URI) {
    console.error('Error: MONGO_URI is not defined in server/.env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected to MongoDB database: ${mongoose.connection.name}`);

  // 1. Find a paper with pages
  const paper = await Paper.findOne({ 'pages.0': { $exists: true } });
  if (!paper) {
    console.log('No paper with extracted pages found in database. Upload a paper first.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found paper: "${paper.title}" (ID: ${paper._id}) with ${paper.pages.length} pages.`);

  // 2. Run Chunking
  console.log('\n[Step 1] Chunking paper text (~500 tokens, 50 overlap)...');
  const chunks = chunkPages(paper.pages, { maxTokens: 500, overlapTokens: 50 });
  console.log(`Generated ${chunks.length} chunks.`);
  console.log(`Sample Chunk #0 (Page ${chunks[0].pageNumber}, ~${chunks[0].tokenCount} tokens):`);
  console.log(`"${chunks[0].text.slice(0, 150)}..."`);

  // 3. Generate Embeddings
  console.log('\n[Step 2] Generating vector embeddings (1536 dims)...');
  const apiKey = process.env.OPENAI_API_KEY;
  const hasRealKey = apiKey && !apiKey.includes('your_openai_api_key');

  if (!hasRealKey && process.env.MOCK_EMBEDDINGS !== 'true') {
    console.log('Notice: OPENAI_API_KEY is not configured yet. Enabling mock embeddings for milestone test.');
    process.env.MOCK_EMBEDDINGS = 'true';
  }

  const chunkTexts = chunks.map(c => c.text);
  const embeddings = await generateEmbeddings(chunkTexts);
  console.log(`Successfully generated ${embeddings.length} vectors of dimension ${embeddings[0].length}.`);

  // 4. Save to Chunk Collection
  console.log('\n[Step 3] Storing chunks in MongoDB collection "chunks"...');
  await Chunk.deleteMany({ paperId: paper._id });

  const chunkDocs = chunks.map((chunk, index) => ({
    userId: paper.userId,
    paperId: paper._id,
    text: chunk.text,
    pageNumber: chunk.pageNumber,
    chunkIndex: chunk.chunkIndex,
    tokenCount: chunk.tokenCount,
    embedding: embeddings[index],
  }));

  await Chunk.insertMany(chunkDocs);
  console.log(`Saved ${chunkDocs.length} chunks to collection "chunks".`);

  await Paper.findByIdAndUpdate(paper._id, {
    status: 'ready',
    chunkCount: chunkDocs.length,
    errorMessage: null,
  });

  // 5. Test Vector Search Retrieval
  const testQuery = 'neural networks and artificial intelligence in consciousness';
  console.log(`\n[Step 4] Running test vector search query: "${testQuery}"...`);

  const queryVector = await generateSingleEmbedding(testQuery);
  const searchResults = await searchChunks({
    queryVector,
    paperId: paper._id,
    limit: 3,
  });

  console.log(`\nTop ${searchResults.length} Retrieved Chunks (Method: ${searchResults[0]?.method}):`);
  searchResults.forEach((result, idx) => {
    console.log(`\n[Match #${idx + 1}] (Score: ${result.score.toFixed(4)}) - Page ${result.pageNumber}, Chunk #${result.chunkIndex}`);
    console.log(`Excerpt: "${result.text.slice(0, 200)}..."`);
  });

  console.log('\n✅ Phase 3 Milestone verification completed successfully!');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Milestone test failed:', err);
  process.exit(1);
});
