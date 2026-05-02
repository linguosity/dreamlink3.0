export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      bible_citations: {
        Row: {
          bible_book: string | null
          chapter: number | null
          citation_order: number | null
          created_at: string | null
          dream_entry_id: string | null
          end_verse: number | null
          full_text: string | null
          id: string
          source: string | null
          supporting_text: string | null
          verse: number | null
        }
        Insert: {
          bible_book?: string | null
          chapter?: number | null
          citation_order?: number | null
          created_at?: string | null
          dream_entry_id?: string | null
          end_verse?: number | null
          full_text?: string | null
          id?: string
          source?: string | null
          supporting_text?: string | null
          verse?: number | null
        }
        Update: {
          bible_book?: string | null
          chapter?: number | null
          citation_order?: number | null
          created_at?: string | null
          dream_entry_id?: string | null
          end_verse?: number | null
          full_text?: string | null
          id?: string
          source?: string | null
          supporting_text?: string | null
          verse?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bible_citations_dream_entry_id_fkey"
            columns: ["dream_entry_id"]
            isOneToOne: false
            referencedRelation: "dream_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      chatgpt_interactions: {
        Row: {
          created_at: string | null
          dream_entry_id: string | null
          id: string
          model: string | null
          prompt: string | null
          response: string | null
          temperature: number | null
        }
        Insert: {
          created_at?: string | null
          dream_entry_id?: string | null
          id?: string
          model?: string | null
          prompt?: string | null
          response?: string | null
          temperature?: number | null
        }
        Update: {
          created_at?: string | null
          dream_entry_id?: string | null
          id?: string
          model?: string | null
          prompt?: string | null
          response?: string | null
          temperature?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chatgpt_interactions_dream_entry_id_fkey"
            columns: ["dream_entry_id"]
            isOneToOne: false
            referencedRelation: "dream_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      client_error_logs: {
        Row: {
          created_at: string | null
          error_context: Json | null
          error_message: string
          error_type: string
          id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_context?: Json | null
          error_message: string
          error_type: string
          id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_context?: Json | null
          error_message?: string
          error_type?: string
          id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      dream_entries: {
        Row: {
          analysis_depth: string | null
          analysis_summary: string | null
          bible_refs: string[] | null
          color_symbolism: string | null
          comparison_group_id: string | null
          conclusion_sentence: string | null
          created_at: string | null
          dream_summary: string | null
          formatted_analysis: string | null
          gematria_interpretation: string | null
          id: string
          image_aesthetic_used: string | null
          image_url: string | null
          original_text: string | null
          original_text_enc: string | null
          personalized_summary: string | null
          raw_analysis: Json | null
          raw_analysis_enc: string | null
          reading_level_used: string | null
          search_vector: unknown
          supporting_points: string[] | null
          tags: string[] | null
          title: string | null
          topic_sentence: string | null
          user_id: string | null
        }
        Insert: {
          analysis_depth?: string | null
          analysis_summary?: string | null
          bible_refs?: string[] | null
          color_symbolism?: string | null
          comparison_group_id?: string | null
          conclusion_sentence?: string | null
          created_at?: string | null
          dream_summary?: string | null
          formatted_analysis?: string | null
          gematria_interpretation?: string | null
          id?: string
          image_aesthetic_used?: string | null
          image_url?: string | null
          original_text?: string | null
          original_text_enc?: string | null
          personalized_summary?: string | null
          raw_analysis?: Json | null
          raw_analysis_enc?: string | null
          reading_level_used?: string | null
          search_vector?: unknown
          supporting_points?: string[] | null
          tags?: string[] | null
          title?: string | null
          topic_sentence?: string | null
          user_id?: string | null
        }
        Update: {
          analysis_depth?: string | null
          analysis_summary?: string | null
          bible_refs?: string[] | null
          color_symbolism?: string | null
          comparison_group_id?: string | null
          conclusion_sentence?: string | null
          created_at?: string | null
          dream_summary?: string | null
          formatted_analysis?: string | null
          gematria_interpretation?: string | null
          id?: string
          image_aesthetic_used?: string | null
          image_url?: string | null
          original_text?: string | null
          original_text_enc?: string | null
          personalized_summary?: string | null
          raw_analysis?: Json | null
          raw_analysis_enc?: string | null
          reading_level_used?: string | null
          search_vector?: unknown
          supporting_points?: string[] | null
          tags?: string[] | null
          title?: string | null
          topic_sentence?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      dream_prompts: {
        Row: {
          created_at: string
          created_by: string | null
          depth_deep: string | null
          depth_profound: string | null
          depth_shallow: string | null
          forbidden_phrases: string[]
          format_instructions: string
          id: string
          is_active: boolean
          main_instructions: string
          notes: string | null
          reading_level_celestial_insight: string
          reading_level_divine_revelation: string
          reading_level_prophetic_wisdom: string
          reading_level_radiant_clarity: string
          system_message: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          depth_deep?: string | null
          depth_profound?: string | null
          depth_shallow?: string | null
          forbidden_phrases?: string[]
          format_instructions?: string
          id?: string
          is_active?: boolean
          main_instructions?: string
          notes?: string | null
          reading_level_celestial_insight?: string
          reading_level_divine_revelation?: string
          reading_level_prophetic_wisdom?: string
          reading_level_radiant_clarity?: string
          system_message?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          depth_deep?: string | null
          depth_profound?: string | null
          depth_shallow?: string | null
          forbidden_phrases?: string[]
          format_instructions?: string
          id?: string
          is_active?: boolean
          main_instructions?: string
          notes?: string | null
          reading_level_celestial_insight?: string
          reading_level_divine_revelation?: string
          reading_level_prophetic_wisdom?: string
          reading_level_radiant_clarity?: string
          system_message?: string
          version?: number
        }
        Relationships: []
      }
      newsletter_signups: {
        Row: {
          created_at: string | null
          email: string
          id: string
          source: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          source?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          source?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number | null
          created_at: string | null
          currency: string | null
          id: string
          status: string | null
          stripe_payment_id: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          status?: string | null
          stripe_payment_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          status?: string | null
          stripe_payment_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profile: {
        Row: {
          analysis_depth: string | null
          bible_version: string | null
          created_at: string | null
          dismissed_hints: string[]
          id: string
          image_aesthetic: string | null
          is_admin: boolean | null
          language: string | null
          preferences: Json | null
          reading_level: string | null
          test_mode_aesthetics: string[] | null
          test_mode_depths: string[] | null
          test_mode_enabled: boolean | null
          test_mode_reading_levels: string[] | null
          user_id: string | null
        }
        Insert: {
          analysis_depth?: string | null
          bible_version?: string | null
          created_at?: string | null
          dismissed_hints?: string[]
          id?: string
          image_aesthetic?: string | null
          is_admin?: boolean | null
          language?: string | null
          preferences?: Json | null
          reading_level?: string | null
          test_mode_aesthetics?: string[] | null
          test_mode_depths?: string[] | null
          test_mode_enabled?: boolean | null
          test_mode_reading_levels?: string[] | null
          user_id?: string | null
        }
        Update: {
          analysis_depth?: string | null
          bible_version?: string | null
          created_at?: string | null
          dismissed_hints?: string[]
          id?: string
          image_aesthetic?: string | null
          is_admin?: boolean | null
          language?: string | null
          preferences?: Json | null
          reading_level?: string | null
          test_mode_aesthetics?: string[] | null
          test_mode_depths?: string[] | null
          test_mode_enabled?: boolean | null
          test_mode_reading_levels?: string[] | null
          user_id?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string | null
          credits: number | null
          current_period_end: string | null
          id: string
          plan: string | null
          status: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          credits?: number | null
          current_period_end?: string | null
          id?: string
          plan?: string | null
          status?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          credits?: number | null
          current_period_end?: string | null
          id?: string
          plan?: string | null
          status?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      build_citation_reference: {
        Args: { book: string; chapter: number; verse: number }
        Returns: string
      }
      is_admin: { Args: { check_user_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
