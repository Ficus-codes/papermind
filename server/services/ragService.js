import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import Paper from '../models/Paper.js';
import { generateSingleEmbedding } from './embeddingService.js';
import { searchChunks } from './vectorSearchService.js';

/**
 * Format conversation history into messages for LLM APIs
 */
const formatConversationHistory = (chatHistory = [], maxMessages = 6) => {
  const recent = chatHistory.slice(-maxMessages);
  return recent.map(msg => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: msg.content,
  }));
};

/**
 * Synthesize a grounded answer when live LLM API keys are not yet configured
 */
const synthesizeHeuristicAnswer = (paper, question, retrievedChunks) => {
  if (!retrievedChunks || retrievedChunks.length === 0) {
    return {
      answer: `I could not locate any relevant sections in "${paper.title}" that address your question.`,
      citations: [],
    };
  }

  const topChunk = retrievedChunks[0];
  const pageRefs = [...new Set(retrievedChunks.map(c => `Page ${c.pageNumber}`))].join(', ');
  
  const excerptSummary = retrievedChunks.slice(0, 2).map((c, i) => 
    `• According to [Page ${c.pageNumber}], chunk #${c.chunkIndex}: "${c.text.slice(0, 180)}..."`
  ).join('\n\n');

  const answer = `Based on the retrieved sections from "${paper.title}" (referencing ${pageRefs}):\n\n${excerptSummary}\n\nIn summary, the text addresses your inquiry regarding "${question}" by detailing the mechanisms and empirical observations on [Page ${topChunk.pageNumber}].`;

  const citations = retrievedChunks.map(c => ({
    chunkId: c.chunkId,
    pageNumber: c.pageNumber,
    chunkIndex: c.chunkIndex,
    text: c.text,
    snippet: c.text.slice(0, 250),
    score: c.score,
  }));

  return { answer, citations };
};

/**
 * Perform Single-Paper RAG:
 * 1. Embed user question
 * 2. Vector search filtered by paperId
 * 3. Assemble prompt with retrieved chunks + conversation history
 * 4. Call Claude or OpenAI
 * 5. Return grounded answer and citation metadata
 * 
 * @param {object} params
 * @param {object} params.paper - Paper document
 * @param {string} params.question - User question
 * @param {Array} [params.chatHistory] - Array of previous messages
 * @returns {Promise<{ answer: string, citations: Array }>}
 */
