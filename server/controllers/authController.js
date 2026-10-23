import mongoose from 'mongoose';
import User from '../models/User.js';
import Paper from '../models/Paper.js';
import ChatSession from '../models/ChatSession.js';
import Note from '../models/Note.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      password: hashedPassword,
    });

    await user.save();

    res.status(201).json({
      message: 'User registered successfully',
      userId: user._id,
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        userId: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'No account registered with this email address' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Password successfully updated' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Authenticated user password update with verification of current password
 * PUT /api/auth/change-password
 */
export const changePassword = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User account not found' });
    }

    // Strictly verify current password against the stored bcrypt hash
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Incorrect current password. Verification failed.' });
    }

    // Prevent re-using the exact same password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ message: 'New password cannot be identical to your current password.' });
    }

    // Hash and store the new password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: 'Security credentials updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Internal server error while updating password' });
  }
};

/**
 * Get personalized user activity, statistics, recent manuscripts, and timeline
 * GET /api/auth/activity
 */
export const getUserActivity = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Fetch user profile
    const user = await User.findById(userId).select('-password');

    // Fetch manuscripts uploaded by user
    const papers = await Paper.find({ userId }).sort({ uploadDate: -1 }).limit(10);
    const totalPapers = await Paper.countDocuments({ userId });
    
    // Aggregate total chunk vectors
    let totalVectors = 0;
    try {
      const chunkAgg = await Paper.aggregate([
        { $match: { userId: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId } },
        { $group: { _id: null, total: { $sum: '$chunkCount' } } },
      ]);
      totalVectors = chunkAgg.length > 0 ? chunkAgg[0].total : papers.reduce((s, p) => s + (p.chunkCount || 0), 0);
    } catch {
      totalVectors = papers.reduce((s, p) => s + (p.chunkCount || 0), 0);
    }

    // Fetch chat sessions & question count
    const sessions = await ChatSession.find({ userId })
      .populate('paperId', 'title')
      .sort({ updatedAt: -1 })
      .limit(10);
    const totalSessions = await ChatSession.countDocuments({ userId });
    let totalQuestions = 0;
    sessions.forEach((s) => {
      if (s.messages && Array.isArray(s.messages)) {
        totalQuestions += s.messages.filter((m) => m.role === 'user').length;
      }
    });

    // Fetch notes authored by user
    const notes = await Note.find({ userId })
      .populate('paperId', 'title')
      .sort({ createdAt: -1 })
      .limit(10);
    const totalNotes = await Note.countDocuments({ userId });

    // Build unified chronological activity timeline
    const timeline = [];

    // 1. Upload events
    papers.forEach((p) => {
      timeline.push({
        id: `upload-${p._id}`,
        type: 'UPLOAD',
        title: `Ingested Manuscript: "${p.title}"`,
        description: `${p.pageCount || 1} pages · ${p.chunkCount || 0} vectors · ${p.status?.toUpperCase() || 'READY'}`,
        timestamp: p.uploadDate,
        targetId: p._id,
        targetType: 'paper',
      });
    });

    // 2. Chat inquiries
    sessions.forEach((s) => {
      if (s.messages && s.messages.length > 0) {
        const lastUserMsg = s.messages.slice().reverse().find((m) => m.role === 'user');
        if (lastUserMsg) {
          const targetTitle = s.scope === 'paper' && s.paperId?.title ? s.paperId.title : 'Global Research Library';
          timeline.push({
            id: `query-${s._id}-${lastUserMsg._id || lastUserMsg.timestamp || Date.now()}`,
            type: 'QUERY',
            title: `Explored: "${lastUserMsg.content.length > 70 ? lastUserMsg.content.substring(0, 68) + '…' : lastUserMsg.content}"`,
            description: `Context: ${targetTitle} · ${s.messages.length} messages in dialogue`,
            timestamp: lastUserMsg.timestamp || s.updatedAt,
            targetId: s.paperId?._id || null,
            targetType: s.scope === 'paper' ? 'paperChat' : 'libraryChat',
          });
        }
      }
    });

    // 3. Annotations and notes
    notes.forEach((n) => {
      const paperTitle = n.paperId?.title || 'Manuscript';
      timeline.push({
        id: `note-${n._id}`,
        type: 'NOTE',
        title: `Annotated "${paperTitle}"`,
        description: `"${n.content.length > 70 ? n.content.substring(0, 68) + '…' : n.content}" ${n.page ? `(Page ${n.page})` : ''}`,
        timestamp: n.createdAt,
        targetId: n.paperId?._id || null,
        targetType: 'paperNotes',
      });
    });

    // Sort timeline descending by timestamp
    timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      user: user || { _id: userId, email: req.user.email },
      stats: {
        totalPapers,
        totalVectors,
        totalQuestions,
        totalNotes,
        totalSessions,
      },
      recentPapers: papers.slice(0, 6),
      activityTimeline: timeline.slice(0, 20),
    });
  } catch (error) {
    console.error('User activity error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update Researcher Profile with strict validation
 * PUT /api/auth/profile
 */
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, age, affiliation, academicRole, researchField, orcid, phone, bio } = req.body;

    // 1. Strict Name validation
    if (name !== undefined) {
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ message: 'Full name is required and cannot be empty.' });
      }
      if (!/^[a-zA-Z\s.'-]+$/.test(name.trim())) {
        return res.status(400).json({ message: 'Name can only contain letters, spaces, hyphens, and periods.' });
      }
      if (name.trim().length < 2 || name.trim().length > 80) {
        return res.status(400).json({ message: 'Name must be between 2 and 80 characters.' });
      }
    }

    // 2. Strict Age validation (Whole integer numbers only, 18-120)
    let parsedAge = null;
    if (age !== undefined && age !== null && age !== '') {
      const numAge = Number(age);
      if (!Number.isInteger(numAge) || isNaN(numAge)) {
        return res.status(400).json({ message: 'Age must be a valid whole number with no decimals or characters.' });
      }
      if (numAge < 18 || numAge > 120) {
        return res.status(400).json({ message: 'Age must be between 18 and 120.' });
      }
      parsedAge = numAge;
    }

    // 3. Strict ORCID validation (0000-0000-0000-0000 format)
    if (orcid && orcid.trim()) {
      const orcidPattern = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
      if (!orcidPattern.test(orcid.trim())) {
        return res.status(400).json({ message: 'ORCID iD must match the 16-character standard format: 0000-0000-0000-0000' });
      }
    }

    // 4. Strict Phone validation (E.164 / standard digits, 7-15 numbers)
    if (phone && phone.trim()) {
      const phoneDigits = phone.replace(/\D/g, '');
      if (phoneDigits.length < 7 || phoneDigits.length > 15) {
        return res.status(400).json({ message: 'Phone number must contain between 7 and 15 digits.' });
      }
      if (!/^\+?[0-9\s\-()]+$/.test(phone.trim())) {
        return res.status(400).json({ message: 'Phone number can only contain digits, spaces, hyphens, parentheses, and a leading +' });
      }
    }

    // 5. Strict Bio length validation
    if (bio && bio.length > 300) {
      return res.status(400).json({ message: 'Bio statement cannot exceed 300 characters.' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (parsedAge !== null) updateData.age = parsedAge;
    if (affiliation !== undefined) updateData.affiliation = affiliation.trim();
    if (academicRole !== undefined) updateData.academicRole = academicRole.trim();
    if (researchField !== undefined) updateData.researchField = researchField.trim();
    if (orcid !== undefined) updateData.orcid = orcid.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (bio !== undefined) updateData.bio = bio.trim();

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        userId: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        age: updatedUser.age,
        affiliation: updatedUser.affiliation,
        academicRole: updatedUser.academicRole,
        researchField: updatedUser.researchField,
        orcid: updatedUser.orcid,
        phone: updatedUser.phone,
        bio: updatedUser.bio,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Internal server error while updating profile' });
  }
};


