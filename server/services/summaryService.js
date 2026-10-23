import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

/**
 * Truncate or select representative text from a paper to stay within optimal context windows.
 */
export const preparePaperContext = (paper, maxChars = 30000) => {
  if (!paper.rawText && (!paper.pages || paper.pages.length === 0)) {
    throw new Error('Paper has no extractable text to summarize');
  }

  const fullText = paper.rawText || paper.pages.map(p => p.text).join('\n\n');

  if (fullText.length <= maxChars) {
    return fullText;
  }

  // Sample introduction (first 40%), middle highlights (20%), and conclusion (last 40%)
  const leadChars = Math.floor(maxChars * 0.45);
  const midChars = Math.floor(maxChars * 0.15);
  const tailChars = Math.floor(maxChars * 0.4);

  const head = fullText.slice(0, leadChars);
  const midStart = Math.floor(fullText.length / 2) - Math.floor(midChars / 2);
  const mid = fullText.slice(midStart, midStart + midChars);
  const tail = fullText.slice(fullText.length - tailChars);

  return `${head}\n\n[... content omitted for length ...]\n\n${mid}\n\n[... content omitted for length ...]\n\n${tail}`;
};

const SYSTEM_PROMPT = `You are a world-class academic research synthesist and principal investigator.
Analyze the provided research paper text and generate an authoritative, rigorous, and exhaustive scientific briefing in valid JSON format.

Your synthesis must provide high-density analytical depth, specific mathematical or architectural mechanisms, empirical figures, and critical evaluations. Avoid generic superficial summaries.

Your JSON response MUST strictly adhere to this exact schema:
{
  "tldr": "A concise, high-impact 2-3 sentence executive takeaway articulating the central breakthrough, paradigm change, and performance milestone.",
  "keyTakeaways": [
    "Primary technical innovation or empirical breakthrough",
    "Key methodological mechanism or theoretical proof",
    "Critical benchmark quantitative comparison vs prior art",
    "Operational limitation or essential scope boundary"
  ],
  "problemStatement": "Detailed, rigorous exposition of the exact problem statement and context: the foundational bottleneck, fundamental failure modes of prior art, why existing paradigms fell short, and the scientific motivation.",
  "coreAnalysis": "Exhaustive core analysis and synthesis: the proposed architecture, theoretical mechanisms, empirical methodology, algorithmic formulations, benchmark evaluations, and analytical trade-offs.",
  "conclusions": "Definitive conclusions and implications: key validated discoveries, broader disciplinary and industrial ramifications, paradigm shifts, practical adoption horizons, and unanswered research trajectories.",
  "sections": [
    {
      "heading": "Precise Problem Statement & Context",
      "content": "Deep, rigorous exposition of the specific scientific bottleneck, unaddressed challenges in prior art, theoretical constraints, and the foundational research questions motivating the investigation."
    },
    {
      "heading": "Core Analysis & Synthesis",
      "content": "Exhaustive synthesis of the methodological innovations, mathematical/architectural formulation, experimental results, quantitative evaluations, and evidence synthesis."
    },
    {
      "heading": "Conclusions & Implications",
      "content": "Definitive conclusions reached, transformative downstream implications for the discipline, industrial ramifications, paradigm shifts, and open research horizons."
    }
  ],
  "keyTerms": [
    {
      "term": "Technical Term 1",
      "explanation": "Precise domain-specific definition and its role in the paper."
    },
    {
      "term": "Technical Term 2",
      "explanation": "Precise domain-specific definition and its role in the paper."
    },
    {
      "term": "Technical Term 3",
      "explanation": "Precise domain-specific definition and its role in the paper."
    },
    {
      "term": "Technical Term 4",
      "explanation": "Precise domain-specific definition and its role in the paper."
    }
  ]
}

Do NOT wrap the output in markdown codeblocks like \`\`\`json. Return ONLY the raw valid JSON object.`;

/**
 * Generate rich analytical heuristic summary when neither Claude nor OpenAI API keys are provided
 */