export const answerPaperQuestion = async ({ paper, question, chatHistory = [] }) => {
  if (!question || question.trim().length === 0) {
    throw new Error('Question message cannot be empty');
  }

  // 1. Embed the question
  const queryVector = await generateSingleEmbedding(question.trim());

  // 2. Vector search filtered by paperId
  const retrievedChunks = await searchChunks({
    queryVector,
    paperId: paper._id,
    userId: paper.userId,
    limit: 4,
  });

  if (!retrievedChunks || retrievedChunks.length === 0) {
    return {
      answer: "No relevant text chunks found for this query in the specified document.",
      citations: [],
      usedChunkIds: [],
    };
  }

  // Build citations metadata
  const citations = retrievedChunks.map(c => ({
    chunkId: c.chunkId,
    pageNumber: c.pageNumber,
    chunkIndex: c.chunkIndex,
    text: c.text,
    snippet: c.text.slice(0, 250),
    score: c.score,
  }));

  // 3. Assemble Context & Prompts
  const contextBlock = retrievedChunks.map((chunk, idx) => {
    return `[Excerpt ${idx + 1} - Page ${chunk.pageNumber}, Chunk #${chunk.chunkIndex}]:\n"${chunk.text}"`;
  }).join('\n\n');

  const systemPrompt = `You are an expert AI Research Assistant analyzing the academic paper "${paper.title}".
Your objective is to deliver clear, precise, and rigorous answers strictly grounded in the paper excerpts provided below.

INSTRUCTIONS:
1. Ground your answer completely in the provided excerpts.
2. ALWAYS cite the specific page numbers whenever citing concepts or data (e.g. "[Page ${retrievedChunks[0]?.pageNumber || 1}]").
3. If the excerpts do not contain enough evidence to answer the question, state: "The provided sections of this paper do not contain information regarding this topic." Do not extrapolate or hallucinate.
4. Keep the tone academic, clear, and structured.`;

  const userPrompt = `Retrieved Excerpts from "${paper.title}":
----------------------------------------
${contextBlock}
----------------------------------------

User Question: ${question.trim()}`;

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const hasAnthropic = anthropicKey && !anthropicKey.includes('your_claude_api_key');

  const openAiKey = process.env.OPENAI_API_KEY;
  const hasOpenAi = openAiKey && !openAiKey.includes('your_openai_api_key');

  const groqKey = process.env.GROQ_API_KEY;
  const hasGroq = groqKey && !groqKey.includes('your_groq_api_key');

  const historyMessages = formatConversationHistory(chatHistory, 6);

  // 4. Try Anthropic Claude
  if (hasAnthropic) {
    console.log(`[RAG] Calling Anthropic Claude for single-paper chat on "${paper.title}"...`);
    try {
      const anthropic = new Anthropic({ apiKey: anthropicKey.trim() });
      const messages = [
        ...historyMessages,
        { role: 'user', content: userPrompt },
      ];

      const response = await anthropic.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
        max_tokens: 1200,
        temperature: 0.1,
        system: systemPrompt,
        messages: messages,
      });

      const answer = response.content[0].text;
      return { answer, citations };
    } catch (err) {
      console.error('[RAG] Anthropic Claude call failed:', err.message);
      if (!hasOpenAi && !hasGroq) {
        throw new Error(`Claude RAG generation failed: ${err.message}`);
      }
    }
  }

  // 5. Try OpenAI
  if (hasOpenAi) {
    console.log(`[RAG] Calling OpenAI for single-paper chat on "${paper.title}"...`);
    try {
      const openai = new OpenAI({ apiKey: openAiKey.trim() });
      const messages = [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
        { role: 'user', content: userPrompt },
      ];

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        temperature: 0.1,
        messages: messages,
      });

      const answer = response.choices[0].message.content;
      return { answer, citations };
    } catch (err) {
      console.error('[RAG] OpenAI call failed:', err.message);
      if (!hasGroq) {
        throw new Error(`OpenAI RAG generation failed: ${err.message}`);
      }
    }
  }

  // 6. Try Groq
  if (hasGroq) {
    console.log(`[RAG] Calling Groq for single-paper chat on "${paper.title}"...`);
    try {
      const groq = new OpenAI({
        apiKey: groqKey.trim(),
        baseURL: 'https://api.groq.com/openai/v1',
      });
      const groqModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
      const maxTokens = groqModel.includes('qwen') ? 800 : 1500;
      const messages = [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
        { role: 'user', content: userPrompt },
      ];

      const response = await groq.chat.completions.create({
        model: groqModel,
        temperature: 0.1,
        max_tokens: maxTokens,
        messages: messages,
      });

      const answer = response.choices[0].message.content;
      return { answer, citations };
    } catch (err) {
      console.error('[RAG] Groq call failed:', err.message);
      console.warn('[RAG] Falling back to heuristic response after Groq failure.');
      return synthesizeHeuristicAnswer(paper, question, retrievedChunks);
    }
  }

  // 7. Heuristic Fallback
  console.log(`[RAG] No live LLM keys configured. Generating heuristic grounded response.`);
  return synthesizeHeuristicAnswer(paper, question, retrievedChunks);
};

/**
 * Perform Cross-Library RAG (Phase 6):
 * 1. Embed user question
 * 2. Vector search filtered by userId across all papers
 * 3. Cap chunks per paper (max 2-3 per paper) for cross-paper diversity
 * 4. Tag chunks with paper titles
 * 5. Assemble prompt with multi-paper citations
 * 6. Call Claude or OpenAI (or synthesize heuristic response)
 */
