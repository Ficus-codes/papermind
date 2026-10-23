import mongoose from 'mongoose';
import Chunk from '../models/Chunk.js';

/**
 * Compute cosine similarity between two vectors
 */
export const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Perform vector search using MongoDB Atlas $vectorSearch aggregation stage.
 * Falls back to in-memory cosine similarity if Atlas search index is not yet provisioned.
 * 
 * @param {object} params
 * @param {number[]} params.queryVector - 1536-dim embedding vector
 * @param {string} [params.paperId] - Optional paper ID to filter by
 * @param {string} [params.userId] - Optional user ID to filter by
 * @param {number} [params.limit=5] - Number of top chunks to return
 * @returns {Promise<Array<{ chunkId: string, text: string, pageNumber: number, chunkIndex: number, score: number, method: string }>>}
 */
export const searchChunks = async ({ queryVector, paperId, userId, limit = 5 }) => {
  const filter = {};
  if (paperId) {
    filter.paperId = { $eq: new mongoose.Types.ObjectId(paperId) };
  }
  if (userId) {
    filter.userId = { $eq: new mongoose.Types.ObjectId(userId) };
  }

  // Attempt Atlas $vectorSearch first
  try {
    const pipeline = [
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: queryVector,
          numCandidates: Math.max(limit * 10, 50),
          limit: limit,
          filter: filter,
        },
      },
      {
        $project: {
          _id: 1,
          paperId: 1,
          pageNumber: 1,
          chunkIndex: 1,
          text: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ];

    const results = await Chunk.aggregate(pipeline);

    if (results && results.length > 0) {
      return results.map(r => ({
        chunkId: r._id,
        paperId: r.paperId,
        pageNumber: r.pageNumber,
        chunkIndex: r.chunkIndex,
        text: r.text,
        score: r.score,
        method: 'atlas-vectorSearch',
      }));
    }
  } catch (atlasError) {
    console.warn(
      `[VectorSearch] Atlas $vectorSearch not available or index 'vector_index' pending (${atlasError.message}). Using fallback vector ranking.`
    );
  }

  // Fallback: In-memory cosine similarity ranking
  const query = {};
  if (paperId) query.paperId = paperId;
  if (userId) query.userId = userId;

  const chunks = await Chunk.find(query).select('paperId text pageNumber chunkIndex embedding');

  const ranked = chunks
    .map(chunk => {
      const score = cosineSimilarity(queryVector, chunk.embedding);
      return {
        chunkId: chunk._id,
        paperId: chunk.paperId,
        pageNumber: chunk.pageNumber,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        score,
        method: 'in-memory-cosine',
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked;
};
