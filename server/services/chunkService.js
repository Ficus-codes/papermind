/**
 * Chunking Service for Research Papers
 * 
 * Splits paper text into ~500-token chunks with ~50-token overlap,
 * preserving page numbers for citation and retrieval.
 */

// Approximate token count: 1 token ≈ 4 characters or ~0.75 words in English
export const estimateTokens = (text) => {
  if (!text) return 0;
  const words = text.trim().split(/\s+/).filter(Boolean);
  return Math.ceil(words.length * 1.3);
};

/**
 * Splits text into sentences/segments while preserving punctuation
 */
const splitIntoSentences = (text) => {
  if (!text) return [];
  // Split on sentence boundaries (period, question mark, exclamation mark followed by space or newline)
  const segments = text.match(/[^.!?\n]+(?:[.!?]+|\n+|$)/g) || [text];
  return segments.map(s => s.trim()).filter(s => s.length > 0);
};

/**
 * Chunks a single string into chunks of approximately maxTokens with overlapTokens.
 * 
 * @param {string} text - Text to chunk
 * @param {number} pageNumber - Page number of the text
 * @param {object} options - { maxTokens: 500, overlapTokens: 50 }
 * @returns {Array<{ text: string, pageNumber: number, tokenCount: number }>}
 */
export const chunkText = (text, pageNumber = 1, options = {}) => {
  const { maxTokens = 500, overlapTokens = 50 } = options;

  if (!text || text.trim().length === 0) {
    return [];
  }

  const cleanText = text.replace(/\r\n/g, '\n').trim();
  const sentences = splitIntoSentences(cleanText);

  if (sentences.length === 0) {
    return [];
  }

  const chunks = [];
  let currentSentences = [];
  let currentTokenCount = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const sentenceTokens = estimateTokens(sentence);

    // If single sentence exceeds maxTokens, split it into word-based chunks
    if (sentenceTokens > maxTokens) {
      if (currentSentences.length > 0) {
        const chunkContent = currentSentences.join(' ');
        chunks.push({
          text: chunkContent,
          pageNumber,
          tokenCount: estimateTokens(chunkContent),
        });
        currentSentences = [];
        currentTokenCount = 0;
      }

      const words = sentence.split(/\s+/).filter(Boolean);
      const wordsPerChunk = Math.floor(maxTokens / 1.3);
      const overlapWords = Math.floor(overlapTokens / 1.3);

      for (let w = 0; w < words.length; w += (wordsPerChunk - overlapWords)) {
        const slice = words.slice(w, w + wordsPerChunk).join(' ');
        if (slice.trim().length > 0) {
          chunks.push({
            text: slice,
            pageNumber,
            tokenCount: estimateTokens(slice),
          });
        }
        if (w + wordsPerChunk >= words.length) break;
      }
      continue;
    }

    // Check if adding this sentence exceeds maxTokens
    if (currentTokenCount + sentenceTokens > maxTokens && currentSentences.length > 0) {
      const chunkContent = currentSentences.join(' ');
      chunks.push({
        text: chunkContent,
        pageNumber,
        tokenCount: currentTokenCount,
      });

      // Retain sentences at the end for overlap
      const overlapList = [];
      let overlapCount = 0;

      for (let j = currentSentences.length - 1; j >= 0; j--) {
        const sTokens = estimateTokens(currentSentences[j]);
        if (overlapCount + sTokens <= overlapTokens) {
          overlapList.unshift(currentSentences[j]);
          overlapCount += sTokens;
        } else {
          break;
        }
      }

      currentSentences = [...overlapList, sentence];
      currentTokenCount = overlapCount + sentenceTokens;
    } else {
      currentSentences.push(sentence);
      currentTokenCount += sentenceTokens;
    }
  }

  // Push remaining sentences
  if (currentSentences.length > 0) {
    const chunkContent = currentSentences.join(' ');
    chunks.push({
      text: chunkContent,
      pageNumber,
      tokenCount: currentTokenCount,
    });
  }

  return chunks;
};

/**
 * Chunks an array of pages, preserving page numbers for each chunk.
 * 
 * @param {Array<{ pageNumber: number, text: string }>} pages 
 * @param {object} options - { maxTokens: 500, overlapTokens: 50 }
 * @returns {Array<{ text: string, pageNumber: number, tokenCount: number, chunkIndex: number }>}
 */
export const chunkPages = (pages, options = {}) => {
  if (!pages || !Array.isArray(pages) || pages.length === 0) {
    return [];
  }

  const allChunks = [];
  let chunkIndex = 0;

  for (const page of pages) {
    if (!page.text || page.text.trim().length < 20) {
      continue; // Skip blank or negligible header/footer pages
    }

    const pageChunks = chunkText(page.text, page.pageNumber, options);

    for (const chunk of pageChunks) {
      allChunks.push({
        ...chunk,
        chunkIndex: chunkIndex++,
      });
    }
  }

  return allChunks;
};
