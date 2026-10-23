import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/apiClient';

/**
 * Page 10 — Notes (/papers/[id]/notes)
 * Two Panes:
 * - Left (35%): "NOTES (06)", black pill "+ NEW NOTE", tag filter chips, hairline rows showing note first line, tags, date
 * - Right (65%): Note editor on light-grey canvas, tiny label "NOTE", borderless textarea, tag input, SAVE (black pill), CANCEL (outline), DELETE (red link), mono timestamp
 */
const NotesManager = ({ paperId, onAuthRequired }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState(null);
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [filterTag, setFilterTag] = useState('ALL');
  const [saving, setSaving] = useState(false);

  const selectNote = useCallback((n) => {
    setSelectedNote(n);
    setContent(n?.content || '');
    setTags(n?.tags || []);
  }, []);

  const handleNewNote = useCallback(() => {
    setSelectedNote(null);
    setContent('');
    setTags(['METHOD']);
  }, []);

  const fetchNotes = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      if (onAuthRequired) onAuthRequired();
      return;
    }

    try {
      setLoading(true);
      const res = await api.get(`/api/notes/paper/${paperId}`);
      const fetched = res.data || [];
      setNotes(fetched);
      if (fetched.length > 0 && !selectedNote) {
        selectNote(fetched[0]);
      } else if (fetched.length === 0) {
        handleNewNote();
      }
    } catch (err) {
      console.error('Error fetching notes:', err);
    } finally {
      setLoading(false);
    }
  }, [paperId, onAuthRequired, selectedNote, selectNote, handleNewNote]);

  useEffect(() => {
    if (paperId) {
      fetchNotes();
    }
  }, [paperId, fetchNotes]);

  const handleSave = async () => {
    if (!content.trim()) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    setSaving(true);
    try {
      if (selectedNote?._id) {
        // Update
        const res = await api.put(
          `/api/notes/${selectedNote._id}`,
          { content, tags }
        );
        setNotes((prev) => prev.map((n) => (n._id === selectedNote._id ? res.data : n)));
        setSelectedNote(res.data);
      } else {
        // Create
        const res = await api.post(
          '/api/notes',
          { paperId, content, tags }
        );
        setNotes((prev) => [res.data, ...prev]);
        setSelectedNote(res.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedNote?._id) {
      handleNewNote();
      return;
    }
    if (!window.confirm('Delete this note permanently?')) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await api.delete(`/api/notes/${selectedNote._id}`);
      const updated = notes.filter((n) => n._id !== selectedNote._id);
      setNotes(updated);
      if (updated.length > 0) {
        selectNote(updated[0]);
      } else {
        handleNewNote();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete note');
    }
  };

  const handleAddTag = (e) => {
    e.preventDefault();
    const trimmed = tagInput.trim().toUpperCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tToRemove) => {
    setTags(tags.filter((t) => t !== tToRemove));
  };

  // Extract all note tags for filter
  const allNoteTags = Array.from(new Set(notes.flatMap((n) => n.tags || [])));

  const filteredNotes = notes.filter((n) => {
    if (filterTag === 'ALL') return true;
    return n.tags && n.tags.includes(filterTag);
  });

  const padNum = (num) => String(num).padStart(2, '0');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start min-h-[560px]">
      {/* Left Pane (35% / lg:col-span-4) */}
      <div className="lg:col-span-4 card-hairline p-5 space-y-5 bg-surface-container-low min-h-[560px] flex flex-col justify-between rounded-2xl border border-outline-variant/30">
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-outline-variant/30">
            <span className="font-nav-label text-xs text-on-surface">
              NOTES ({padNum(notes.length)})
            </span>
            <button
              onClick={handleNewNote}
              className="btn-primary !h-7 !px-3 !text-[9px]"
            >
              + NEW NOTE
            </button>
          </div>

          {/* Tag filter chips */}
          {allNoteTags.length > 0 && (
            <div className="flex flex-wrap gap-1 pb-2 border-b border-outline-variant/20">
              <button
                onClick={() => setFilterTag('ALL')}
                className={`font-mono-counter text-[9px] px-2 py-0.5 rounded cursor-pointer ${
                  filterTag === 'ALL' ? 'bg-on-surface text-surface' : 'text-on-surface-variant border border-outline-variant/30'
                }`}
              >
                ALL
              </button>
              {allNoteTags.map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterTag(t)}
                  className={`font-mono-counter text-[9px] px-2 py-0.5 rounded cursor-pointer ${
                    filterTag === t ? 'bg-on-surface text-surface' : 'text-on-surface-variant border border-outline-variant/30'
                  }`}
                >
                  #{t}
                </button>
              ))}
            </div>
          )}

          {/* List of hairline rows */}
          {loading ? (
            <div className="py-12 text-center text-xs font-mono-counter text-on-surface-variant">
              LOADING RESEARCH NOTES…
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="py-16 text-center text-xs text-on-surface-variant">
              No notes found. Create your first synthesis memo above.
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/20">
              {filteredNotes.map((note) => {
                const isSelected = selectedNote?._id === note._id;
                const firstLine = note.content?.split('\n')[0] || 'Untitled note';
                return (
                  <div
                    key={note._id}
                    onClick={() => selectNote(note)}
                    className={`py-3.5 px-2.5 -mx-1 rounded cursor-pointer transition-colors ${
                      isSelected ? 'bg-surface-container-high border-l-2 border-primary-container' : 'hover:bg-surface-container/60'
                    }`}
                  >
                    <p className="text-xs font-medium text-on-surface line-clamp-1 leading-snug">
                      {firstLine}
                    </p>
                    <div className="flex justify-between items-center pt-1.5 text-[10px] font-mono-counter text-on-surface-variant">
                      <div className="flex gap-1">
                        {(note.tags || []).slice(0, 2).map((t, idx) => (
                          <span key={idx} className="text-primary-container">
                            #{t}
                          </span>
                        ))}
                      </div>
                      <span>
                        {note.updatedAt ? new Date(note.updatedAt).toLocaleDateString() : 'RECENT'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-outline-variant/25 text-[10px] font-mono-counter text-on-surface-variant">
          PERSISTENT KNOWLEDGE ARCHIVE
        </div>
      </div>

      {/* Right Pane: Note Editor (65% / lg:col-span-8) */}
      <div className="lg:col-span-8 card-hairline p-8 space-y-6 bg-surface min-h-[560px] flex flex-col justify-between rounded-2xl border border-outline-variant/30">
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-outline-variant/30">
            <span className="font-nav-label text-[10px] text-on-surface-variant tracking-widest">
              NOTE
            </span>
            <span className="font-mono-counter text-[10px] text-on-surface-variant">
              {selectedNote?.updatedAt
                ? `LAST EDITED ${new Date(selectedNote.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'NEW DRAFT'}
            </span>
          </div>

          {/* Large borderless textarea */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write markdown research notes, citations to cross-reference, and conceptual insights…"
            rows={12}
            className="w-full bg-transparent border-none text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none resize-none leading-relaxed font-sans"
          />

          {/* Tag Input with Chips: "METHOD", "TO-CITE" */}
          <div className="pt-4 border-t border-outline-variant/20 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-nav-label text-[10px] text-on-surface-variant">TAGS:</span>
              <div className="flex flex-wrap gap-1.5 items-center">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="chip-citation !text-[10px] flex items-center gap-1"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-black text-xs"
                    >
                      ×
                    </button>
                  </span>
                ))}

                <form onSubmit={handleAddTag} className="inline-block">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="+ Add tag"
                    className="bg-transparent border-b border-outline-variant/40 text-[11px] font-mono py-0.5 px-1 focus:outline-none focus:border-primary-container w-20 text-on-surface"
                  />
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-6 border-t border-outline-variant/30 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !content.trim()}
              className="btn-primary"
            >
              {saving ? 'SAVING…' : 'SAVE'}
            </button>
            <button
              onClick={handleNewNote}
              className="btn-secondary"
            >
              CANCEL
            </button>
          </div>

          {selectedNote?._id && (
            <button
              onClick={handleDelete}
              className="font-nav-label text-[10px] text-error hover:underline cursor-pointer"
            >
              DELETE
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotesManager;
