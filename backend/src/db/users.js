import { supabase } from "../lib/services.js";

/**
 * User Database Operations
 */
export const userDB = {
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
  async create({ email, password_hash, name, selected_year, email_notifications, analytics_sharing }) {
    const userData = {
      email,
      password_hash,
      name,
      selected_year,
      email_notifications,
      analytics_sharing,
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
