import OpenAI from 'openai';

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 1536;

/**
 * Initialize OpenAI client lazily or validate configuration
 */
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_openai_api_key')) {
    return null;
  }

  return new OpenAI({ apiKey: apiKey.trim() });
};

/**
 * Generate a deterministic pseudo-random embedding vector for offline testing
 */
const generateMockEmbedding = (text, dimensions = EMBEDDING_DIMENSIONS) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  const vector = [];
  let sumSq = 0;
  for (let i = 0; i < dimensions; i++) {
    const val = Math.sin(hash + i);
    vector.push(val);
    sumSq += val * val;
  }

  // Normalize to unit length (cosine norm)
  const norm = Math.sqrt(sumSq);
  return vector.map(v => v / norm);
};

/**
 * Generate embeddings for an array of text chunks using OpenAI text-embedding-3-small
 * 
 * @param {string[]} texts - Array of chunk texts
 * @param {object} options - { batchSize: 50 }
 * @returns {Promise<number[][]>} Array of 1536-dimensional embedding vectors
 */
export const generateEmbeddings = async (texts, options = {}) => {
  if (!texts || texts.length === 0) {
    return [];
  }

  const client = getOpenAIClient();

  if (!client || process.env.MOCK_EMBEDDINGS === 'true') {
    return texts.map(t => generateMockEmbedding(t));
  }

  const allEmbeddings = [];
  const batchSize = options.batchSize || 50;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    try {
      const response = await client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch,
      });

      // Sort by index to maintain correct mapping
      const sorted = response.data.sort((a, b) => a.index - b.index);
      for (const item of sorted) {
        allEmbeddings.push(item.embedding);
      }
    } catch (error) {
      console.error(`[EmbeddingService] Batch ${i} - ${i + batch.length} error:`, error.message);
      throw new Error(`OpenAI Embedding generation failed: ${error.message}`);
    }
  }

  return allEmbeddings;
};

/**
 * Generate a single embedding vector (useful for user queries)
 * 
 * @param {string} text - Query text
 * @returns {Promise<number[]>} 1536-dimensional embedding vector
 */
export const generateSingleEmbedding = async (text) => {
  if (!text || text.trim().length === 0) {
    throw new Error('Text is required to generate an embedding');
  }

  const client = getOpenAIClient();
  if (!client || process.env.MOCK_EMBEDDINGS === 'true') {
    return generateMockEmbedding(text);
  }
  try {
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.trim(),
    });

    return response.data[0].embedding;
  } catch (error) {
    throw new Error(`OpenAI Embedding generation failed: ${error.message}`);
  }
};