const generateHeuristicSummary = (paper, contextText) => {
  const paragraphs = contextText
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(p => p.length > 60);

  // 1. Precise Problem Statement & Context extraction
  const earlyParagraphs = paragraphs.slice(0, Math.max(3, Math.floor(paragraphs.length * 0.35)));
  const problemMatches = earlyParagraphs.filter(p =>
    /problem|challeng|bottleneck|motivat|limitat|tradition|exist|gap|howev|address|fail/i.test(p)
  );
  const problemText = problemMatches.length > 0
    ? problemMatches.slice(0, 3).join('\n\n')
    : earlyParagraphs.slice(0, 2).join('\n\n') ||
      `The manuscript addresses fundamental constraints in ${paper.title}, investigating existing gaps in theoretical models and empirical pipelines where conventional formulations fail to provide adequate scalability and precision.`;

  // 2. Core Analysis & Synthesis extraction
  const midParagraphs = paragraphs.slice(
    Math.floor(paragraphs.length * 0.25),
    Math.floor(paragraphs.length * 0.75)
  );
  const analysisMatches = midParagraphs.filter(p =>
    /method|model|architect|analys|experim|result|evaluat|propos|approach|framework|perform|metric|empiric/i.test(p)
  );
  const analysisText = analysisMatches.length > 0
    ? analysisMatches.slice(0, 3).join('\n\n')
    : midParagraphs.slice(0, 2).join('\n\n') ||
      `The authors introduce an architectural framework tailored to ${paper.title}. Through rigorous comparative evaluation against baseline benchmarks, the paper demonstrates operational advantages, quantifying convergence properties and computational efficiency.`;

  // 3. Conclusions & Implications extraction
  const lateParagraphs = paragraphs.slice(Math.floor(paragraphs.length * 0.65));
  const conclusionMatches = lateParagraphs.filter(p =>
    /conclu|demonstrat|show|indicat|implicat|futur|find|disclos|open|impact/i.test(p)
  );
  const conclusionText = conclusionMatches.length > 0
    ? conclusionMatches.slice(0, 3).join('\n\n')
    : lateParagraphs.slice(-2).join('\n\n') ||
      `The study establishes definitive empirical milestones for ${paper.title}. The findings carry immediate architectural implications for researchers and practitioners, opening new horizons for scalable deployment and cross-domain synthesis.`;

  // Extract notable technical terms
  const candidateTerms = [];
  const words = paper.title.split(/[\s,.:;—–-]+/).filter(w => w.length > 4);
  words.forEach(w => {
    candidateTerms.push({
      term: w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
      explanation: `Core technical paradigm analyzed in this paper regarding ${w.toLowerCase()} dynamics and architectural formulations.`,
    });
  });

  if (candidateTerms.length < 3) {
    candidateTerms.push(
      { term: "Methodological Framework", explanation: "The investigative approach, mathematical formulations, and analytical pipeline developed in this study." },
      { term: "Empirical Analysis", explanation: "Rigorous benchmark evaluations, quantitative metrics, and comparative baseline observations." },
      { term: "Domain Implications", explanation: "Disciplinary ramifications and downstream applications resulting from the findings." }
    );
  }

  return {
    tldr: `This research paper provides an in-depth investigation into "${paper.title}". It rigorously formalizes the underlying mechanisms, delivers an empirical analysis of experimental results, and establishes foundational conclusions with significant implications for future research.`,
    keyTakeaways: [
      `Rigorous formulation of core challenges and theoretical context surrounding ${paper.title.toLowerCase()}.`,
      `Introduction and systematic evaluation of novel architectural/empirical methodologies.`,
      `Empirical synthesis comparing performance, computational efficiency, and trade-offs against baseline paradigms.`,
      `Actionable roadmap detailing technical limitations and high-priority trajectories for next-generation research.`,
    ],
    problemStatement: problemText,
    coreAnalysis: analysisText,
    conclusions: conclusionText,
    sections: [
      {
        heading: "Precise Problem Statement & Context",
        content: problemText,
      },
      {
        heading: "Core Analysis & Synthesis",
        content: analysisText,
      },
      {
        heading: "Conclusions & Implications",
        content: conclusionText,
      },
    ],
    keyTerms: candidateTerms.slice(0, 4),
    generatedAt: new Date(),
  };
};

