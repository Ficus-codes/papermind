import React, { useMemo } from 'react';
import katex from 'katex';

/**
 * MathRenderer Component
 *
 * Renders mathematical expressions using KaTeX alongside rich academic text:
 * - Block math: $$...$$, \\[...\\], [Equation: ...], \\begin{equation}...\\end{equation}
 * - Inline math: $...$, \\(...\\)
 * - Academic section headers: === SECTION: ... ===, --- SUBSECTION: ... ---
 * - Interactive page citations: [Page X], [p.X], [p. X]
 */

// Regex patterns
const MATH_BLOCK_REGEX = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\[Equation:\s*[\s\S]*?\]|\\begin\{(?:equation|align|gather|multline)\*?\}[\s\S]*?\\end\{(?:equation|align|gather|multline)\*?\})/g;
const INLINE_MATH_REGEX = /(\$(?!\$)[^\$\n]+?\$|\\\([\s\S]*?\\\))/g;
const CITATION_REGEX = /(\[(?:Page|p\.?)\s*(\d+)(?:,\s*(?:chunk\s*#?)?(\d+))?\]|\((?:Page|p\.?)\s*(\d+)\)|\[p\.?\s*(\d+)\])/gi;
const SECTION_REGEX = /(?:^|\n)(=== SECTION: ([^\n=]+) ===|--- SUBSECTION: ([^\n-]+) ---)(?:\n|$)/g;

/**
 * Render single math string with KaTeX safely
 */
const renderKatexSafe = (mathStr, displayMode = false) => {
  try {
    return katex.renderToString(mathStr.trim(), {
      displayMode,
      throwOnError: false,
      output: 'htmlAndMathml',
    });
  } catch {
    return `<span class="font-mono text-error">${mathStr}</span>`;
  }
};

/**
 * Render text tokens: parses citations and inline math
 */
const renderTextWithInlineMathAndCitations = (text, citations = [], onCitationClick = null, keyPrefix = '', searchQuery = '') => {
  if (!text) return null;

  // Split by citations first
  const citationParts = [];
  let lastIndex = 0;
  let match;
  const citeRegex = new RegExp(CITATION_REGEX.source, 'gi');

  while ((match = citeRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      citationParts.push({ type: 'text', value: text.substring(lastIndex, match.index) });
    }

    const pageNum = match[2] || match[4] || match[5];
    const chunkIdx = match[3] || null;
    citationParts.push({
      type: 'citation',
      pageNum: parseInt(pageNum, 10),
      chunkIdx: chunkIdx ? parseInt(chunkIdx, 10) : null,
      raw: match[0],
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    citationParts.push({ type: 'text', value: text.substring(lastIndex) });
  }

  // Now process each part: if 'text', parse inline math; if 'citation', render badge
  return citationParts.map((part, idx) => {
    const partKey = `${keyPrefix}-part-${idx}`;

    if (part.type === 'citation') {
      if (onCitationClick) {
        return (
          <button
            key={partKey}
            type="button"
            onClick={() => onCitationClick(part.pageNum, part.chunkIdx, citations)}
            className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 my-0.5 rounded font-mono text-[11px] font-bold bg-[#FF9A2E]/15 text-[#8E4F00] dark:text-[#ffc15e] hover:bg-[#FF9A2E] hover:text-[#111111] border border-[#FF9A2E]/40 hover:border-[#FF9A2E] transition-all cursor-pointer shadow-2xs active:scale-95 align-middle select-none"
            title={`Inspect page ${part.pageNum} excerpt`}
          >
            <span className="text-[10px] text-[#FF9A2E]">📖</span>
            <span>p.{part.pageNum}</span>
            <span className="text-[9px] opacity-75">↗</span>
          </button>
        );
      }
      return (
        <span
          key={partKey}
          className="inline-flex items-center gap-1 px-1.5 py-0.2 mx-0.5 rounded font-mono text-[10px] font-semibold bg-surface-container border border-outline-variant/40 text-primary-container"
        >
          p.{part.pageNum}
        </span>
      );
    }

    // Process inline math within text
    const textStr = part.value;
    const inlineParts = [];
    let inlineLastIdx = 0;
    let inlineMatch;
    const inlineRegex = new RegExp(INLINE_MATH_REGEX.source, 'g');

    while ((inlineMatch = inlineRegex.exec(textStr)) !== null) {
      if (inlineMatch.index > inlineLastIdx) {
        inlineParts.push({
          type: 'plain',
          value: textStr.substring(inlineLastIdx, inlineMatch.index),
        });
      }

      const rawMath = inlineMatch[0];
      let cleanMath = rawMath;
      if (rawMath.startsWith('$') && rawMath.endsWith('$')) {
        cleanMath = rawMath.slice(1, -1);
      } else if (rawMath.startsWith('\\(') && rawMath.endsWith('\\)')) {
        cleanMath = rawMath.slice(2, -2);
      }

      inlineParts.push({
        type: 'inline-math',
        value: cleanMath,
      });

      inlineLastIdx = inlineMatch.index + rawMath.length;
    }

    if (inlineLastIdx < textStr.length) {
      inlineParts.push({
        type: 'plain',
        value: textStr.substring(inlineLastIdx),
      });
    }

    return (
      <span key={partKey}>
        {inlineParts.map((sub, sIdx) => {
          const subKey = `${partKey}-sub-${sIdx}`;
          if (sub.type === 'inline-math') {
            const html = renderKatexSafe(sub.value, false);
            return (
              <span
                key={subKey}
                className="inline-katex px-1 py-0.5 mx-0.5 rounded bg-surface-container/30 text-on-surface align-baseline text-[0.95em]"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          }

          // Plain text with optional search term highlighting
          if (searchQuery && searchQuery.trim().length > 1) {
            const trimmedQ = searchQuery.trim();
            const escapedQ = trimmedQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const searchRegex = new RegExp(`(${escapedQ})`, 'gi');
            const searchSegments = sub.value.split(searchRegex);

            if (searchSegments.length > 1) {
              return (
                <span key={subKey}>
                  {searchSegments.map((seg, segIdx) =>
                    seg.toLowerCase() === trimmedQ.toLowerCase() ? (
                      <mark
                        key={segIdx}
                        className="bg-[#FF9A2E]/40 text-on-surface font-semibold px-0.5 rounded border-b border-[#FF9A2E]"
                      >
                        {seg}
                      </mark>
                    ) : (
                      seg
                    )
                  )}
                </span>
              );
            }
          }

          return <span key={subKey}>{sub.value}</span>;
        })}
      </span>
    );
  });
};

const MathRenderer = ({
  content = '',
  citations = [],
  onCitationClick = null,
  searchQuery = '',
  className = '',
  displayBlockMathCentered = true,
}) => {
  const renderedElements = useMemo(() => {
    if (!content || typeof content !== 'string') return null;

    // 1. Split content by block math expressions
    const blockTokens = [];
    let lastIndex = 0;
    let match;
    const blockRegex = new RegExp(MATH_BLOCK_REGEX.source, 'g');

    while ((match = blockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        blockTokens.push({ type: 'text', value: content.substring(lastIndex, match.index) });
      }

      const raw = match[0];
      let mathCode = raw;

      if (raw.startsWith('$$') && raw.endsWith('$$')) {
        mathCode = raw.slice(2, -2);
      } else if (raw.startsWith('\\[') && raw.endsWith('\\]')) {
        mathCode = raw.slice(2, -2);
      } else if (raw.startsWith('[Equation:') && raw.endsWith(']')) {
        mathCode = raw.slice(10, -1);
      }

      blockTokens.push({ type: 'block-math', value: mathCode });
      lastIndex = match.index + raw.length;
    }

    if (lastIndex < content.length) {
      blockTokens.push({ type: 'text', value: content.substring(lastIndex) });
    }

    // 2. Map tokens into elements
    return blockTokens.map((token, bIdx) => {
      const bKey = `block-${bIdx}`;

      if (token.type === 'block-math') {
        const katexHtml = renderKatexSafe(token.value, true);
        return (
          <div
            key={bKey}
            className={`my-3 p-3 sm:p-4 rounded-xl bg-surface-container/70 border border-outline-variant/40 overflow-x-auto shadow-2xs font-mono ${
              displayBlockMathCentered ? 'text-center' : 'text-left'
            }`}
          >
            <div
              className="katex-block-wrapper inline-block min-w-full sm:min-w-0"
              dangerouslySetInnerHTML={{ __html: katexHtml }}
            />
          </div>
        );
      }

      // Check for section markers in text token: === SECTION: ... === or --- SUBSECTION: ... ---
      const textVal = token.value;
      const sectionParts = [];
      let secLastIdx = 0;
      let secMatch;
      const secRegex = new RegExp(SECTION_REGEX.source, 'g');

      while ((secMatch = secRegex.exec(textVal)) !== null) {
        if (secMatch.index > secLastIdx) {
          sectionParts.push({
            type: 'body',
            value: textVal.substring(secLastIdx, secMatch.index),
          });
        }

        const isMainSection = !!secMatch[2];
        const headingTitle = secMatch[2] || secMatch[3];

        sectionParts.push({
          type: isMainSection ? 'section' : 'subsection',
          title: headingTitle.trim(),
        });

        secLastIdx = secMatch.index + secMatch[0].length;
      }

      if (secLastIdx < textVal.length) {
        sectionParts.push({
          type: 'body',
          value: textVal.substring(secLastIdx),
        });
      }

      return (
        <span key={bKey}>
          {sectionParts.map((sp, spIdx) => {
            const spKey = `${bKey}-sec-${spIdx}`;

            if (sp.type === 'section') {
              return (
                <div
                  key={spKey}
                  className="mt-4 mb-2 pb-1.5 border-b border-outline-variant/30 flex items-center gap-2 font-display text-sm sm:text-base font-bold text-on-surface uppercase tracking-tight"
                >
                  <span className="font-mono text-xs text-primary-container">§</span>
                  <span>{sp.title}</span>
                </div>
              );
            }

            if (sp.type === 'subsection') {
              return (
                <div
                  key={spKey}
                  className="mt-3 mb-1 font-mono text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-1.5"
                >
                  <span>—</span>
                  <span>{sp.title}</span>
                </div>
              );
            }

            // Regular body text with inline math and citations
            return (
              <span key={spKey}>
                {renderTextWithInlineMathAndCitations(sp.value, citations, onCitationClick, spKey, searchQuery)}
              </span>
            );
          })}
        </span>
      );
    });
  }, [content, citations, onCitationClick, displayBlockMathCentered, searchQuery]);

  return <div className={`math-renderer ${className}`}>{renderedElements}</div>;
};

export default MathRenderer;
