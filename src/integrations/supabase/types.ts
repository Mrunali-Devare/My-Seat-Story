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
      booking_seats: {
        Row: {
          booking_id: string
          id: string
          price: number
          seat_label: string
          show_seat_id: string
        }
        Insert: {
          booking_id: string
          id?: string
          price: number
          seat_label: string
          show_seat_id: string
        }
        Update: {
          booking_id?: string
          id?: string
          price?: number
          seat_label?: string
          show_seat_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_seats_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_seats_show_seat_id_fkey"
            columns: ["show_seat_id"]
            isOneToOne: false
            referencedRelation: "show_seats"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_code: string
          created_at: string
          id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          show_id: string
          status: Database["public"]["Enums"]["booking_status"]
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_code?: string
          created_at?: string
          id?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          show_id: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_code?: string
          created_at?: string
          id?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          show_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      movies: {
        Row: {
          backdrop_url: string | null
          cast_list: Json | null
          certificate: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          featured: boolean
          genres: string[]
          id: string
          languages: string[]
          poster_url: string | null
          rating: number | null
          release_date: string | null
          status: Database["public"]["Enums"]["movie_status"]
          title: string
          trailer_url: string | null
          trending: boolean
          updated_at: string
        }
        Insert: {
          backdrop_url?: string | null
          cast_list?: Json | null
          certificate?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          featured?: boolean
          genres?: string[]
          id?: string
          languages?: string[]
          poster_url?: string | null
          rating?: number | null
          release_date?: string | null
          status?: Database["public"]["Enums"]["movie_status"]
          title: string
          trailer_url?: string | null
          trending?: boolean
          updated_at?: string
        }
        Update: {
          backdrop_url?: string | null
          cast_list?: Json | null
          certificate?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          featured?: boolean
          genres?: string[]
          id?: string
          languages?: string[]
          poster_url?: string | null
          rating?: number | null
          release_date?: string | null
          status?: Database["public"]["Enums"]["movie_status"]
          title?: string
          trailer_url?: string | null
          trending?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          movie_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          movie_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          movie_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      screens: {
        Row: {
          cols: number
          created_at: string
          id: string
          name: string
          rows: number
          seat_config: Json
          theater_id: string
        }
        Insert: {
          cols?: number
          created_at?: string
          id?: string
          name: string
          rows?: number
          seat_config?: Json
          theater_id: string
        }
        Update: {
          cols?: number
          created_at?: string
          id?: string
          name?: string
          rows?: number
          seat_config?: Json
          theater_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screens_theater_id_fkey"
            columns: ["theater_id"]
            isOneToOne: false
            referencedRelation: "theaters"
            referencedColumns: ["id"]
          },
        ]
      }
      show_seats: {
        Row: {
          booking_id: string | null
          col_num: number
          id: string
          locked_by: string | null
          locked_until: string | null
          price: number
          row_label: string
          seat_label: string
          seat_type: Database["public"]["Enums"]["seat_type"]
          show_id: string
          status: Database["public"]["Enums"]["seat_status"]
        }
        Insert: {
          booking_id?: string | null
          col_num: number
          id?: string
          locked_by?: string | null
          locked_until?: string | null
          price: number
          row_label: string
          seat_label: string
          seat_type?: Database["public"]["Enums"]["seat_type"]
          show_id: string
          status?: Database["public"]["Enums"]["seat_status"]
        }
        Update: {
          booking_id?: string | null
          col_num?: number
          id?: string
          locked_by?: string | null
          locked_until?: string | null
          price?: number
          row_label?: string
          seat_label?: string
          seat_type?: Database["public"]["Enums"]["seat_type"]
          show_id?: string
          status?: Database["public"]["Enums"]["seat_status"]
        }
        Relationships: [
          {
            foreignKeyName: "show_seats_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      shows: {
        Row: {
          base_price: number
          created_at: string
          id: string
          movie_id: string
          screen_id: string
          start_time: string
        }
        Insert: {
          base_price?: number
          created_at?: string
          id?: string
          movie_id: string
          screen_id: string
          start_time: string
        }
        Update: {
          base_price?: number
          created_at?: string
          id?: string
          movie_id?: string
          screen_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "shows_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shows_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens"
            referencedColumns: ["id"]
          },
        ]
      }
      theaters: {
        Row: {
          address: string | null
          city: string
          created_at: string
          id: string
          manager_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city: string
          created_at?: string
          id?: string
          manager_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string
          created_at?: string
          id?: string
          manager_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_show_with_seats: {
        Args: {
          p_base_price: number
          p_movie_id: string
          p_screen_id: string
          p_start_time: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      seed_show_with_seats: {
        Args: {
          p_base_price: number
          p_movie_id: string
          p_screen_id: string
          p_start_time: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "customer" | "manager" | "admin"
      booking_status: "pending" | "confirmed" | "cancelled"
      movie_status: "upcoming" | "now_showing" | "ended"
      payment_status: "pending" | "success" | "failed" | "refunded"
      seat_status: "available" | "locked" | "booked"
      seat_type: "regular" | "premium" | "vip" | "recliner"
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
  public: {
    Enums: {
      app_role: ["customer", "manager", "admin"],
      booking_status: ["pending", "confirmed", "cancelled"],
      movie_status: ["upcoming", "now_showing", "ended"],
      payment_status: ["pending", "success", "failed", "refunded"],
      seat_status: ["available", "locked", "booked"],
      seat_type: ["regular", "premium", "vip", "recliner"],
    },
  },
} as const
