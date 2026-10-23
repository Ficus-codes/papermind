import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

// Helper to generate valid PDF buffer with custom text content
function createPdfBuffer(textContent) {
  const stream = `BT /F1 12 Tf 72 712 Td (${textContent.replace(/\(/g, '\\(').replace(/\)/g, '\\)')}) Tj ET`;
  const streamLen = Buffer.byteLength(stream);
  return Buffer.from(
`%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj
4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
5 0 obj << /Length ${streamLen} >> stream
${stream}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000229 00000 n 
0000000298 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
${370 + streamLen}
%%EOF`
  );
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${testName} ${details ? `(${details})` : ''}`);
  } else {
    failed++;
    console.log(`  \x1b[31m✖ FAIL\x1b[0m: ${testName} ${details ? `(${details})` : ''}`);
  }
}

async function runSuite() {
  console.log('\n=============================================================');
  console.log('  AI RESEARCH ASSISTANT (PAPERMIND) — PHASE 9 TEST SUITE');
  console.log('=============================================================\n');

  const testUser = {
    name: 'Dr. Turing QA',
    email: `test_qa_${Date.now()}@university.edu`,
    password: 'password123',
  };
  let authToken = '';
  let validPaperId = '';

  // -------------------------------------------------------------
  // MODULE 1: AUTHENTICATION & EDGE CASES
  // -------------------------------------------------------------
  console.log('\n\x1b[1m[MODULE 1] Authentication & Access Control Tests\x1b[0m');

  // 1.1 Register valid user
  try {
    const res = await axios.post(`${BASE_URL}/auth/register`, testUser);
    assert(res.status === 201 && res.data.userId, '[1.1] Register valid researcher', `User ID: ${res.data.userId}`);
  } catch (err) {
    assert(false, '[1.1] Register valid researcher', err.message);
  }

  // 1.2 Duplicate email registration (Expect 409)
  try {
    await axios.post(`${BASE_URL}/auth/register`, testUser);
    assert(false, '[1.2] Reject duplicate email with 409');
  } catch (err) {
    assert(err.response?.status === 409, '[1.2] Reject duplicate email with 409', `Status: ${err.response?.status}`);
  }

  // 1.3 Invalid email format (Expect 400)
  try {
    await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Bad Email',
      email: 'not-an-email',
      password: 'password123',
    });
    assert(false, '[1.3] Reject invalid email format with 400');
  } catch (err) {
    assert(err.response?.status === 400, '[1.3] Reject invalid email format with 400', `Message: "${err.response?.data?.message}"`);
  }

  // 1.4 Short password < 6 chars (Expect 400)
  try {
    await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Short Pass',
      email: `valid_${Date.now()}@edu.org`,
      password: '123',
    });
    assert(false, '[1.4] Reject short password (< 6 chars) with 400');
  } catch (err) {
    assert(err.response?.status === 400, '[1.4] Reject short password (< 6 chars) with 400', `Message: "${err.response?.data?.message}"`);
  }

  // 1.5 Login with wrong password (Expect 401)
  try {
    await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser.email,
      password: 'WrongPassword999',
    });
    assert(false, '[1.5] Reject incorrect password with 401');
  } catch (err) {
    assert(err.response?.status === 401, '[1.5] Reject incorrect password with 401', `Status: ${err.response?.status}`);
  }

  // 1.6 Successful login & JWT issuance (Expect 200)
  try {
    const res = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password,
    });
    authToken = res.data.token;
    assert(res.status === 200 && authToken, '[1.6] Successful login & JWT issuance', `Token issued: ${authToken.slice(0, 15)}...`);
  } catch (err) {
    assert(false, '[1.6] Successful login & JWT issuance', err.message);
  }

  // 1.7 Protected route without token (Expect 401)
  try {
    await axios.get(`${BASE_URL}/auth/me`);
    assert(false, '[1.7] Reject unauthenticated access without token');
  } catch (err) {
    assert(err.response?.status === 401, '[1.7] Reject unauthenticated access without token', `Status: ${err.response?.status}`);
  }

  // 1.8 Protected route with invalid Bearer token (Expect 401)
  try {
    await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: 'Bearer INVALID_JWT_SECRET_TOKEN' },
    });
    assert(false, '[1.8] Reject invalid Bearer token with 401');
  } catch (err) {
    assert(err.response?.status === 401, '[1.8] Reject invalid Bearer token with 401', `Status: ${err.response?.status}`);
  }

  // Auth header helper
  const authHeaders = { headers: { Authorization: `Bearer ${authToken}` } };

  // -------------------------------------------------------------
  // MODULE 2: PDF UPLOAD & EDGE CASES
  // -------------------------------------------------------------
  console.log('\n\x1b[1m[MODULE 2] PDF Ingestion Pipeline & Edge Cases\x1b[0m');

  // 2.1 Non-PDF file rejection (Expect 400)
  try {
    const form = new FormData();
    form.append('pdf', Buffer.from('Plain text content that is not a PDF'), {
      filename: 'paper.txt',
      contentType: 'text/plain',
    });
    await axios.post(`${BASE_URL}/papers/upload`, form, {
      headers: { ...form.getHeaders(), Authorization: `Bearer ${authToken}` },
    });
    assert(false, '[2.1] Reject non-PDF MIME types with 400');
  } catch (err) {
    assert(err.response?.status === 400, '[2.1] Reject non-PDF MIME types with 400', `Message: "${err.response?.data?.message}"`);
  }

  // 2.2 Missing file submission (Expect 400)
  try {
    const form = new FormData();
    form.append('title', 'Ghost Paper');
    await axios.post(`${BASE_URL}/papers/upload`, form, {
      headers: { ...form.getHeaders(), Authorization: `Bearer ${authToken}` },
    });
    assert(false, '[2.2] Reject upload without file attachment with 400');
  } catch (err) {
    assert(err.response?.status === 400, '[2.2] Reject upload without file attachment with 400', `Status: ${err.response?.status}`);
  }

  // 2.3 Scanned / Empty PDF (< 100 extractable characters) -> Transitions to 'failed'
  try {
    const emptyPdf = createPdfBuffer('Short text'); // < 100 chars
    const form = new FormData();
    form.append('pdf', emptyPdf, { filename: 'scanned_paper.pdf', contentType: 'application/pdf' });
    form.append('title', 'Scanned Image Test Paper');

    const res = await axios.post(`${BASE_URL}/papers/upload`, form, {
      headers: { ...form.getHeaders(), Authorization: `Bearer ${authToken}` },
    });
    const scannedPaperId = res.data.paper._id;

    // Poll status for failure transition
    let scannedStatus = 'processing';
    let errorMessage = '';
    for (let i = 0; i < 6; i++) {
      await sleep(500);
      const check = await axios.get(`${BASE_URL}/papers/${scannedPaperId}`, authHeaders);
      scannedStatus = check.data.status;
      errorMessage = check.data.errorMessage;
      if (scannedStatus === 'failed') break;
    }

    assert(
      scannedStatus === 'failed' && errorMessage.includes('scanned'),
      '[2.3] Flag scanned/empty PDFs as unsupported with ScannedPdfError',
      `Status: "${scannedStatus}", Error: "${errorMessage}"`
    );
  } catch (err) {
    assert(false, '[2.3] Flag scanned/empty PDFs as unsupported', err.message);
  }

  // 2.4 Valid Academic Manuscript Ingestion Pipeline (Upload -> Text -> Chunk -> Embed -> Ready)
  try {
    const academicText = `Abstract: We present an architectural framework for predictive processing in neuromorphic systems.
Introduction: Modern deep learning models require substantial computational resources. Neuromorphic architectures simulate biological synaptic transmission using spike-timing-dependent plasticity.
Methodology: Our system partitions continuous sensory streams into discrete event-based tensors. Each tensor undergoes local synaptic weight adjustments before propagating to higher-level cortical columns.
Results: Empirical evaluations demonstrate an 84% reduction in energy dissipation across dense vector matrix operations compared to standard GPUs.
Discussion: Predictive coding principles offer robust error mitigation in noisy environments.
Conclusions: Hardware-native neuromorphic computation enables scalable edge intelligence.`;

    const validPdf = createPdfBuffer(academicText);
    const form = new FormData();
    form.append('pdf', validPdf, { filename: 'neuromorphic_predictive_qa.pdf', contentType: 'application/pdf' });
    form.append('title', 'Predictive Processing in Neuromorphic Substrates');
    form.append('authors', JSON.stringify(['Dr. A. Turing', 'Dr. J. von Neumann']));

    const res = await axios.post(`${BASE_URL}/papers/upload`, form, {
      headers: { ...form.getHeaders(), Authorization: `Bearer ${authToken}` },
    });
    validPaperId = res.data.paper._id;

    // Poll until paper reaches 'ready' state
    let validStatus = 'processing';
    let paperDoc = null;
    for (let i = 0; i < 15; i++) {
      await sleep(600);
      const check = await axios.get(`${BASE_URL}/papers/${validPaperId}`, authHeaders);
      paperDoc = check.data;
      validStatus = paperDoc.status;
      if (validStatus === 'ready' || validStatus === 'failed') break;
    }

    assert(
      validStatus === 'ready' && paperDoc.chunkCount > 0,
      '[2.4] Complete Ingestion Pipeline (Upload -> Text -> Chunks -> Embeddings -> Ready)',
      `Status: ${validStatus}, Chunks: ${paperDoc.chunkCount}`
    );
  } catch (err) {
    assert(false, '[2.4] Complete Ingestion Pipeline', err.message);
  }

  // -------------------------------------------------------------
  // MODULE 3: CHUNKS & VECTOR EMBEDDING INTEGRITY
  // -------------------------------------------------------------
  console.log('\n\x1b[1m[MODULE 3] Vector Embeddings & Token Chunking Verification\x1b[0m');

  try {
    const res = await axios.get(`${BASE_URL}/papers/${validPaperId}/chunks?includeEmbeddings=true`, authHeaders);
    const chunks = res.data.chunks || [];
    const firstChunk = chunks[0];

    const hasEmbedding = Array.isArray(firstChunk?.embedding) && firstChunk.embedding.length === 1536;
    const hasMetadata = firstChunk?.pageNumber && firstChunk?.tokenCount > 0;

    assert(
      chunks.length > 0 && hasEmbedding && hasMetadata,
      '[3.1] Vector Embeddings verified (1536 dimensions, page numbers preserved)',
      `Chunks: ${chunks.length}, Dims: ${firstChunk?.embedding?.length}, Page: ${firstChunk?.pageNumber}`
    );
  } catch (err) {
    assert(false, '[3.1] Vector Embeddings verified', err.message);
  }

  // -------------------------------------------------------------
  // MODULE 4: SEMANTIC SEARCH (KNN / COSINE RANKING)
  // -------------------------------------------------------------
  console.log('\n\x1b[1m[MODULE 4] Semantic Vector Search ($vectorSearch & Cosine Fallback)\x1b[0m');

  try {
    const res = await axios.post(
      `${BASE_URL}/papers/${validPaperId}/search`,
      { query: 'energy reduction in neuromorphic hardware', limit: 3 },
      authHeaders
    );
    const results = res.data.results || [];
    assert(
      results.length > 0 && typeof results[0].score === 'number',
      '[4.1] Semantic Search ranks nearest chunks with similarity scores',
      `Matches: ${results.length}, Top Score: ${results[0]?.score?.toFixed(4)}`
    );
  } catch (err) {
    assert(false, '[4.1] Semantic Search ranks nearest chunks', err.message);
  }

  // -------------------------------------------------------------
  // MODULE 5: STRUCTURED AI SUMMARIZATION
  // -------------------------------------------------------------
  console.log('\n\x1b[1m[MODULE 5] Structured AI Summarization & Caching\x1b[0m');

  try {
    // Initial summary generation
    const res = await axios.post(`${BASE_URL}/papers/${validPaperId}/summarize`, { regenerate: false }, authHeaders);
    const summary = res.data.summary;
    const hasTldr = typeof summary?.tldr === 'string' && summary.tldr.length > 0;
    const hasKeyTakeaways = Array.isArray(summary?.keyTakeaways) && summary.keyTakeaways.length > 0;
    const hasSections = Array.isArray(summary?.sections) && summary.sections.length > 0;
    const hasKeyTerms = Array.isArray(summary?.keyTerms) && summary.keyTerms.length > 0;

    assert(
      hasTldr && hasKeyTakeaways && hasSections && hasKeyTerms,
      '[5.1] Structured Summary JSON schema (TL;DR, Takeaways, Sections, Key Terms)',
      `TL;DR: "${summary.tldr.slice(0, 45)}...", Terms: ${summary.keyTerms.length}`
    );

    // Caching check
    const cacheRes = await axios.post(`${BASE_URL}/papers/${validPaperId}/summarize`, { regenerate: false }, authHeaders);
    assert(cacheRes.data.cached === true, '[5.2] Instant Summary retrieval from cache (cached: true)');
  } catch (err) {
    assert(false, '[5.1] Structured AI Summarization', err.message);
  }

  // -------------------------------------------------------------
  // MODULE 6: SINGLE-PAPER GROUNDED RAG CHAT
  // -------------------------------------------------------------
  console.log('\n\x1b[1m[MODULE 6] Single-Paper RAG Chatbot (Page-Level Citations)\x1b[0m');

  try {
    const res = await axios.post(
      `${BASE_URL}/chat/paper/${validPaperId}`,
      { message: 'What energy savings are achieved by the proposed architecture?' },
      authHeaders
    );

    const hasAnswer = typeof res.data.assistantMessage === 'string' && res.data.assistantMessage.length > 0;
    const hasCitations = Array.isArray(res.data.citations) && res.data.citations.length > 0;
    const firstCite = res.data.citations?.[0];

    assert(
      hasAnswer && hasCitations && firstCite?.pageNumber,
      '[6.1] Single-Paper RAG provides grounded answer with verifiable page citations',
      `Answer length: ${res.data.assistantMessage.length} chars, Citations: ${res.data.citations.length}, Page: ${firstCite?.pageNumber}`
    );
  } catch (err) {
    assert(false, '[6.1] Single-Paper RAG provides grounded answer', err.message);
  }

  // -------------------------------------------------------------
  // MODULE 7: CROSS-LIBRARY RAG CHAT
  // -------------------------------------------------------------
  console.log('\n\x1b[1m[MODULE 7] Cross-Library RAG Chatbot (Multi-Paper Diversity Capping)\x1b[0m');

  try {
    const res = await axios.post(
      `${BASE_URL}/chat/library`,
      { message: 'Synthesize how predictive processing and biological computation interact.' },
      authHeaders
    );

    const hasAnswer = typeof res.data.assistantMessage === 'string' && res.data.assistantMessage.length > 0;
    const citations = res.data.citations || [];

    // Verify chunk diversity capping (each paper contributes at most 3 chunks)
    const paperCounts = {};
    citations.forEach((c) => {
      const p = c.paperId || 'unknown';
      paperCounts[p] = (paperCounts[p] || 0) + 1;
    });
    const capped = Object.values(paperCounts).every((count) => count <= 3);

    assert(
      hasAnswer && citations.length > 0 && capped,
      '[7.1] Cross-Library RAG synthesizes multi-paper corpus with diversity capping (<=3 chunks/paper)',
      `Citations: ${citations.length}, Distinct Papers: ${Object.keys(paperCounts).length}`
    );
  } catch (err) {
    assert(false, '[7.1] Cross-Library RAG synthesizes multi-paper corpus', err.message);
  }

  // -------------------------------------------------------------
  // MODULE 8: EXTERNAL LITERATURE DISCOVERY (SEMANTIC SCHOLAR & ARXIV)
  // -------------------------------------------------------------
  console.log('\n\x1b[1m[MODULE 8] Academic Keyphrase Extraction & Citation Mining\x1b[0m');

  try {
    const res = await axios.get(`${BASE_URL}/papers/${validPaperId}/related`, authHeaders);
    const keywords = res.data.keywords || [];
    const related = res.data.relatedPapers || [];

    assert(
      keywords.length > 0 && related.length > 0,
      '[8.1] Academic keywords extracted and external literature retrieved via API',
      `Keywords: [${keywords.slice(0, 3).join(', ')}...], Related Papers: ${related.length}`
    );
  } catch (err) {
    assert(false, '[8.1] External literature retrieved via API', err.message);
  }

  // -------------------------------------------------------------
  // MODULE 9: RESEARCH NOTES CRUD
  // -------------------------------------------------------------
  console.log('\n\x1b[1m[MODULE 9] Research Notes Persistent CRUD\x1b[0m');

  let testNoteId = '';
  try {
    // 9.1 Create note
    const createRes = await axios.post(
      `${BASE_URL}/notes`,
      { paperId: validPaperId, content: 'Investigate biological synaptic plasticity benchmarks.', tags: ['METHOD', 'TO-CITE'] },
      authHeaders
    );
    testNoteId = createRes.data._id;
    assert(createRes.status === 201 && testNoteId, '[9.1] Create persistent research note with tags');

    // 9.2 Fetch paper notes
    const fetchRes = await axios.get(`${BASE_URL}/notes/paper/${validPaperId}`, authHeaders);
    const found = fetchRes.data.some((n) => n._id === testNoteId);
    assert(found, '[9.2] Retrieve notes by paper ID', `Notes count: ${fetchRes.data.length}`);

    // 9.3 Update note
    const updateRes = await axios.put(
      `${BASE_URL}/notes/${testNoteId}`,
      { content: 'Updated: Verified 84% energy reduction on neuromorphic edge chip.' },
      authHeaders
    );
    assert(updateRes.data.content.includes('84% energy reduction'), '[9.3] Update note content');

    // 9.4 Delete note
    const delRes = await axios.delete(`${BASE_URL}/notes/${testNoteId}`, authHeaders);
    assert(delRes.status === 200, '[9.4] Delete note permanently');
  } catch (err) {
    assert(false, '[9.x] Research Notes CRUD', err.message);
  }

  // -------------------------------------------------------------
  // MODULE 10: RATE LIMITING HEADERS VERIFICATION
  // -------------------------------------------------------------
  console.log('\n\x1b[1m[MODULE 10] Cost Control Rate Limiting Verification\x1b[0m');

  try {
    const res = await axios.post(
      `${BASE_URL}/chat/library`,
      { message: 'Rate limit check query.' },
      authHeaders
    );
    const limitHeader = res.headers['ratelimit-limit'];
    const remainingHeader = res.headers['ratelimit-remaining'];

    assert(
      Boolean(limitHeader !== undefined && remainingHeader !== undefined),
      '[10.1] RateLimit headers present on LLM endpoints (Cost Control Active)',
      `Limit: ${limitHeader}, Remaining: ${remainingHeader}`
    );
  } catch (err) {
    assert(false, '[10.1] RateLimit headers present on LLM endpoints', err.message);
  }

  // -------------------------------------------------------------
  // MODULE 11: CASCADE DELETION & MEMORY INTEGRITY
  // -------------------------------------------------------------
  console.log('\n\x1b[1m[MODULE 11] Cascade Deletion & Vector Cleanup\x1b[0m');

  try {
    const delPaperRes = await axios.delete(`${BASE_URL}/papers/${validPaperId}`, authHeaders);
    assert(delPaperRes.status === 200, '[11.1] Cascade delete removes paper document');

    // Verify chunks deleted
    const chunksCheck = await axios.get(`${BASE_URL}/papers/${validPaperId}/chunks`, authHeaders);
    assert(chunksCheck.data.chunks.length === 0, '[11.2] Associated 1536-dim vector chunks eliminated');

    // Verify paper 404
    try {
      await axios.get(`${BASE_URL}/papers/${validPaperId}`, authHeaders);
      assert(false, '[11.3] Confirm deleted paper returns 404');
    } catch (err) {
      assert(err.response?.status === 404, '[11.3] Confirm deleted paper returns 404', `Status: ${err.response?.status}`);
    }
  } catch (err) {
    assert(false, '[11.x] Cascade Deletion & Vector Cleanup', err.message);
  }

  // -------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------
  console.log('\n=============================================================');
  console.log(`  PHASE 9 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('=============================================================\n');

  if (failed === 0) {
    console.log('\x1b[32m✔ All integration, edge-case, and security tests passed successfully!\x1b[0m\n');
  } else {
    console.log(`\x1b[31m✖ ${failed} test(s) failed. Please review the logs above.\x1b[0m\n`);
  }
}

runSuite().catch(console.error);
