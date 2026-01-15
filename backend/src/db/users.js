import { supabase } from "../lib/services.js";

/**
 * User Database Operations
 */
export const userDB = {
    /**
     * Activate streak freeze for user
     * durationDays: 1-7
     */
    async activateFreeze(userId, durationDays = 1) {
      if (durationDays < 1 || durationDays > 7) throw new Error('Freeze duration must be 1-7 days');
      // Fetch user
      const user = await userDB.findById(userId);
      if (!user) throw new Error('User not found');
      if ((user.freeze_tokens || 0) < 1) throw new Error('No freeze tokens available');
      if (user.freeze_active_until && new Date(user.freeze_active_until) > new Date()) throw new Error('Freeze already active');
      // Activate freeze
      const until = new Date();
      until.setDate(until.getDate() + durationDays);
      const updates = {
        freeze_tokens: (user.freeze_tokens || 0) - 1,
        freeze_active_until: until.toISOString(),
      };
      await userDB.update(userId, updates);
      // Log freeze usage (could be a separate table)
      return updates;
    },

    /**
     * Earn freeze token after 14 valid streak days
     */
    async earnFreezeToken(userId) {
      const user = await userDB.findById(userId);
      if (!user) throw new Error('User not found');
      if ((user.freeze_tokens || 0) >= 2) return null;
      const updates = { freeze_tokens: (user.freeze_tokens || 0) + 1 };
      await userDB.update(userId, updates);
      return updates;
    },

    /**
     * Check if freeze is active for user
     */
    async isFreezeActive(userId) {
      const user = await userDB.findById(userId);
      if (!user) return false;
      return user.freeze_active_until && new Date(user.freeze_active_until) > new Date();
    },
  /**
   * Find user by email
   */
  async findByEmail(email) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(`Database error: ${error.message}`);
    }

    return data || null;
  },

  /**
   * Find user by ID
   */
  async findById(id) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(`Database error: ${error.message}`);
    }

    return data || null;
  },

  /**
   * Create new user
   */
  async create({ email, password_hash, name, selected_year, email_notifications, analytics_sharing, study_goal, notifications_enabled }) {
    const userData = {
      email,
      password_hash,
      name,
      selected_year,
      email_notifications,
      analytics_sharing,
      study_goal,
      notifications_enabled,
    };
    
    const { data, error } = await supabase
      .from("users")
      .insert([userData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return data;
  },

  /**
   * Update user profile
   */
  async update(id, updates) {
    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }

    return data;
  },

  /**
   * Delete user
   */
  async delete(id) {
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  },
};

export default userDB;
