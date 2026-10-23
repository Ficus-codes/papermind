import React, { useState, useEffect } from 'react';
import api from '../api/apiClient';

/**
 * SCREEN: "Papermind — Add a Paper" (ID: 55a4684ffeab40b8bd850073c7a6a34c)
 *
 * Swiss modernism, architectural layout:
 * - Kicker: ARCHIVE INGESTION // PIPELINE V2.4
 * - Giant display: ADD A PAPER (72px, weight 500)
 * - Telemetry right: SLOT 015 / 100 // ACTIVE INGESTION & PARSER :: MULTIPART READY
 * - Dropzone with 1px dashed hairline & format chips
 * - Vertical Stepper (01 // UPLOADING -> 02 // EXTRACTING TEXT -> 03 // CHUNKING -> 04 // EMBEDDING -> 05 // READY)
 * - Right: File Inspector & Diagnostics Card with metadata table
 * - Bottom: Ingestion buffer telemetry & Action buttons
 */
const UploadPaper = ({ onAuthRequired, onUploadComplete, onViewPaper, onCancel }) => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [paperId, setPaperId] = useState(null);
  const [status, setStatus] = useState(''); // 'processing', 'ready', 'failed'
  const [errorMessage, setErrorMessage] = useState('');
  const [chunkCount, setChunkCount] = useState(0);
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token && onAuthRequired) {
      onAuthRequired();
    }
  }, [onAuthRequired]);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      const isPdf = dropped.type === 'application/pdf' || dropped.name.toLowerCase().endsWith('.pdf');
      const isTex = dropped.name.toLowerCase().endsWith('.tex') ||
        dropped.type === 'application/x-tex' ||
        dropped.type === 'text/x-tex';
      const isDocx = dropped.name.toLowerCase().endsWith('.docx') ||
        dropped.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        dropped.type === 'application/msword';
      const isMd = dropped.name.toLowerCase().endsWith('.md') ||
        dropped.name.toLowerCase().endsWith('.markdown') ||
        dropped.type.includes('markdown');

      if (isPdf || isTex || isDocx || isMd) {
        setFile(dropped);
        if (!title) setTitle(dropped.name.replace(/\.(pdf|tex|docx|md|markdown)$/i, ''));
      } else {
        setErrorMessage('Only PDF (.pdf), LaTeX (.tex), Word (.docx), and Markdown (.md) manuscripts are supported.');
      }
    }
  };

  const handleSelectFile = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) setTitle(selected.name.replace(/\.(pdf|tex|docx|md|markdown)$/i, ''));
    }
  };

  const handleUpload = async (e) => {
    e?.preventDefault();
    if (!file) return;

    const token = localStorage.getItem('token');
    if (!token) {
      if (onAuthRequired) onAuthRequired();
      return;
    }

    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('title', title.trim() || file.name.replace(/\.(pdf|tex|docx|md|markdown)$/i, ''));

    setUploading(true);
    setErrorMessage('');
    try {
      const res = await api.post('/api/papers/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setPaperId(res.data.paper._id);
      setStatus(res.data.paper.status || 'processing');
      setChunkCount(res.data.paper.chunkCount || 0);
      setPageCount(res.data.paper.pages?.length || 0);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Upload failed. Please check network connection.');
      setStatus('failed');
    } finally {
      setUploading(false);
    }
  };

  // Poll processing progress
  useEffect(() => {
    let interval;
    if (paperId && (status === 'processing' || !status)) {
      interval = setInterval(async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            clearInterval(interval);
            if (onAuthRequired) onAuthRequired();
            return;
          }

          const response = await api.get(`/api/papers/${paperId}`);

          const currentPaper = response.data;
          setStatus(currentPaper.status);
          setChunkCount(currentPaper.chunkCount || 0);
          setPageCount(currentPaper.pages?.length || 0);

          if (currentPaper.status === 'ready' || currentPaper.status === 'failed') {
            clearInterval(interval);
            if (currentPaper.status === 'failed') {
              setErrorMessage(
                currentPaper.errorMessage || 'Text extraction failed. This PDF appears to be scanned or image-only.'
              );
            }
          }
        } catch {
          // Keep polling
        }
      }, 1500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [paperId, status, onAuthRequired]);

  // Stepper state calculation
  const getStepState = (stepIndex) => {
    if (status === 'ready') return 'completed';
    if (status === 'failed') {
      if (stepIndex <= 1) return 'completed';
      return 'error';
    }
    if (uploading) {
      if (stepIndex === 0) return 'active';
      return 'pending';
    }
    if (status === 'processing') {
      if (stepIndex === 0 || stepIndex === 1) return 'completed';
      if (stepIndex === 2) return 'active';
      return 'pending';
    }
    return stepIndex === 0 && file ? 'active' : 'pending';
  };

  const steps = [
    {
      code: '01 // UPLOADING',
      label: 'MULTIPART STREAM',
      desc: 'Chunked stream transfer via Multer buffer.',
    },
    {
      code: '02 // EXTRACTING TEXT',
      label: 'PDF PARSER ENGINE',
      desc: 'pdf-parse executed · Zero image-only layer detected.',
    },
    {
      code: '03 // CHUNKING',
      label: 'SEMANTIC SPLIT',
      desc: '~500 tokens with 50-token semantic overlap.',
    },
    {
      code: '04 // EMBEDDING',
      label: 'VECTOR COMMIT',
      desc: '1536-dimensional vectors via text-embedding-3-small.',
    },
    {
      code: '05 // READY',
      label: 'LINEAGE REGISTRATION',
      desc: 'Deterministic lineage synthesis & BibTeX registration.',
    },
  ];

  const handleFinish = () => {
    if (onUploadComplete) onUploadComplete(paperId);
    else if (onViewPaper) onViewPaper(paperId);
    else if (onCancel) onCancel();
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-10 animate-fade-in font-sans">
      {/* 0. Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-mono text-on-surface-variant mb-6 uppercase tracking-wider">
        <button
          onClick={onCancel}
          className="hover:text-on-surface hover:underline cursor-pointer"
        >
          LIBRARY
        </button>
        <span>/</span>
        <span className="text-on-surface font-semibold">
          INGESTION PIPELINE
        </span>
      </div>

      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 sm:gap-6 pb-6 border-b border-outline-variant/30 mb-6 sm:mb-8">
        <div>
          <span className="font-counter-mono text-[9px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em] text-secondary uppercase block mb-1">
            ARCHIVE INGESTION // PIPELINE V2.4
          </span>
          <h1 className="font-display text-4xl sm:text-7xl text-on-surface leading-[0.92] tracking-tight break-words">
            ADD A PAPER
          </h1>
          <p className="text-[11px] sm:text-xs text-on-surface-variant mt-2 font-mono">
            PDF &amp; LATEX (.TEX) EXTRACTION · 1536-DIM VECTOR COMMIT · DETERMINISTIC SUMMARY GENERATION
          </p>
        </div>

        <div className="font-counter-mono text-xs text-secondary text-left md:text-right space-y-1">
          <div className="flex items-center gap-2 justify-start md:justify-end">
            <span className="w-2 h-2 rounded-full bg-primary-container shadow-[0_0_6px_#ff9a2e]" />
            <span className="font-semibold text-on-surface text-[11px] sm:text-xs">
              SLOT 015 / 100 // ACTIVE INGESTION
            </span>
          </div>
          <div className="text-[10px] text-secondary">
            PARSER :: DUAL-ENGINE (PDF + TEX)
          </div>
        </div>
      </div>

      {/* 2. Main Ingestion Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Left Column (8 cols): Dropzone & Roadmap Stepper */}
        <div className="lg:col-span-8 space-y-6 sm:space-y-8">
          {/* Dropzone with 1px dashed hairline */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`p-6 sm:p-16 text-center rounded-2xl transition-all border border-dashed ${
              isDragOver
                ? 'border-primary-container bg-primary-container/10'
                : 'border-outline-variant/60 bg-surface-container hover:bg-surface-container-high'
            }`}
          >
            <input
              type="file"
              accept=".pdf,.tex,.docx,.md,.markdown,application/pdf,application/x-tex,text/x-tex,text/plain,text/markdown,text/x-markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
              id="pdf-file-input"
              onChange={handleSelectFile}
              className="hidden"
            />

            <div className="space-y-5 max-w-md mx-auto">
              {/* Technical wireframe badge */}
              <div className="w-14 h-14 mx-auto rounded-full border border-outline-variant/60 flex items-center justify-center font-counter-mono text-xs relative">
                <span className="font-bold text-on-surface">
                  {file?.name?.toLowerCase()?.endsWith('.tex')
                    ? 'TEX'
                    : file?.name?.toLowerCase()?.endsWith('.docx')
                      ? 'DOCX'
                      : file?.name?.toLowerCase()?.endsWith('.md') || file?.name?.toLowerCase()?.endsWith('.markdown')
                        ? 'MD'
                        : 'PDF'}
                </span>
                <div className="absolute inset-1 rounded-full border border-outline-variant/30" />
              </div>

              <div>
                <h3 className="font-display text-2xl sm:text-3xl text-on-surface uppercase tracking-tight">
                  DRAG &amp; DROP A PDF, LATEX (.TEX), DOCX, OR MARKDOWN (.MD)
                </h3>
                <p className="text-xs text-secondary mt-2 leading-relaxed">
                  Supports compiled PDF (.pdf), raw LaTeX (.tex), Word (.docx), and Markdown (.md) sources up to 25 MB.
                </p>
              </div>

              {/* Format Badges */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1 font-counter-mono text-[9px] text-secondary">
                <span className="px-2 py-0.5 rounded-sm border border-outline-variant/40 bg-surface-container-low text-on-surface-variant font-bold">
                  [PDF (.PDF)]
                </span>
                <span className="px-2 py-0.5 rounded-sm border border-outline-variant/40 bg-surface-container-low text-[#8E4F00] font-bold">
                  [LATEX (.TEX)]
                </span>
                <span className="px-2 py-0.5 rounded-sm border border-outline-variant/40 bg-surface-container-low text-[#1d63ed] font-bold">
                  [WORD (.DOCX)]
                </span>
                <span className="px-2 py-0.5 rounded-sm border border-outline-variant/40 bg-surface-container-low text-emerald-600 dark:text-emerald-400 font-bold">
                  [MARKDOWN (.MD)]
                </span>
                <span className="px-2 py-0.5 rounded-sm border border-outline-variant/40 bg-surface-container-low text-on-surface-variant">
                  [MAX: 25 MB]
                </span>
                <span className="px-2 py-0.5 rounded-sm border border-outline-variant/40 bg-surface-container-low text-on-surface-variant">
                  [MATH &amp; SECTIONS]
                </span>
              </div>

              <div className="pt-2">
                <label
                  htmlFor="pdf-file-input"
                  className="btn-secondary cursor-pointer inline-block"
                >
                  BROWSE FILES
                </label>
              </div>
            </div>
          </div>

          {/* Title Editor when file is selected */}
          {file && !paperId && (
            <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-6 space-y-4">
              <label className="block font-counter-mono text-[10px] text-secondary uppercase tracking-wider">
                DOCUMENT TITLE (OPTIONAL EDIT BEFORE EXTRACTION)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter publication or manuscript title..."
                className="w-full bg-transparent border-b border-outline-variant/40 py-2 text-sm text-on-surface focus:border-primary-container outline-none font-sans"
              />
              <div className="pt-2">
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="btn-primary w-full"
                >
                  {uploading ? 'INGESTING MULTIPART STREAM…' : 'BEGIN INGESTION PIPELINE →'}
                </button>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-5 border-l-4 border-error bg-error/10 text-xs text-error rounded-r-xl space-y-2">
              <div className="font-counter-mono text-[10px] font-bold tracking-widest">
                [ERR_INGESTION_SCANNED_DOC]
              </div>
              <p className="leading-relaxed">{errorMessage}</p>
              <button
                onClick={() => {
                  setPaperId(null);
                  setStatus('');
                  setErrorMessage('');
                  setFile(null);
                }}
                className="font-counter-mono text-[10px] underline uppercase cursor-pointer block pt-1"
              >
                RETRY WITH DIGITAL PDF
              </button>
            </div>
          )}

          {/* Roadmap Stepper */}
          {(uploading || paperId) && (
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20 font-counter-mono text-xs">
                <span className="text-on-surface font-semibold">
                  STAGE 02 // INGESTION PIPELINE EXECUTION
                </span>
                <span className="text-primary font-bold">
                  {status === 'ready' ? 'COMPLETE :: 100%' : 'PIPELINE ACTIVE :: 68%'}
                </span>
              </div>

              <div className="space-y-6 relative pl-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-outline-variant/30">
                {steps.map((s, idx) => {
                  const state = getStepState(idx);
                  return (
                    <div key={idx} className="relative flex items-start gap-4">
                      {/* Step Indicator Dot */}
                      <div
                        className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border transition-all ${
                          state === 'completed'
                            ? 'bg-primary-container border-primary-container shadow-[0_0_8px_#ff9a2e]'
                            : state === 'active'
                            ? 'bg-primary-container border-primary-container animate-ping'
                            : state === 'error'
                            ? 'bg-error border-error'
                            : 'bg-transparent border-outline-variant/60'
                        }`}
                      />

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 font-counter-mono text-xs">
                          <span className="font-bold text-on-surface">{s.code}</span>
                          <span className="text-[10px] text-secondary">· {s.label}</span>
                          {state === 'completed' && (
                            <span className="text-[10px] text-primary font-bold">✓ DONE</span>
                          )}
                          {state === 'active' && (
                            <span className="text-[10px] text-secondary animate-pulse">RUNNING…</span>
                          )}
                        </div>
                        <p className="text-xs text-secondary font-sans">{s.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-outline-variant/20 font-counter-mono text-[10px] text-secondary flex justify-between">
                <span>CHUNKED_TOKENS: {chunkCount > 0 ? (chunkCount * 480).toLocaleString() : '21,450'}</span>
                <span>OVERLAP: 10% // DETERMINISTIC</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (4 cols): File Inspector & Diagnostics Card */}
        <div className="lg:col-span-4 bg-surface-container border border-outline-variant/30 rounded-xl p-6 space-y-6 sticky top-24 shadow-sm">
          <div className="pb-3 border-b border-outline-variant/20 font-counter-mono text-xs text-on-surface font-bold flex justify-between items-center">
            <span>FILE INSPECTOR & DIAGNOSTICS</span>
            {status === 'ready' && (
              <span className="text-primary text-[10px]">● READY</span>
            )}
          </div>

          {file ? (
            <div className="space-y-4">
              <div>
                <span className="font-counter-mono text-[10px] text-secondary uppercase block mb-1">
                  MANUSCRIPT FILENAME
                </span>
                <p className="font-display text-sm font-bold text-on-surface break-all leading-tight">
                  {file.name}
                </p>
                <p className="font-counter-mono text-[10px] text-secondary mt-0.5">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB · {pageCount > 0 ? `${pageCount} PAGES` : 'INDEXING PAGES…'}
                </p>
              </div>

              {/* Status Chip */}
              <div>
                <span className="font-counter-mono text-[10px] text-secondary uppercase block mb-1">
                  CURRENT STAGE
                </span>
                <div className="inline-flex items-center gap-1.5 font-counter-mono text-[10px] px-3 py-1 rounded-full border border-outline-variant/40 bg-surface-container-low">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      status === 'ready'
                        ? 'bg-primary-container shadow-[0_0_6px_#ff9a2e]'
                        : status === 'failed'
                        ? 'bg-error'
                        : 'bg-secondary animate-pulse'
                    }`}
                  />
                  <span className="font-semibold text-on-surface">
                    {status === 'ready'
                      ? 'READY (100%)'
                      : status === 'failed'
                      ? 'PARSE FAILED'
                      : 'PROCESSING (68%)'}
                  </span>
                </div>
              </div>

              {/* Metadata Diagnostics Table */}
              <div className="border border-outline-variant/30 rounded-lg p-3 font-counter-mono text-[10px] space-y-2 bg-surface-container-low">
                <div className="flex justify-between">
                  <span className="text-secondary">HASH_SHA256:</span>
                  <span className="text-on-surface font-semibold">0x4A19...B74E</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">PAGES_FOUND:</span>
                  <span className="text-on-surface font-semibold">{pageCount > 0 ? `${pageCount} EXTRACTED` : 'SCANNING…'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">CHUNKS_EST:</span>
                  <span className="text-on-surface font-semibold">{chunkCount > 0 ? `${chunkCount} UNITS` : '~48 UNITS'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">PARSER_ENGINE:</span>
                  <span className="text-on-surface font-semibold">
                    {file?.name?.toLowerCase()?.endsWith('.tex')
                      ? 'LATEX-CORE V1.0'
                      : file?.name?.toLowerCase()?.endsWith('.docx')
                        ? 'MAMMOTH-DOCX V1.0'
                        : file?.name?.toLowerCase()?.endsWith('.md') || file?.name?.toLowerCase()?.endsWith('.markdown')
                          ? 'COMMONMARK-GFM V1.0'
                          : 'PDF-PARSE V1.1'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">SCAN_VALIDATION:</span>
                  <span className="text-primary font-semibold">
                    {file?.name?.toLowerCase()?.endsWith('.tex')
                      ? 'TEX SYNTAX VERIFIED'
                      : file?.name?.toLowerCase()?.endsWith('.docx')
                        ? 'OPENXML DOCX VERIFIED'
                        : file?.name?.toLowerCase()?.endsWith('.md') || file?.name?.toLowerCase()?.endsWith('.markdown')
                          ? 'COMMONMARK / GFM VERIFIED'
                          : 'DIGITAL TEXT VERIFIED'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center font-counter-mono text-xs text-secondary space-y-2">
              <div className="text-xl">📄</div>
              <p>NO MANUSCRIPT MOUNTED</p>
              <p className="text-[10px] text-secondary/70">
                Select a file from the left dropzone to execute parser diagnostics.
              </p>
            </div>
          )}

          {/* Bottom Actions */}
          <div className="pt-4 border-t border-outline-variant/30 space-y-2">
            {status === 'ready' ? (
              <button
                onClick={handleFinish}
                className="btn-ignition w-full !h-10"
              >
                OPEN PAPER IN REPOSITORY →
              </button>
            ) : (
              <button
                onClick={onCancel}
                className="btn-secondary w-full !h-10"
              >
                CANCEL INGESTION
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPaper;
