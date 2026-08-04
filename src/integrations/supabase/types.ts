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
    PostgrestVersion: "14.5"
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
      anonymous_sessions: {
        Row: {
          cefr_level: string | null
          claimed_by_user_id: string | null
          completed_at: string | null
          created_at: string
          email: string | null
          focus: string | null
          grammar_cefr_level: string | null
          grammar_completed_at: string | null
          grammar_intake: Json | null
          grammar_score_summary: string | null
          grammar_test_answers: Json | null
          grammar_test_questions: Json | null
          id: string
          intake: Json | null
          language: string
          name: string
          score_summary: string | null
          session_token_hash: string | null
          test_answers: Json | null
          test_questions: Json | null
        }
        Insert: {
          cefr_level?: string | null
          claimed_by_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          email?: string | null
          focus?: string | null
          grammar_cefr_level?: string | null
          grammar_completed_at?: string | null
          grammar_intake?: Json | null
          grammar_score_summary?: string | null
          grammar_test_answers?: Json | null
          grammar_test_questions?: Json | null
          id?: string
          intake?: Json | null
          language?: string
          name?: string
          score_summary?: string | null
          session_token_hash?: string | null
          test_answers?: Json | null
          test_questions?: Json | null
        }
        Update: {
          cefr_level?: string | null
          claimed_by_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          email?: string | null
          focus?: string | null
          grammar_cefr_level?: string | null
          grammar_completed_at?: string | null
          grammar_intake?: Json | null
          grammar_score_summary?: string | null
          grammar_test_answers?: Json | null
          grammar_test_questions?: Json | null
          id?: string
          intake?: Json | null
          language?: string
          name?: string
          score_summary?: string | null
          session_token_hash?: string | null
          test_answers?: Json | null
          test_questions?: Json | null
        }
        Relationships: []
      }
      attempt_answers: {
        Row: {
          attempt_id: string
          id: string
          is_correct: boolean
          question_id: string
          selected_answer: string | null
        }
        Insert: {
          attempt_id: string
          id?: string
          is_correct: boolean
          question_id: string
          selected_answer?: string | null
        }
        Update: {
          attempt_id?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          content: string
          created_at: string
          excerpt: string
          id: string
          image_url: string | null
          published: boolean
          published_at: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          excerpt: string
          id?: string
          image_url?: string | null
          published?: boolean
          published_at?: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          excerpt?: string
          id?: string
          image_url?: string | null
          published?: boolean
          published_at?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          company_name: string
          contact_email: string
          contact_name: string
          created_at: string
          id: string
        }
        Insert: {
          company_name: string
          contact_email: string
          contact_name: string
          created_at?: string
          id?: string
        }
        Update: {
          company_name?: string
          contact_email?: string
          contact_name?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      grammar_attempt_answers: {
        Row: {
          attempt_id: string
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          question_order: number | null
          selected_answer: string | null
        }
        Insert: {
          attempt_id: string
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id: string
          question_order?: number | null
          selected_answer?: string | null
        }
        Update: {
          attempt_id?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          question_order?: number | null
          selected_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grammar_attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "grammar_test_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grammar_attempt_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "grammar_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      grammar_questions: {
        Row: {
          correct_answer: string
          created_at: string
          explanation: string
          explanation_hu: string | null
          grammar_tag: string | null
          id: string
          level: string
          options: Json
          question_text: string
          times_used: number
        }
        Insert: {
          correct_answer: string
          created_at?: string
          explanation?: string
          explanation_hu?: string | null
          grammar_tag?: string | null
          id?: string
          level: string
          options: Json
          question_text: string
          times_used?: number
        }
        Update: {
          correct_answer?: string
          created_at?: string
          explanation?: string
          explanation_hu?: string | null
          grammar_tag?: string | null
          id?: string
          level?: string
          options?: Json
          question_text?: string
          times_used?: number
        }
        Relationships: []
      }
      grammar_test_attempts: {
        Row: {
          anonymous_session_id: string | null
          created_at: string
          final_level: string
          id: string
          score: number
          total_questions: number
          user_id: string | null
        }
        Insert: {
          anonymous_session_id?: string | null
          created_at?: string
          final_level: string
          id?: string
          score: number
          total_questions?: number
          user_id?: string | null
        }
        Update: {
          anonymous_session_id?: string | null
          created_at?: string
          final_level?: string
          id?: string
          score?: number
          total_questions?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grammar_test_attempts_anonymous_session_id_fkey"
            columns: ["anonymous_session_id"]
            isOneToOne: false
            referencedRelation: "anonymous_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cefr_level: string | null
          completed_at: string | null
          created_at: string
          email: string
          focus: string | null
          intake: Json | null
          is_teacher: boolean
          language: string
          name: string
          preferred_skills: string[]
          score_summary: string | null
          test_answers: Json | null
          test_questions: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cefr_level?: string | null
          completed_at?: string | null
          created_at?: string
          email?: string
          focus?: string | null
          intake?: Json | null
          is_teacher?: boolean
          language?: string
          name?: string
          preferred_skills?: string[]
          score_summary?: string | null
          test_answers?: Json | null
          test_questions?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cefr_level?: string | null
          completed_at?: string | null
          created_at?: string
          email?: string
          focus?: string | null
          intake?: Json | null
          is_teacher?: boolean
          language?: string
          name?: string
          preferred_skills?: string[]
          score_summary?: string | null
          test_answers?: Json | null
          test_questions?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          correct_answer: string
          created_at: string
          explanation: string
          id: string
          level: string
          options: Json
          question_text: string
          skill: string
          times_used: number
        }
        Insert: {
          correct_answer: string
          created_at?: string
          explanation?: string
          id?: string
          level: string
          options: Json
          question_text: string
          skill: string
          times_used?: number
        }
        Update: {
          correct_answer?: string
          created_at?: string
          explanation?: string
          id?: string
          level?: string
          options?: Json
          question_text?: string
          skill?: string
          times_used?: number
        }
        Relationships: []
      }
      teacher_profiles: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          teacher_code: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          teacher_code: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          teacher_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      teacher_students: {
        Row: {
          id: string
          joined_at: string
          student_id: string
          teacher_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          student_id: string
          teacher_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          student_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "teacher_students_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      test_attempts: {
        Row: {
          anonymous_session_id: string | null
          created_at: string
          final_level: string
          id: string
          score: number
          total_questions: number
          user_id: string | null
        }
        Insert: {
          anonymous_session_id?: string | null
          created_at?: string
          final_level: string
          id?: string
          score: number
          total_questions?: number
          user_id?: string | null
        }
        Update: {
          anonymous_session_id?: string | null
          created_at?: string
          final_level?: string
          id?: string
          score?: number
          total_questions?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_anonymous_session_id_fkey"
            columns: ["anonymous_session_id"]
            isOneToOne: false
            referencedRelation: "anonymous_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
