/**
 * Academic Markdown (.md) Parsing Service
 *
 * Extracts clean, readable text, section hierarchy, equations, tables,
 * and metadata from Markdown manuscripts (.md / .markdown).
 * Paginates text (~550 words per page) to integrate seamlessly with
 * Papermind's page-grounded RAG, vector embedding, and citation features.
 */

/**
 * Extract YAML frontmatter if present
 */
export const extractFrontmatter = (mdContent) => {
  const frontmatterMatch = mdContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!frontmatterMatch) {
    return { metadata: {}, body: mdContent };
  }

  const rawYaml = frontmatterMatch[1];
  const body = mdContent.slice(frontmatterMatch[0].length);
  const metadata = {};

  const lines = rawYaml.split(/\r?\n/);
  let currentKey = null;

  for (const line of lines) {
    const keyValMatch = line.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/);
    if (keyValMatch) {
      currentKey = keyValMatch[1].toLowerCase();
      let val = keyValMatch[2].trim();
      // Remove quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      metadata[currentKey] = val;
    } else if (currentKey && line.trim().startsWith('-')) {
      // List items under current key
      const item = line.trim().replace(/^-\s*/, '').replace(/^['"]|['"]$/g, '');
      if (Array.isArray(metadata[currentKey])) {
        metadata[currentKey].push(item);
      } else {
        metadata[currentKey] = [item];
      }
    }
  }

  return { metadata, body };
};

/**
 * Extract document title from frontmatter or Markdown H1
 */
export const extractMarkdownTitle = (body, metadata = {}) => {
  if (metadata.title && typeof metadata.title === 'string' && metadata.title.trim().length > 3) {
    return metadata.title.trim();
  }

  // Look for first # Title heading
  const h1Match = body.match(/^#\s+(.+)$/m);
  if (h1Match && h1Match[1]) {
    return h1Match[1].replace(/[*_`]/g, '').trim();
  }

  // Look for underline style H1:
  // Title
  // =====
  const underlineH1Match = body.match(/^([^\r\n]+)\r?\n={3,}\s*$/m);
  if (underlineH1Match && underlineH1Match[1]) {
    return underlineH1Match[1].replace(/[*_`]/g, '').trim();
  }

  return null;
};

/**
 * Extract document authors from frontmatter or Markdown header text
 */
export const extractMarkdownAuthors = (body, metadata = {}, title = null) => {
  // Check frontmatter
  if (metadata.authors) {
    if (Array.isArray(metadata.authors)) {
      return metadata.authors.filter(a => a && a.length > 1);
    }
    if (typeof metadata.authors === 'string') {
      return metadata.authors.split(/,| and | & /).map(a => a.trim()).filter(Boolean);
    }
  }
  if (metadata.author) {
    if (Array.isArray(metadata.author)) {
      return metadata.author.filter(a => a && a.length > 1);
    }
    if (typeof metadata.author === 'string') {
      return metadata.author.split(/,| and | & /).map(a => a.trim()).filter(Boolean);
    }
  }

  // Inspect body lines before the first major section (Abstract or Introduction)
  const lines = body.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const candidates = [];

  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // Skip the title itself
    if (title && line.includes(title)) continue;
    if (line.startsWith('#')) continue;

    // Stop when abstract or section begins
    if (lower.startsWith('## abstract') || lower.startsWith('## introduction')) break;

    // Detect Author line: e.g. **Author:** Dr. John Doe or By: Alice & Bob
    const authorPrefixMatch = line.match(/^\*?\*?(?:authors?|by)[:\s*]+([^\n\r*]+)\*?\*?/i);
    if (authorPrefixMatch && authorPrefixMatch[1]) {
      const parts = authorPrefixMatch[1]
        .split(/,| and | & |;/)
        .map(a => a.trim().replace(/[*_`]/g, ''))
        .filter(a => a.length >= 2 && !a.includes('@') && !a.toLowerCase().includes('university'));
      if (parts.length > 0) {
        return parts;
      }
    }

    // Check if line looks like comma-separated names with academic titles
    if (line.match(/(?:dr\.|prof\.|phd|m\.d\.)/i) || (line.includes(',') && !line.includes('http') && !line.includes('@'))) {
      const parts = line
        .split(/,| and | & /)
        .map(a => a.trim().replace(/[*_`]/g, ''))
        .filter(a => a.length >= 2 && a.length <= 40 && !a.includes('@') && !a.toLowerCase().includes('university'));
      if (parts.length > 0 && parts.length <= 8) {
        return parts;
      }
    }
  }

  return candidates;
};

