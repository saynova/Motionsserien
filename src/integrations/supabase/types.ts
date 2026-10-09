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
      account_links: {
        Row: {
          created_at: string
          id: string
          player_no: number
          registration_id: string
          season_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_no: number
          registration_id: string
          season_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          player_no?: number
          registration_id?: string
          season_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_links_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_2fa_settings: {
        Row: {
          backup_code_hashes: string[]
          created_at: string
          id: string
          notify_email: string
          totp_enabled: boolean
          totp_secret: string | null
          trust_days: number
          updated_at: string
        }
        Insert: {
          backup_code_hashes?: string[]
          created_at?: string
          id?: string
          notify_email?: string
          totp_enabled?: boolean
          totp_secret?: string | null
          trust_days?: number
          updated_at?: string
        }
        Update: {
          backup_code_hashes?: string[]
          created_at?: string
          id?: string
          notify_email?: string
          totp_enabled?: boolean
          totp_secret?: string | null
          trust_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      admin_login_codes: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          sent_to: string | null
          used_at: string | null
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          sent_to?: string | null
          used_at?: string | null
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          sent_to?: string | null
          used_at?: string | null
        }
        Relationships: []
      }
      admin_notification_dismissals: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      admin_trusted_devices: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          label: string | null
          last_used_at: string
          token_hash: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          label?: string | null
          last_used_at?: string
          token_hash: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          label?: string | null
          last_used_at?: string
          token_hash?: string
        }
        Relationships: []
      }
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
      champions: {
        Row: {
          created_at: string
          id: string
          image_path: string | null
          players: string
          season_title: string
          sort_order: number
          team_name: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_path?: string | null
          players?: string
          season_title?: string
          sort_order?: number
          team_name?: string
          updated_at?: string
          year?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_path?: string | null
          players?: string
          season_title?: string
          sort_order?: number
          team_name?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      cron_secrets: {
        Row: {
          created_at: string
          name: string
          token: string
        }
        Insert: {
          created_at?: string
          name: string
          token: string
        }
        Update: {
          created_at?: string
          name?: string
          token?: string
        }
        Relationships: []
      }
      email_settings: {
        Row: {
          closing_en: string
          closing_sv: string
          created_at: string
          footer: string
          id: string
          signature: string
          updated_at: string
        }
        Insert: {
          closing_en?: string
          closing_sv?: string
          created_at?: string
          footer?: string
          id?: string
          signature?: string
          updated_at?: string
        }
        Update: {
          closing_en?: string
          closing_sv?: string
          created_at?: string
          footer?: string
          id?: string
          signature?: string
          updated_at?: string
        }
        Relationships: []
      }
      gallery_photos: {
        Row: {
          caption: string
          created_at: string
          id: string
          image_path: string
          is_pinned: boolean
          media_type: string
          sort_order: number
          updated_at: string
          view_count: number
        }
        Insert: {
          caption?: string
          created_at?: string
          id?: string
          image_path: string
          is_pinned?: boolean
          media_type?: string
          sort_order?: number
          updated_at?: string
          view_count?: number
        }
        Update: {
          caption?: string
          created_at?: string
          id?: string
          image_path?: string
          is_pinned?: boolean
          media_type?: string
          sort_order?: number
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          email: string
          file_path: string | null
          id: string
          invoice_no: number
          player_name: string
          registration_id: string
          season_key: string
          status: string
          team_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          email: string
          file_path?: string | null
          id?: string
          invoice_no?: number
          player_name: string
          registration_id: string
          season_key: string
          status?: string
          team_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          email?: string
          file_path?: string | null
          id?: string
          invoice_no?: number
          player_name?: string
          registration_id?: string
          season_key?: string
          status?: string
          team_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
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
          submitted_device: string | null
          submitted_ip: string | null
          submitted_location: string | null
          submitted_team_id: string | null
          submitted_user_agent: string | null
          submitted_user_id: string | null
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
          submitted_device?: string | null
          submitted_ip?: string | null
          submitted_location?: string | null
          submitted_team_id?: string | null
          submitted_user_agent?: string | null
          submitted_user_id?: string | null
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
          submitted_device?: string | null
          submitted_ip?: string | null
          submitted_location?: string | null
          submitted_team_id?: string | null
          submitted_user_agent?: string | null
          submitted_user_id?: string | null
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
          attachment_path: string | null
          body: string
          body_en: string | null
          created_at: string
          email: string
          id: string
          name: string
          replied_at: string | null
          reply_body: string | null
          status: string
          team_name: string
          topic: string
          updated_at: string
        }
        Insert: {
          attachment_path?: string | null
          body: string
          body_en?: string | null
          created_at?: string
          email: string
          id?: string
          name?: string
          replied_at?: string | null
          reply_body?: string | null
          status?: string
          team_name?: string
          topic?: string
          updated_at?: string
        }
        Update: {
          attachment_path?: string | null
          body?: string
          body_en?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          replied_at?: string | null
          reply_body?: string | null
          status?: string
          team_name?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      oneday_registrations: {
        Row: {
          category: string
          created_at: string
          email: string
          id: string
          level: string
          payment_status: string
          phone: string
          player1_name: string
          player2_name: string
          seen_by_admin: boolean
          status: string
          team_name: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          email: string
          id?: string
          level?: string
          payment_status?: string
          phone: string
          player1_name: string
          player2_name: string
          seen_by_admin?: boolean
          status?: string
          team_name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          email?: string
          id?: string
          level?: string
          payment_status?: string
          phone?: string
          player1_name?: string
          player2_name?: string
          seen_by_admin?: boolean
          status?: string
          team_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      oneday_settings: {
        Row: {
          created_at: string
          event_date: string
          id: string
          is_open: boolean
          max_approved_teams: number | null
          max_total_registrations: number | null
          menu_label: string
          name: string
          payment_details: string
          registration_deadline: string | null
          updated_at: string
          venue: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          event_date?: string
          id?: string
          is_open?: boolean
          max_approved_teams?: number | null
          max_total_registrations?: number | null
          menu_label?: string
          name?: string
          payment_details?: string
          registration_deadline?: string | null
          updated_at?: string
          venue?: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          event_date?: string
          id?: string
          is_open?: boolean
          max_approved_teams?: number | null
          max_total_registrations?: number | null
          menu_label?: string
          name?: string
          payment_details?: string
          registration_deadline?: string | null
          updated_at?: string
          venue?: string
          visible?: boolean
        }
        Relationships: []
      }
      partner_requests: {
        Row: {
          availability: string
          created_at: string
          email: string
          id: string
          name: string
          note: string
          previous_division: number | null
          registration_id: string | null
          season_key: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          availability?: string
          created_at?: string
          email: string
          id?: string
          name: string
          note?: string
          previous_division?: number | null
          registration_id?: string | null
          season_key: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          availability?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          note?: string
          previous_division?: number | null
          registration_id?: string | null
          season_key?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_requests_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_settings: {
        Row: {
          created_at: string
          id: string
          is_open: boolean
          registration_deadline: string | null
          require_sign_in: boolean
          target_season: string
          tournament_starts_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_open?: boolean
          registration_deadline?: string | null
          require_sign_in?: boolean
          target_season?: string
          tournament_starts_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_open?: boolean
          registration_deadline?: string | null
          require_sign_in?: boolean
          target_season?: string
          tournament_starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          confirmation_expires_at: string | null
          created_at: string
          id: string
          is_paid: boolean
          late_cancel_ack: boolean
          phone: string
          player1_confirmation_hash: string | null
          player1_confirmed_at: string | null
          player1_email: string
          player1_name: string
          player2_confirmation_hash: string | null
          player2_confirmed_at: string | null
          player2_email: string
          player2_name: string
          player2_phone: string
          previous_division: number | null
          requires_player_confirmation: boolean
          status: string
          swish_ref: string
          target_season: string
          team_name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          confirmation_expires_at?: string | null
          created_at?: string
          id?: string
          is_paid?: boolean
          late_cancel_ack?: boolean
          phone?: string
          player1_confirmation_hash?: string | null
          player1_confirmed_at?: string | null
          player1_email: string
          player1_name: string
          player2_confirmation_hash?: string | null
          player2_confirmed_at?: string | null
          player2_email?: string
          player2_name?: string
          player2_phone?: string
          previous_division?: number | null
          requires_player_confirmation?: boolean
          status?: string
          swish_ref?: string
          target_season?: string
          team_name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          confirmation_expires_at?: string | null
          created_at?: string
          id?: string
          is_paid?: boolean
          late_cancel_ack?: boolean
          phone?: string
          player1_confirmation_hash?: string | null
          player1_confirmed_at?: string | null
          player1_email?: string
          player1_name?: string
          player2_confirmation_hash?: string | null
          player2_confirmed_at?: string | null
          player2_email?: string
          player2_name?: string
          player2_phone?: string
          previous_division?: number | null
          requires_player_confirmation?: boolean
          status?: string
          swish_ref?: string
          target_season?: string
          team_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      score_reminders: {
        Row: {
          id: string
          match_id: string
          sent_at: string
          sent_to: number
        }
        Insert: {
          id?: string
          match_id: string
          sent_at?: string
          sent_to?: number
        }
        Update: {
          id?: string
          match_id?: string
          sent_at?: string
          sent_to?: number
        }
        Relationships: [
          {
            foreignKeyName: "score_reminders_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
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
          auto_approve_enabled: boolean
          auto_approve_offset_days: number
          auto_approve_time: string
          auto_finalize_enabled: boolean
          auto_finalize_offset_days: number
          auto_finalize_time: string
          backup_email: string
          backup_enabled: boolean
          backup_offset_days: number
          backup_time: string
          created_at: string
          current_week: number
          id: string
          invoices_open: boolean
          is_active: boolean
          name: string
          payment_details: string | null
          registration_key: string | null
          reminder_enabled: boolean
          reminder_offset_days: number
          reminder_time: string
          require_login_for_scores: boolean
          score_submission_enabled: boolean
          score_unlock_at: string | null
          start_monday: string
          total_weeks: number
          weekly_lock_day: number
          weekly_lock_time: string
          weekly_unlock_day: number
          weekly_unlock_time: string
          weekly_window_enabled: boolean
        }
        Insert: {
          auto_approve_enabled?: boolean
          auto_approve_offset_days?: number
          auto_approve_time?: string
          auto_finalize_enabled?: boolean
          auto_finalize_offset_days?: number
          auto_finalize_time?: string
          backup_email?: string
          backup_enabled?: boolean
          backup_offset_days?: number
          backup_time?: string
          created_at?: string
          current_week?: number
          id?: string
          invoices_open?: boolean
          is_active?: boolean
          name: string
          payment_details?: string | null
          registration_key?: string | null
          reminder_enabled?: boolean
          reminder_offset_days?: number
          reminder_time?: string
          require_login_for_scores?: boolean
          score_submission_enabled?: boolean
          score_unlock_at?: string | null
          start_monday: string
          total_weeks?: number
          weekly_lock_day?: number
          weekly_lock_time?: string
          weekly_unlock_day?: number
          weekly_unlock_time?: string
          weekly_window_enabled?: boolean
        }
        Update: {
          auto_approve_enabled?: boolean
          auto_approve_offset_days?: number
          auto_approve_time?: string
          auto_finalize_enabled?: boolean
          auto_finalize_offset_days?: number
          auto_finalize_time?: string
          backup_email?: string
          backup_enabled?: boolean
          backup_offset_days?: number
          backup_time?: string
          created_at?: string
          current_week?: number
          id?: string
          invoices_open?: boolean
          is_active?: boolean
          name?: string
          payment_details?: string | null
          registration_key?: string | null
          reminder_enabled?: boolean
          reminder_offset_days?: number
          reminder_time?: string
          require_login_for_scores?: boolean
          score_submission_enabled?: boolean
          score_unlock_at?: string | null
          start_monday?: string
          total_weeks?: number
          weekly_lock_day?: number
          weekly_lock_time?: string
          weekly_unlock_day?: number
          weekly_unlock_time?: string
          weekly_window_enabled?: boolean
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
      site_branding: {
        Row: {
          created_at: string
          header_subtitle: string
          header_title: string
          id: string
          show_missing_banner: boolean
          show_signin: boolean
          tournament_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          header_subtitle?: string
          header_title?: string
          id?: string
          show_missing_banner?: boolean
          show_signin?: boolean
          tournament_name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          header_subtitle?: string
          header_title?: string
          id?: string
          show_missing_banner?: boolean
          show_signin?: boolean
          tournament_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_support_settings: {
        Row: {
          created_at: string
          donation_visible: boolean
          homepage: string
          id: string
          qr_image_path: string | null
          registration_price: number
          season_finished: boolean
          shuttle_price: number
          sponsor_details: string
          sponsor_label: string
          sponsor_visible: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          donation_visible?: boolean
          homepage?: string
          id?: string
          qr_image_path?: string | null
          registration_price?: number
          season_finished?: boolean
          shuttle_price?: number
          sponsor_details?: string
          sponsor_label?: string
          sponsor_visible?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          donation_visible?: boolean
          homepage?: string
          id?: string
          qr_image_path?: string | null
          registration_price?: number
          season_finished?: boolean
          shuttle_price?: number
          sponsor_details?: string
          sponsor_label?: string
          sponsor_visible?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      team_payments: {
        Row: {
          created_at: string
          id: string
          is_paid: boolean
          note: string
          paid_at: string | null
          reminded_at: string | null
          season_id: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_paid?: boolean
          note?: string
          paid_at?: string | null
          reminded_at?: string | null
          season_id: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_paid?: boolean
          note?: string
          paid_at?: string | null
          reminded_at?: string | null
          season_id?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_payments_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_payments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
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
      visit_logs: {
        Row: {
          browser: string
          city: string
          country: string
          created_at: string
          device: string
          id: string
          ip: string
          os: string
          path: string
          referrer: string
          user_agent: string
        }
        Insert: {
          browser?: string
          city?: string
          country?: string
          created_at?: string
          device?: string
          id?: string
          ip?: string
          os?: string
          path?: string
          referrer?: string
          user_agent?: string
        }
        Update: {
          browser?: string
          city?: string
          country?: string
          created_at?: string
          device?: string
          id?: string
          ip?: string
          os?: string
          path?: string
          referrer?: string
          user_agent?: string
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
      weekly_backups: {
        Row: {
          created_at: string
          file_path: string
          id: string
          season_id: string
          sent_to: string
          week_no: number
        }
        Insert: {
          created_at?: string
          file_path: string
          id?: string
          season_id: string
          sent_to: string
          week_no: number
        }
        Update: {
          created_at?: string
          file_path?: string
          id?: string
          season_id?: string
          sent_to?: string
          week_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_backups_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
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
      claim_invoice: {
        Args: {
          _amount: number
          _email: string
          _player_name: string
          _registration_id: string
          _user_id: string
        }
        Returns: string
      }
      confirm_matched_player: { Args: { _hash: string }; Returns: Json }
      create_matched_team: {
        Args: {
          _first_id: string
          _hash1: string
          _hash2: string
          _second_id: string
          _team_name: string
        }
        Returns: string
      }
      increment_gallery_view: { Args: { _id: string }; Returns: undefined }
      rename_registered_team: {
        Args: { _id: string; _name: string }
        Returns: undefined
      }
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