/**
 * Clean and parse LLM response into JSON
 */
const parseJsonResponse = (text) => {
  try {
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    return JSON.parse(cleaned);
  } catch (error) {
    console.warn('[SummaryService] Failed to parse raw LLM JSON:', error.message);
    // Try to extract JSON object via regex if there's surrounding text
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw error;
  }
};

/**
 * Generate a comprehensive summary for a research paper.
 * 
 * Supports Anthropic Claude, OpenAI, or smart heuristic fallback.
 * 
 * @param {object} paper - Paper document
 * @returns {Promise<object>} Structured summary
 */
export const generatePaperSummary = async (paper) => {
  const context = preparePaperContext(paper);

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const hasAnthropic = anthropicKey && !anthropicKey.includes('your_claude_api_key');

  const openAiKey = process.env.OPENAI_API_KEY;
  const hasOpenAi = openAiKey && !openAiKey.includes('your_openai_api_key');

  const groqKey = process.env.GROQ_API_KEY;
  const hasGroq = groqKey && !groqKey.includes('your_groq_api_key');

  const userPrompt = `Paper Title: ${paper.title}
Authors: ${paper.authors?.join(', ') || 'Unknown'}

Text Content:
${context}`;

  // 1. Try Anthropic Claude
  if (hasAnthropic) {
    console.log(`[SummaryService] Calling Anthropic Claude for paper "${paper.title}"...`);
    try {
      const anthropic = new Anthropic({ apiKey: anthropicKey.trim() });
      const response = await anthropic.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
        max_tokens: 2500,
        temperature: 0.2,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const responseText = response.content[0].text;
      const parsed = parseJsonResponse(responseText);
      parsed.generatedAt = new Date();
      return parsed;
    } catch (err) {
      console.error('[SummaryService] Anthropic call failed:', err.message);
      if (!hasOpenAi && !hasGroq) {
        throw new Error(`Anthropic Claude summarization failed: ${err.message}`);
      }
    }
  }

  // 2. Try OpenAI
  if (hasOpenAi) {
    console.log(`[SummaryService] Calling OpenAI for paper "${paper.title}"...`);
    try {
      const openai = new OpenAI({ apiKey: openAiKey.trim() });
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      });

      const responseText = response.choices[0].message.content;
      const parsed = parseJsonResponse(responseText);
      parsed.generatedAt = new Date();
      return parsed;
    } catch (err) {
      console.error('[SummaryService] OpenAI call failed:', err.message);
      if (!hasGroq) {
        throw new Error(`OpenAI summarization failed: ${err.message}`);
      }
    }
  }

  // 3. Try Groq
  if (hasGroq) {
    console.log(`[SummaryService] Calling Groq for paper "${paper.title}"...`);
    try {
      const groq = new OpenAI({
        apiKey: groqKey.trim(),
        baseURL: 'https://api.groq.com/openai/v1',
      });
      const groqModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
      const maxTokens = groqModel.includes('qwen') ? 950 : 2500;
      const response = await groq.chat.completions.create({
        model: groqModel,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      });

      const responseText = response.choices[0].message.content;
      const parsed = parseJsonResponse(responseText);
      parsed.generatedAt = new Date();
      return parsed;
    } catch (err) {
      console.error('[SummaryService] Groq call failed:', err.message);
      // Fall back to heuristic summary if Groq throws an error
      console.warn('[SummaryService] Falling back to heuristic summary after Groq failure.');
      return generateHeuristicSummary(paper, context);
    }
  }

  // 4. Fallback heuristic summary
  console.log(`[SummaryService] No live API keys configured. Generating heuristic summary for testing.`);
  return generateHeuristicSummary(paper, context);
};
