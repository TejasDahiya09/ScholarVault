import authService from "../services/auth.js";

/**
 * Auth Controller
 */
export const authController = {
  /**
   * Register endpoint
   */
  async register(req, res, next) {
    try {
      const { email, password, name, selected_year } = req.body;

      const result = await authService.register({ email, password, name, selected_year });

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Login endpoint
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const result = await authService.login({ email, password });

      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get current user
   */
  async getCurrentUser(req, res, next) {
    try {
      const user = await authService.getCurrentUser(req.user.userId);
      res.json(user);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(req, res, next) {
    try {
      const { name } = req.body;
      const user = await authService.updateProfile(req.user.userId, { name });
      res.json(user);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Change password
   */
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(req.user.userId, currentPassword, newPassword);
      res.json({ message: 'Password updated successfully' });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Change email
   */
  async changeEmail(req, res, next) {
    try {
      const { email } = req.body;
      const user = await authService.changeEmail(req.user.userId, email);
      res.json(user);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Delete account
   */
  async deleteAccount(req, res, next) {
    try {
      await authService.deleteAccount(req.user.userId);
      res.json({ message: 'Account deleted successfully' });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update selected year
   */
  async updateYear(req, res, next) {
    try {
      const { year } = req.body;
      if (!year || (year !== '1st Year' && year !== '2nd Year')) {
        return res.status(400).json({ error: 'Invalid year. Must be "1st Year" or "2nd Year"' });
      }
      const user = await authService.updateProfile(req.user.userId, { selected_year: year });
      res.json(user);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update user preferences (email notifications, analytics sharing, study goal, notifications)
   */
  async updatePreferences(req, res, next) {
    try {
      const { email_notifications, analytics_sharing, selected_year, study_goal, notifications_enabled } = req.body;
      const user = await authService.updatePreferences(req.user.userId, { email_notifications, analytics_sharing, selected_year, study_goal, notifications_enabled });
      res.json(user);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Export user data
   */
  async exportData(req, res, next) {
    try {
      const data = await authService.exportUserData(req.user.userId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
};

export default authController;
