export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          balance: number | null
          created_at: string | null
          id: number
          name: string
          type: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          id?: number
          name: string
          type: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          id?: number
          name?: string
          type?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          id: number
          name: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
          type?: string
        }
        Relationships: []
      }
      fleet_reports: {
        Row: {
          created_at: string | null
          driver_name: string
          id: string
          payment_screenshot: string | null
          remarks: string | null
          rent_date: string
          rent_paid_amount: number | null
          rent_paid_status: boolean | null
          rent_verified: boolean | null
          shift: string
          status: string | null
          submission_date: string
          toll: number | null
          total_cashcollect: number | null
          total_earnings: number | null
          total_trips: number | null
          uber_screenshot: string | null
          user_id: string
          vehicle_number: string | null
        }
        Insert: {
          created_at?: string | null
          driver_name: string
          id?: string
          payment_screenshot?: string | null
          remarks?: string | null
          rent_date: string
          rent_paid_amount?: number | null
          rent_paid_status?: boolean | null
          rent_verified?: boolean | null
          shift: string
          status?: string | null
          submission_date: string
          toll?: number | null
          total_cashcollect?: number | null
          total_earnings?: number | null
          total_trips?: number | null
          uber_screenshot?: string | null
          user_id: string
          vehicle_number?: string | null
        }
        Update: {
          created_at?: string | null
          driver_name?: string
          id?: string
          payment_screenshot?: string | null
          remarks?: string | null
          rent_date?: string
          rent_paid_amount?: number | null
          rent_paid_status?: boolean | null
          rent_verified?: boolean | null
          shift?: string
          status?: string | null
          submission_date?: string
          toll?: number | null
          total_cashcollect?: number | null
          total_earnings?: number | null
          total_trips?: number | null
          uber_screenshot?: string | null
          user_id?: string
          vehicle_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "rent_due_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fleet_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_reports_vehicle_number_fkey"
            columns: ["vehicle_number"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["vehicle_number"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "rent_due_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_history: {
        Row: {
          created_at: string
          id: string
          is_online: boolean
          payment_status: string
          rent_date: string
          shift: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_online: boolean
          payment_status: string
          rent_date: string
          shift: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_online?: boolean
          payment_status?: string
          rent_date?: string
          shift?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "rent_due_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_history: {
        Row: {
          created_at: string | null
          effective_from_date: string
          id: string
          shift: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          effective_from_date: string
          id?: string
          shift?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          effective_from_date?: string
          id?: string
          shift?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "rent_due_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "shift_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: number | null
          amount: number
          category_id: number | null
          created_at: string | null
          date: string
          description: string | null
          id: number
          type: string
        }
        Insert: {
          account_id?: number | null
          amount: number
          category_id?: number | null
          created_at?: string | null
          date: string
          description?: string | null
          id?: number
          type: string
        }
        Update: {
          account_id?: number | null
          amount?: number
          category_id?: number | null
          created_at?: string | null
          date?: string
          description?: string | null
          id?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_account"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_category"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          aadhar: string | null
          deposit_amount: number | null
          driver_id: string
          email_id: string
          expo_push_token: string | null
          health_score: string | null
          id: string
          is_verified: boolean | null
          joining_date: string
          license: string | null
          name: string | null
          offline_from_date: string | null
          online: boolean | null
          online_from_date: string | null
          pan: string | null
          phone_number: string
          profile_photo: string | null
          rent: number | null
          rent_due_status: string | null
          role: string | null
          shift: string | null
          total_earning: number | null
          total_trip: number | null
          vehicle_number: string | null
        }
        Insert: {
          aadhar?: string | null
          deposit_amount?: number | null
          driver_id: string
          email_id: string
          expo_push_token?: string | null
          health_score?: string | null
          id?: string
          is_verified?: boolean | null
          joining_date: string
          license?: string | null
          name?: string | null
          offline_from_date?: string | null
          online?: boolean | null
          online_from_date?: string | null
          pan?: string | null
          phone_number: string
          profile_photo?: string | null
          rent?: number | null
          rent_due_status?: string | null
          role?: string | null
          shift?: string | null
          total_earning?: number | null
          total_trip?: number | null
          vehicle_number?: string | null
        }
        Update: {
          aadhar?: string | null
          deposit_amount?: number | null
          driver_id?: string
          email_id?: string
          expo_push_token?: string | null
          health_score?: string | null
          id?: string
          is_verified?: boolean | null
          joining_date?: string
          license?: string | null
          name?: string | null
          offline_from_date?: string | null
          online?: boolean | null
          online_from_date?: string | null
          pan?: string | null
          phone_number?: string
          profile_photo?: string | null
          rent?: number | null
          rent_due_status?: string | null
          role?: string | null
          shift?: string | null
          total_earning?: number | null
          total_trip?: number | null
          vehicle_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_vehicle_number"
            columns: ["vehicle_number"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["vehicle_number"]
          },
        ]
      }
      vehicles: {
        Row: {
          assigned_driver_1: string | null
          assigned_driver_2: string | null
          created_at: string | null
          deposit: number | null
          fleet_name: string | null
          id: string | null
          online: boolean | null
          status: string | null
          total_trips: number | null
          vehicle_number: string
        }
        Insert: {
          assigned_driver_1?: string | null
          assigned_driver_2?: string | null
          created_at?: string | null
          deposit?: number | null
          fleet_name?: string | null
          id?: string | null
          online?: boolean | null
          status?: string | null
          total_trips?: number | null
          vehicle_number?: string
        }
        Update: {
          assigned_driver_1?: string | null
          assigned_driver_2?: string | null
          created_at?: string | null
          deposit?: number | null
          fleet_name?: string | null
          id?: string | null
          online?: boolean | null
          status?: string | null
          total_trips?: number | null
          vehicle_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_assigned_driver_1_fkey"
            columns: ["assigned_driver_1"]
            isOneToOne: false
            referencedRelation: "rent_due_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "vehicles_assigned_driver_1_fkey"
            columns: ["assigned_driver_1"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_assigned_driver_2_fkey"
            columns: ["assigned_driver_2"]
            isOneToOne: false
            referencedRelation: "rent_due_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "vehicles_assigned_driver_2_fkey"
            columns: ["assigned_driver_2"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_leaderboard: {
        Row: {
          created_at: string
          id: string
          on_time_payments: number | null
          rank: number | null
          score: number | null
          total_earnings: number | null
          total_trips: number | null
          user_id: string
          week_end: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          on_time_payments?: number | null
          rank?: number | null
          score?: number | null
          total_earnings?: number | null
          total_trips?: number | null
          user_id: string
          week_end: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          on_time_payments?: number | null
          rank?: number | null
          score?: number | null
          total_earnings?: number | null
          total_trips?: number | null
          user_id?: string
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      rent_due_view: {
        Row: {
          driver_id: string | null
          is_online: boolean | null
          joining_date: string | null
          name: string | null
          overdue_status: string | null
          rent_date: string | null
          rent_paid: boolean | null
          rent_status: string | null
          rent_verified: boolean | null
          shift: string | null
          submission_date: string | null
          user_id: string | null
          vehicle_number: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_vehicle_number"
            columns: ["vehicle_number"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["vehicle_number"]
          },
        ]
      }
    }
    Functions: {
      calculate_daily_health_score: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      calculate_health_score: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_account_balance: {
        Args: { account_id: number; amount_change: number }
        Returns: undefined
      }
      update_weekly_leaderboard: {
        Args: Record<PropertyKey, never>
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