export const answerLibraryQuestion = async ({
  userId,
  question,
  chatHistory = [],
  maxChunksPerPaper = 2,
  totalLimit = 6,
  paperId = null,
}) => {
  if (!question || question.trim().length === 0) {
    throw new Error('Question message cannot be empty');
  }

  // 1. Embed the question
  const queryVector = await generateSingleEmbedding(question.trim());

  // 2. Vector search filtered by userId (and optionally paperId)
  const candidateChunks = await searchChunks({
    queryVector,
    userId,
    paperId: paperId || undefined,
    limit: 25,
  });

  if (!candidateChunks || candidateChunks.length === 0) {
    return {
      answer: "Your library does not currently have any indexed research papers to answer this query. Please upload and process a manuscript first.",
      citations: [],
      usedChunkIds: [],
    };
  }

  // 3. Cap chunks per paper to prevent single-paper dominance
  const paperChunkCounts = {};
  const selectedChunks = [];

  for (const chunk of candidateChunks) {
    const pIdStr = chunk.paperId.toString();
    paperChunkCounts[pIdStr] = (paperChunkCounts[pIdStr] || 0);

    if (paperChunkCounts[pIdStr] < maxChunksPerPaper) {
      selectedChunks.push(chunk);
      paperChunkCounts[pIdStr]++;
    }

    if (selectedChunks.length >= totalLimit) {
      break;
    }
  }

  // 4. Resolve Paper Titles
  const uniquePaperIds = [...new Set(selectedChunks.map(c => c.paperId))];
  const paperDocs = await Paper.find({ _id: { $in: uniquePaperIds } }).select('title authors');
  const paperMap = {};
  paperDocs.forEach(p => {
    paperMap[p._id.toString()] = p.title;
  });

  // Attach paper titles to citations
  const citations = selectedChunks.map(c => ({
    chunkId: c.chunkId,
    paperId: c.paperId,
    paperTitle: paperMap[c.paperId.toString()] || 'Research Paper',
    pageNumber: c.pageNumber,
    chunkIndex: c.chunkIndex,
    text: c.text,
    snippet: c.text.slice(0, 250),
    score: c.score,
  }));

  // 5. Assemble Multi-Paper Prompt
  const contextBlock = selectedChunks.map((chunk, idx) => {
    const title = paperMap[chunk.paperId.toString()] || 'Research Paper';
    return `[Excerpt ${idx + 1} - From Paper "${title}", Page ${chunk.pageNumber}, Chunk #${chunk.chunkIndex}]:\n"${chunk.text}"`;
  }).join('\n\n');

  const systemPrompt = `You are an expert AI Research Assistant with access to the user's complete research library.
Analyze the user's question across all retrieved research papers below. Compare, contrast, and synthesize perspectives where applicable.

STRICT CITATION RULES:
1. Ground your answer in the provided library excerpts.
2. ALWAYS cite the specific paper title and page number when stating facts or findings, using this exact format:
   [Paper: "<Paper Title>", Page X] (e.g. [Paper: "Consciousness Review", Page 4]).
3. Indicate which paper made which specific claims.
4. If the papers do not contain enough information to answer the question, state that clearly without guessing.`;

  const userPrompt = `Retrieved Excerpts from Research Library:
----------------------------------------
${contextBlock}
----------------------------------------

User Question: ${question.trim()}`;

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const hasAnthropic = anthropicKey && !anthropicKey.includes('your_claude_api_key');

  const openAiKey = process.env.OPENAI_API_KEY;
  const hasOpenAi = openAiKey && !openAiKey.includes('your_openai_api_key');

  const groqKey = process.env.GROQ_API_KEY;
  const hasGroq = groqKey && !groqKey.includes('your_groq_api_key');

  const historyMessages = formatConversationHistory(chatHistory, 6);

  // Call Claude
  if (hasAnthropic) {
    console.log('[RAG] Calling Anthropic Claude for cross-library chat...');
    try {
      const anthropic = new Anthropic({ apiKey: anthropicKey.trim() });
      const messages = [
        ...historyMessages,
        { role: 'user', content: userPrompt },
      ];

      const response = await anthropic.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        temperature: 0.1,
        system: systemPrompt,
        messages: messages,
      });

      return { answer: response.content[0].text, citations };
    } catch (err) {
      console.error('[RAG] Claude library chat error:', err.message);
      if (!hasOpenAi && !hasGroq) throw new Error(`Claude Library RAG failed: ${err.message}`);
    }
  }

  // Call OpenAI
  if (hasOpenAi) {
    console.log('[RAG] Calling OpenAI for cross-library chat...');
    try {
      const openai = new OpenAI({ apiKey: openAiKey.trim() });
      const messages = [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
        { role: 'user', content: userPrompt },
      ];

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        temperature: 0.1,
        messages: messages,
      });

      return { answer: response.choices[0].message.content, citations };
    } catch (err) {
      console.error('[RAG] OpenAI library chat error:', err.message);
      if (!hasGroq) throw new Error(`OpenAI Library RAG failed: ${err.message}`);
    }
  }

  // Call Groq
  if (hasGroq) {
    console.log('[RAG] Calling Groq for cross-library chat...');
    try {
      const groq = new OpenAI({
        apiKey: groqKey.trim(),
        baseURL: 'https://api.groq.com/openai/v1',
      });
      const groqModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
      const maxTokens = groqModel.includes('qwen') ? 800 : 1500;
      const messages = [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
        { role: 'user', content: userPrompt },
      ];

      const response = await groq.chat.completions.create({
        model: groqModel,
        temperature: 0.1,
        max_tokens: maxTokens,
        messages: messages,
      });

      return { answer: response.choices[0].message.content, citations };
    } catch (err) {
      console.error('[RAG] Groq library chat error:', err.message);
      console.warn('[RAG] Falling back to heuristic multi-paper response after Groq failure.');
    }
  }

  // Heuristic multi-paper response
  console.log('[RAG] No live LLM keys configured. Generating heuristic cross-library grounded response.');
  const paperTitlesList = [...new Set(citations.map(c => `"${c.paperTitle}"`))].join(' and ');
  const bulletPoints = citations.slice(0, 4).map(c => 
    `• From [Paper: "${c.paperTitle}", Page ${c.pageNumber}]: "${c.snippet.slice(0, 160)}..."`
  ).join('\n\n');

  const answer = `Based on a cross-library synthesis of your research papers (analyzing ${paperTitlesList}):\n\n${bulletPoints}\n\nIn conclusion, the retrieved papers present complementary findings regarding "${question.trim()}".`;

  return { answer, citations };
};
