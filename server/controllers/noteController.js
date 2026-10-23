import Note from '../models/Note.js';
import Paper from '../models/Paper.js';

/**
 * Get all notes for a specific research paper
 * GET /api/notes/paper/:paperId
 */
export const getNotesByPaper = async (req, res) => {
  try {
    const { paperId } = req.params;

    const notes = await Note.find({
      paperId,
      userId: req.user.userId,
    }).sort({ createdAt: -1 });

    res.status(200).json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ message: 'Error fetching notes for this paper' });
  }
};

/**
 * Create a new note for a paper
 * POST /api/notes/paper/:paperId
 */
export const createNote = async (req, res) => {
  try {
    const paperId = req.params.paperId || req.body.paperId;
    const { content, tags = [] } = req.body;

    if (!paperId) {
      return res.status(400).json({ message: 'Paper ID is required' });
    }

    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'Note content cannot be empty' });
    }

    const paper = await Paper.findOne({ _id: paperId, userId: req.user.userId });
    if (!paper) {
      return res.status(404).json({ message: 'Paper not found' });
    }

    const note = new Note({
      userId: req.user.userId,
      paperId,
      content: content.trim(),
      tags: Array.isArray(tags) ? tags.map(t => t.trim()).filter(Boolean) : [],
    });

    await note.save();
    res.status(201).json(note);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ message: 'Error saving research note' });
  }
};

/**
 * Update an existing note
 * PUT /api/notes/:id
 */
export const updateNote = async (req, res) => {
  try {
    const { content, tags } = req.body;

    const note = await Note.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (content !== undefined) note.content = content.trim();
    if (tags !== undefined && Array.isArray(tags)) {
      note.tags = tags.map(t => t.trim()).filter(Boolean);
    }

    await note.save();
    res.status(200).json(note);
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ message: 'Error updating research note' });
  }
};

/**
 * Delete a note
 * DELETE /api/notes/:id
 */
export const deleteNote = async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    res.status(200).json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ message: 'Error deleting note' });
  }
};
