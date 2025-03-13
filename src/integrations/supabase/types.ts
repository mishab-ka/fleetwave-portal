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
      fleet_reports: {
        Row: {
          driver_name: string
          id: number
          remarks: string | null
          rent_paid: number
          rent_screenshot: string | null
          status: string | null
          submission_date: string | null
          total_cashcollect: number
          total_earnings: number
          total_trips: number
          uber_screenshot: string | null
          user_id: string | null
          vehicle_number: string
        }
        Insert: {
          driver_name: string
          id?: number
          remarks?: string | null
          rent_paid: number
          rent_screenshot?: string | null
          status?: string | null
          submission_date?: string | null
          total_cashcollect: number
          total_earnings: number
          total_trips: number
          uber_screenshot?: string | null
          user_id?: string | null
          vehicle_number: string
        }
        Update: {
          driver_name?: string
          id?: number
          remarks?: string | null
          rent_paid?: number
          rent_screenshot?: string | null
          status?: string | null
          submission_date?: string | null
          total_cashcollect?: number
          total_earnings?: number
          total_trips?: number
          uber_screenshot?: string | null
          user_id?: string | null
          vehicle_number?: string
        }
        Relationships: [
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
      users: {
        Row: {
          aadhar: string | null
          created_at: string | null
          dob: string
          driver_id: string | null
          email: string
          id: string
          is_verified: boolean | null
          license: string | null
          name: string
          online: boolean | null
          pan: string | null
          profile_photo: string | null
          shift: string | null
          vehicle_number: string | null
        }
        Insert: {
          aadhar?: string | null
          created_at?: string | null
          dob: string
          driver_id?: string | null
          email: string
          id?: string
          is_verified?: boolean | null
          license?: string | null
          name: string
          online?: boolean | null
          pan?: string | null
          profile_photo?: string | null
          shift?: string | null
          vehicle_number?: string | null
        }
        Update: {
          aadhar?: string | null
          created_at?: string | null
          dob?: string
          driver_id?: string | null
          email?: string
          id?: string
          is_verified?: boolean | null
          license?: string | null
          name?: string
          online?: boolean | null
          pan?: string | null
          profile_photo?: string | null
          shift?: string | null
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
          created_at: string | null
          Deposit_Amount: number | null
          fleet_name: string | null
          id: number
          online: boolean | null
          total_trips: number | null
          vehicle_number: string
        }
        Insert: {
          created_at?: string | null
          Deposit_Amount?: number | null
          fleet_name?: string | null
          id?: number
          online?: boolean | null
          total_trips?: number | null
          vehicle_number: string
        }
        Update: {
          created_at?: string | null
          Deposit_Amount?: number | null
          fleet_name?: string | null
          id?: number
          online?: boolean | null
          total_trips?: number | null
          vehicle_number?: string
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