/**
 * Clean markdown markup into structured text
 */
export const cleanMarkdownContent = (body) => {
  let text = body;

  // 1. Normalize headings into structured sections
  text = text.replace(/^#\s+(.+)$/gm, '\n\n=== SECTION: $1 ===\n\n');
  text = text.replace(/^##\s+(.+)$/gm, '\n\n=== SECTION: $1 ===\n\n');
  text = text.replace(/^###\s+(.+)$/gm, '\n\n--- SUBSECTION: $1 ---\n\n');
  text = text.replace(/^####+\s+(.+)$/gm, '\n\n[ $1 ]\n\n');

  // Underline headings
  text = text.replace(/^([^\r\n]+)\r?\n={3,}\s*$/gm, '\n\n=== SECTION: $1 ===\n\n');
  text = text.replace(/^([^\r\n]+)\r?\n-{3,}\s*$/gm, '\n\n--- SUBSECTION: $1 ---\n\n');

  // 2. Preserve math blocks: $$...$$ or \[...\]
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, '\n[Equation: $1]\n');

  // 3. Clean inline markdown formatting
  // Links [text](url) -> text (url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
  // Images ![alt](url) -> [Image: alt]
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '[Image: $1]');

  // Bold & Italic
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
  text = text.replace(/(\*|_)(.*?)\1/g, '$2');
  // Strikethrough
  text = text.replace(/~~(.*?)~~/g, '$1');
  // Inline code `code`
  text = text.replace(/`([^`]+)`/g, '$1');

  // Code blocks: ```lang ... ``` -> [Code: ... ]
  text = text.replace(/```[a-zA-Z0-9_-]*\r?\n([\s\S]*?)```/g, (match, code) => {
    return `\n[Code Block:\n${code.trim()}\n]\n`;
  });

  // Blockquotes: > text -> text
  text = text.replace(/^>\s*/gm, '');

  // Lists: normalize bullets
  text = text.replace(/^[\*\-]\s+/gm, '• ');
  text = text.replace(/^\d+\.\s+/gm, '• ');

  // Clean excessive whitespace
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
};

/**
 * Paginate Markdown text into structured pages (~550 words per page)
 */
export const paginateMarkdown = (cleanText, wordsPerPage = 550) => {
  if (!cleanText || cleanText.trim().length === 0) {
    return [{ pageNumber: 1, text: 'Empty document content.' }];
  }

  const paragraphs = cleanText.split(/\n\n+/);
  const pages = [];
  let currentPageWords = [];
  let pageNumber = 1;

  for (const para of paragraphs) {
    const paraWords = para.split(/\s+/).filter(Boolean);

    if (currentPageWords.length > 0 && (currentPageWords.length + paraWords.length) > wordsPerPage) {
      pages.push({
        pageNumber,
        text: currentPageWords.join(' '),
      });
      pageNumber++;
      currentPageWords = [];
    }

    currentPageWords.push(para);
  }

  if (currentPageWords.length > 0) {
    pages.push({
      pageNumber,
      text: currentPageWords.join(' '),
    });
  }

  return pages.length > 0 ? pages : [{ pageNumber: 1, text: cleanText }];
};

/**
 * Main parser entry point for .md / .markdown file buffers
 */
export const extractMarkdownText = async (buffer) => {
  if (!buffer || buffer.length === 0) {
    throw new Error('Markdown (.md) file buffer is empty.');
  }

  const rawString = buffer.toString('utf-8');
  if (!rawString || rawString.trim().length === 0) {
    throw new Error('Markdown source file is empty.');
  }

  const { metadata, body } = extractFrontmatter(rawString);
  const cleanText = cleanMarkdownContent(body);

  if (cleanText.length < 50) {
    throw new Error('Markdown document does not contain enough extractable text.');
  }

  const extractedTitle = extractMarkdownTitle(body, metadata);
  const extractedAuthors = extractMarkdownAuthors(body, metadata, extractedTitle);
  const pages = paginateMarkdown(cleanText);

  return {
    rawText: cleanText,
    pages,
    extractedTitle,
    extractedAuthors,
  };
};
