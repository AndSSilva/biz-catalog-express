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
      categories: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          background_color: string
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          primary_color: string
          secondary_color: string
          slug: string
          stock_control_enabled: boolean
          text_color: string
          updated_at: string
        }
        Insert: {
          background_color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          primary_color?: string
          secondary_color?: string
          slug: string
          stock_control_enabled?: boolean
          text_color?: string
          updated_at?: string
        }
        Update: {
          background_color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          primary_color?: string
          secondary_color?: string
          slug?: string
          stock_control_enabled?: boolean
          text_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          full_name: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          full_name?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          full_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_title: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_title: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_title?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          company_id: string
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          delivery_address: string | null
          delivery_method: string | null
          id: string
          total_items: number
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_method?: string | null
          id?: string
          total_items?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_method?: string | null
          id?: string
          total_items?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          company_id: string
          created_at: string
          id: string
          image_url: string
          product_id: string
          sort_order: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          image_url: string
          product_id: string
          sort_order?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          image_url?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_images_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          availability: Database["public"]["Enums"]["product_availability"]
          category_id: string | null
          company_id: string
          created_at: string
          description: string
          id: string
          image_url: string | null
          is_active: boolean
          on_sale: boolean
          price: number | null
          show_stock_in_catalog: boolean
          sort_order: number
          stock_quantity: number
          title: string
          updated_at: string
        }
        Insert: {
          availability?: Database["public"]["Enums"]["product_availability"]
          category_id?: string | null
          company_id: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          on_sale?: boolean
          price?: number | null
          show_stock_in_catalog?: boolean
          sort_order?: number
          stock_quantity?: number
          title: string
          updated_at?: string
        }
        Update: {
          availability?: Database["public"]["Enums"]["product_availability"]
          category_id?: string | null
          company_id?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          on_sale?: boolean
          price?: number | null
          show_stock_in_catalog?: boolean
          sort_order?: number
          stock_quantity?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          company_id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          company_id: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          company_id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_inventory_count_items: {
        Row: {
          company_id: string
          counted_at: string | null
          counted_quantity: number | null
          id: string
          inventory_count_id: string
          previous_quantity: number
          product_id: string | null
          product_title: string
          sort_order: number
        }
        Insert: {
          company_id: string
          counted_at?: string | null
          counted_quantity?: number | null
          id?: string
          inventory_count_id: string
          previous_quantity: number
          product_id?: string | null
          product_title: string
          sort_order?: number
        }
        Update: {
          company_id?: string
          counted_at?: string | null
          counted_quantity?: number | null
          id?: string
          inventory_count_id?: string
          previous_quantity?: number
          product_id?: string | null
          product_title?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_inventory_count_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_inventory_count_items_inventory_count_id_fkey"
            columns: ["inventory_count_id"]
            isOneToOne: false
            referencedRelation: "stock_inventory_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_inventory_count_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_inventory_counts: {
        Row: {
          company_id: string
          finished_at: string | null
          finished_by: string | null
          id: string
          started_at: string
          started_by: string | null
          status: string
        }
        Insert: {
          company_id: string
          finished_at?: string | null
          finished_by?: string | null
          id?: string
          started_at?: string
          started_by?: string | null
          status?: string
        }
        Update: {
          company_id?: string
          finished_at?: string | null
          finished_by?: string | null
          id?: string
          started_at?: string
          started_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_inventory_counts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_logs: {
        Row: {
          action: string
          actor_id: string | null
          company_id: string
          created_at: string
          details: string | null
          id: string
          product_id: string | null
          product_title: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          company_id: string
          created_at?: string
          details?: string | null
          id?: string
          product_id?: string | null
          product_title?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          company_id?: string
          created_at?: string
          details?: string | null
          id?: string
          product_id?: string | null
          product_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_pending_operations: {
        Row: {
          company_id: string
          created_at: string
          id: string
          order_id: string | null
          product_id: string | null
          product_title: string
          quantity: number
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          order_id?: string | null
          product_id?: string | null
          product_title: string
          quantity: number
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          order_id?: string | null
          product_id?: string | null
          product_title?: string
          quantity?: number
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_pending_operations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_pending_operations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_pending_operations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_master: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "master"
      product_availability: "pronta_entrega" | "sob_encomenda"
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
    Enums: {
      app_role: ["admin", "master"],
      product_availability: ["pronta_entrega", "sob_encomenda"],
    },
  },
} as const
