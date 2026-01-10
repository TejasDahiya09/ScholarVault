import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userDB from "../db/users.js";
import config from "../config.js";
import subjectsDB from "../db/subjects.js";
import notesDB from "../db/notes.js";
import completionsDB from "../db/completions.js";

/**
 * Authentication Service
 */
export const authService = {
  /**
   * Register new user
   */
  async register({ email, password, name, selected_year, email_notifications = true, analytics_sharing = false, study_goal = 'exam-prep', notifications_enabled = true }) {
    if (!email || !password || !name) {
      throw new Error("Missing required fields: email, password, name");
    }

    // Check if user already exists
    const existingUser = await userDB.findByEmail(email);
    if (existingUser) {
      throw new Error("Email already registered");
    }

    // Hash password (using 5 rounds for faster registration)
    const password_hash = await bcrypt.hash(password, 5);

    // Create user with preferences
    const user = await userDB.create({ email, password_hash, name, selected_year, email_notifications, analytics_sharing, study_goal, notifications_enabled });

    // Generate token
    const token = this.generateToken(user);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        selected_year: user.selected_year,
        email_notifications: user.email_notifications,
        analytics_sharing: user.analytics_sharing,
        study_goal: user.study_goal,
        notifications_enabled: user.notifications_enabled,
      },
    };
  },

  /**
   * Login user
   */
  async login({ email, password }) {
    if (!email || !password) {
      throw new Error("Missing email or password");
    }

    const user = await userDB.findByEmail(email);
    if (!user) {
      throw new Error("Invalid credentials");
    }

    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      throw new Error("Invalid credentials");
    }

    // Generate token
    const token = this.generateToken(user);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        selected_year: user.selected_year,
        email_notifications: user.email_notifications,
        analytics_sharing: user.analytics_sharing,
        study_goal: user.study_goal,
        notifications_enabled: user.notifications_enabled,
      },
    };
  },

  /**
   * Generate JWT token
   */
  generateToken(user) {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
      },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRY }
    );
  },

  /**
   * Verify token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, config.JWT_SECRET);
    } catch (err) {
      throw new Error("Invalid token");
    }
  },

  /**
   * Get current user by ID
   */
  async getCurrentUser(userId) {
    const user = await userDB.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      selected_year: user.selected_year,
      email_notifications: user.email_notifications,
      analytics_sharing: user.analytics_sharing,
      study_goal: user.study_goal,
      notifications_enabled: user.notifications_enabled,
      created_at: user.created_at,
    };
  },

  /**
   * Update user profile
   */
  async updateProfile(userId, updates) {
    const user = await userDB.update(userId, updates);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      email_notifications: user.email_notifications,
      analytics_sharing: user.analytics_sharing,
      selected_year: user.selected_year,
      study_goal: user.study_goal,
      notifications_enabled: user.notifications_enabled,
      created_at: user.created_at,
    };
  },

  /**
   * Update preferences (email notifications, analytics sharing, study goal, notifications)
   */
  async updatePreferences(userId, { email_notifications, analytics_sharing, selected_year, study_goal, notifications_enabled }) {
    const updates = {};
    if (email_notifications !== undefined) updates.email_notifications = email_notifications;
    if (analytics_sharing !== undefined) updates.analytics_sharing = analytics_sharing;
    if (selected_year !== undefined) updates.selected_year = selected_year;
    if (study_goal !== undefined) updates.study_goal = study_goal;
    if (notifications_enabled !== undefined) updates.notifications_enabled = notifications_enabled;
    const user = await userDB.update(userId, updates);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      selected_year: user.selected_year,
      email_notifications: user.email_notifications,
      analytics_sharing: user.analytics_sharing,
      study_goal: user.study_goal,
      notifications_enabled: user.notifications_enabled,
      created_at: user.created_at,
    };
  },

  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await userDB.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      throw new Error("Current password is incorrect");
    }

    // Hash new password
    const password_hash = await bcrypt.hash(newPassword, 10);

    // Update password
    await userDB.update(userId, { password_hash });
  },

  /**
   * Change email
   */
  async changeEmail(userId, newEmail) {
    // Check if email already exists
    const existing = await userDB.findByEmail(newEmail);
    if (existing && existing.id !== userId) {
      throw new Error("Email already in use");
    }

    const user = await userDB.update(userId, { email: newEmail });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: user.created_at,
    };
  },

  /**
   * Delete account
   */
  async deleteAccount(userId) {
    await userDB.delete(userId);
  },

  /**
   * Export user data
   */
  async exportUserData(userId) {
    const user = await userDB.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get user's subjects
    const userSubjects = await subjectsDB.getAll();
    
    // Get user's notes and study progress (note-level)
    let userNotes = [];
    let studyProgressBySubject = {};
    let totalNotes = 0;
    let completedNotes = 0;

    if (userSubjects.length > 0) {
      // Aggregate notes per subject
      for (const subject of userSubjects) {
        const subjectNotes = await notesDB.getAllBySubjectId(subject.id);
        userNotes = userNotes.concat(subjectNotes);

        // For each subject, compute completion using note-level progress
        const status = await completionsDB.getSubjectProgress(userId, subject.id);
        studyProgressBySubject[subject.id] = status;
        totalNotes += status.total_notes || 0;
        completedNotes += status.completed_notes || 0;
      }
    }

    const completionPercentage = totalNotes > 0 ? Math.round((completedNotes / totalNotes) * 100) : 0;

    return {
      profile: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      statistics: {
        total_subjects: userSubjects.length,
        total_notes: totalNotes,
        total_units: totalNotes, // deprecated: units mapped to notes
        completed_units: completedNotes,
        completion_percentage: completionPercentage,
      },
      subjects: userSubjects.map(s => ({
        id: s.id,
        name: s.name,
        branch: s.branch,
        semester: s.semester,
      })),
      notes: userNotes.map(n => ({
        id: n.id,
        subject_id: n.subject_id,
        unit_number: n.unit_number,
        title: n.title,
        content_preview: n.content ? n.content.substring(0, 100) : '',
        created_at: n.created_at,
      })),
      progress: Object.entries(studyProgressBySubject).map(([subjectId, status]) => ({
        subject_id: subjectId,
        total_notes: status.total_notes,
        completed_notes: status.completed_notes,
        percentage: status.percentage,
      })),
      export_metadata: {
        exported_at: new Date().toISOString(),
        export_version: "1.0",
      },
    };
  },
};

export default authService;
