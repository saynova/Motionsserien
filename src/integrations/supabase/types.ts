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
  public: {
    Tables: {
      announcements: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          message: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          message?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          message?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          approved_at: string | null
          court: number
          division: number
          id: string
          match_no: number
          s1a: number | null
          s1b: number | null
          s2a: number | null
          s2b: number | null
          s3a: number | null
          s3b: number | null
          season_id: string
          start_time: string
          status: string
          submitted_at: string | null
          submitted_by: string | null
          team_a_id: string
          team_b_id: string
          week_no: number
        }
        Insert: {
          approved_at?: string | null
          court: number
          division: number
          id?: string
          match_no: number
          s1a?: number | null
          s1b?: number | null
          s2a?: number | null
          s2b?: number | null
          s3a?: number | null
          s3b?: number | null
          season_id: string
          start_time: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          team_a_id: string
          team_b_id: string
          week_no: number
        }
        Update: {
          approved_at?: string | null
          court?: number
          division?: number
          id?: string
          match_no?: number
          s1a?: number | null
          s1b?: number | null
          s2a?: number | null
          s2b?: number | null
          s3a?: number | null
          s3b?: number | null
          season_id?: string
          start_time?: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          team_a_id?: string
          team_b_id?: string
          week_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "matches_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          email: string
          id: string
          name: string
          status: string
          team_name: string
          topic: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          email: string
          id?: string
          name?: string
          status?: string
          team_name?: string
          topic?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          status?: string
          team_name?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      registration_settings: {
        Row: {
          created_at: string
          id: string
          is_open: boolean
          target_season: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_open?: boolean
          target_season?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_open?: boolean
          target_season?: string
          updated_at?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          created_at: string
          id: string
          phone: string
          player1_email: string
          player1_name: string
          player2_email: string
          player2_name: string
          previous_division: number | null
          status: string
          target_season: string
          team_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          phone?: string
          player1_email: string
          player1_name: string
          player2_email: string
          player2_name: string
          previous_division?: number | null
          status?: string
          target_season?: string
          team_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          phone?: string
          player1_email?: string
          player1_name?: string
          player2_email?: string
          player2_name?: string
          previous_division?: number | null
          status?: string
          target_season?: string
          team_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      season_seeds: {
        Row: {
          created_at: string
          division: number
          id: string
          position: number
          target_season: string
          team_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          division: number
          id?: string
          position: number
          target_season?: string
          team_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          division?: number
          id?: string
          position?: number
          target_season?: string
          team_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      seasons: {
        Row: {
          created_at: string
          current_week: number
          id: string
          is_active: boolean
          name: string
          payment_details: string | null
          start_monday: string
          total_weeks: number
        }
        Insert: {
          created_at?: string
          current_week?: number
          id?: string
          is_active?: boolean
          name: string
          payment_details?: string | null
          start_monday: string
          total_weeks?: number
        }
        Update: {
          created_at?: string
          current_week?: number
          id?: string
          is_active?: boolean
          name?: string
          payment_details?: string | null
          start_monday?: string
          total_weeks?: number
        }
        Relationships: []
      }
      shuttle_orders: {
        Row: {
          buyer_name: string
          created_at: string
          id: string
          quantity: number
          status: string
          team_name: string
          updated_at: string
        }
        Insert: {
          buyer_name: string
          created_at?: string
          id?: string
          quantity?: number
          status?: string
          team_name: string
          updated_at?: string
        }
        Update: {
          buyer_name?: string
          created_at?: string
          id?: string
          quantity?: number
          status?: string
          team_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_players: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          player_no: number
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          player_no: number
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          player_no?: number
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
          start_division: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          start_division: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          start_division?: number
        }
        Relationships: []
      }
      week_slots: {
        Row: {
          division: number
          id: string
          position: number
          season_id: string
          team_id: string
          tie_break_adj: number
          week_no: number
        }
        Insert: {
          division: number
          id?: string
          position: number
          season_id: string
          team_id: string
          tie_break_adj?: number
          week_no: number
        }
        Update: {
          division?: number
          id?: string
          position?: number
          season_id?: string
          team_id?: string
          tie_break_adj?: number
          week_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "week_slots_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "week_slots_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      registered_teams: {
        Row: {
          created_at: string | null
          division: number | null
          team_name: string | null
        }
        Relationships: []
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
