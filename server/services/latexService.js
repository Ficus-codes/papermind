/**
 * LaTeX (.tex) Academic Parsing Service
 * 
 * Extracts clean, readable text, section hierarchy, and metadata
 * from LaTeX research paper source files (.tex).
 * Automatically paginates text (~500 words per page) to integrate
 * seamlessly with Papermind's page-grounded RAG & vector embedding pipeline.
 */

/**
 * Extract title from LaTeX source
 */
export const extractLatexTitle = (texContent) => {
  const titleMatch = texContent.match(/\\title\s*\{([\s\S]*?)\}/);
  if (titleMatch && titleMatch[1]) {
    // Strip nested commands like \textbf, \\, \thanks{...}
    return titleMatch[1]
      .replace(/\\thanks\{[\s\S]*?\}/g, '')
      .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1')
      .replace(/\\\\/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return null;
};

/**
 * Extract authors from LaTeX source
 */
export const extractLatexAuthors = (texContent) => {
  const authorMatch = texContent.match(/\\author\s*\{([\s\S]*?)\}/);
  if (authorMatch && authorMatch[1]) {
    const rawAuthors = authorMatch[1]
      .replace(/\\thanks\{[\s\S]*?\}/g, '')
      .replace(/\\institute\{[\s\S]*?\}/g, '')
      .replace(/\\email\{[\s\S]*?\}/g, '')
      .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1')
      .replace(/\\\\/g, '\n');

    // Split authors by \and or commas
    const authorList = rawAuthors
      .split(/\\and|,|\n/)
      .map(a => a.replace(/\s+/g, ' ').trim())
      .filter(a => a.length > 1 && !a.includes('@') && !a.toLowerCase().includes('university') && !a.toLowerCase().includes('institute'));

    if (authorList.length > 0) {
      return [...new Set(authorList)];
    }
  }
  return [];
};

/**
 * Clean LaTeX markup into human-readable text for embeddings and LLM reasoning
 */
export const cleanLatexContent = (texContent) => {
  let text = texContent;

  // 1. Remove comments (% to end of line, but not escaped \%)
  text = text.replace(/(^|[^\\])%.*$/gm, '$1');

  // 2. Extract content inside \begin{document} ... \end{document} if present
  const docMatch = text.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
  if (docMatch && docMatch[1]) {
    // Also capture title and abstract if they occurred in preamble or body
    const title = extractLatexTitle(texContent);
    text = (title ? `TITLE: ${title}\n\n` : '') + docMatch[1];
  }

  // 3. Normalize sections into clean headings
  text = text.replace(/\\section\*?\{([\s\S]*?)\}/g, '\n\n=== SECTION: $1 ===\n\n');
  text = text.replace(/\\subsection\*?\{([\s\S]*?)\}/g, '\n\n--- SUBSECTION: $1 ---\n\n');
  text = text.replace(/\\subsubsection\*?\{([\s\S]*?)\}/g, '\n\n[ $1 ]\n\n');
  text = text.replace(/\\paragraph\*?\{([\s\S]*?)\}/g, '\n\n$1: ');

  // 4. Abstract block
  text = text.replace(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/g, '\n\n=== ABSTRACT ===\n$1\n\n');

  // 5. Clean common formatting macros: \textbf{x}, \textit{x}, \emph{x}, \underline{x}
  text = text.replace(/\\(textbf|textit|emph|underline|text|textrm|textsf|texttt)\{([\s\S]*?)\}/g, '$2');

  // 6. Citations & References
  text = text.replace(/\\cite[a-zA-Z]*\*?\{([^}]*)\}/g, ' [Citation: $1] ');
  text = text.replace(/\\ref\{([^}]*)\}/g, ' [Ref: $1] ');
  text = text.replace(/\\eqref\{([^}]*)\}/g, ' (Eq. $1) ');
  text = text.replace(/\\label\{[^}]*\}/g, '');

  // 7. Math environments: Preserve equations cleanly
  text = text.replace(/\\begin\{(equation|align|gather|multline)\*?\}([\s\S]*?)\\end\{\1\*?\}/g, '\n[Equation: $2]\n');

  // 8. Environments: lists, quotes, figures, tables
  text = text.replace(/\\begin\{(itemize|enumerate)\}([\s\S]*?)\\end\{\1\}/g, (match, env, items) => {
    return items.replace(/\\item\s*/g, '\n• ');
  });

  // Remove figure and table floats but preserve caption
  text = text.replace(/\\begin\{(figure|table)\*?\}([\s\S]*?)\\end\{\1\*?\}/g, (match, env, body) => {
    const captionMatch = body.match(/\\caption\{([\s\S]*?)\}/);
    return captionMatch ? `\n[${env.toUpperCase()}: ${captionMatch[1]}]\n` : '';
  });

  // 9. Strip miscellaneous commands
  text = text.replace(/\\(maketitle|tableofcontents|newpage|clearpage|centering|noindent|appendix)/g, '');
  text = text.replace(/\\(vspace|hspace)\*?\{[^}]*\}/g, ' ');
  text = text.replace(/\\bibliography\{[^}]*\}/g, '');
  text = text.replace(/\\bibliographystyle\{[^}]*\}/g, '');
  text = text.replace(/\\[a-zA-Z]+(\[[^\]]*\])?\{([^}]*)\}/g, '$2'); // Generic \cmd[opt]{arg} -> arg
  text = text.replace(/\\[a-zA-Z]+/g, ' '); // Strip leftover bare commands like \quad, \alpha, etc.

  // 10. Clean escaped characters and whitespace
  text = text.replace(/\\([%$#&_{}])/g, '$1');
  text = text.replace(/\\\\/g, '\n');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
};

/**
 * Paginate clean LaTeX text into structured pages (~550 words per page)
 * preserving section headers and continuity for RAG chunks.
 */
export const paginateLatex = (cleanText, wordsPerPage = 550) => {
  if (!cleanText || cleanText.trim().length === 0) {
    return [{ pageNumber: 1, text: 'Empty document content.' }];
  }

  const paragraphs = cleanText.split(/\n\n+/);
  const pages = [];
  let currentPageWords = [];
  let pageNumber = 1;

  for (const para of paragraphs) {
    const paraWords = para.split(/\s+/).filter(Boolean);
    
    // If adding this paragraph exceeds wordsPerPage and we already have content, push page
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

  // Push final page
  if (currentPageWords.length > 0) {
    pages.push({
      pageNumber,
      text: currentPageWords.join(' '),
    });
  }

  return pages.length > 0 ? pages : [{ pageNumber: 1, text: cleanText }];
};

/**
 * Main parser entry point for .tex file buffers
 */
export const extractLatexText = async (buffer) => {
  const rawString = buffer.toString('utf-8');
  if (!rawString || rawString.trim().length === 0) {
    throw new Error('LaTeX source file is empty.');
  }

  const extractedTitle = extractLatexTitle(rawString);
  const extractedAuthors = extractLatexAuthors(rawString);
  const cleanText = cleanLatexContent(rawString);

  if (cleanText.length < 50) {
    throw new Error('LaTeX document does not contain enough extractable text.');
  }

  const pages = paginateLatex(cleanText);

  return {
    rawText: cleanText,
    pages,
    extractedTitle,
    extractedAuthors,
  };
};
