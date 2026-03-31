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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      chains: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          chain_id: string
          ean: string
          id: string
          last_seen_at: string
          source: string | null
        }
        Insert: {
          chain_id: string
          ean: string
          id?: string
          last_seen_at?: string
          source?: string | null
        }
        Update: {
          chain_id?: string
          ean?: string
          id?: string
          last_seen_at?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "chains"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sources: {
        Row: {
          brand: string | null
          ean: string
          fetched_at: string
          id: string
          image_url: string | null
          ingredients_raw: string | null
          name: string | null
          payload: Json
          source: Database["public"]["Enums"]["product_source_type"]
          source_product_id: string | null
        }
        Insert: {
          brand?: string | null
          ean: string
          fetched_at?: string
          id?: string
          image_url?: string | null
          ingredients_raw?: string | null
          name?: string | null
          payload: Json
          source: Database["public"]["Enums"]["product_source_type"]
          source_product_id?: string | null
        }
        Update: {
          brand?: string | null
          ean?: string
          fetched_at?: string
          id?: string
          image_url?: string | null
          ingredients_raw?: string | null
          name?: string | null
          payload?: Json
          source?: Database["public"]["Enums"]["product_source_type"]
          source_product_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          brand: string | null
          created_at: string
          ean: string
          id: string
          image_url: string | null
          ingredients_hash: string | null
          ingredients_raw: string | null
          name: string | null
          nova_class: number | null
          nova_confidence: number | null
          nova_reason: string | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          ean: string
          id?: string
          image_url?: string | null
          ingredients_hash?: string | null
          ingredients_raw?: string | null
          name?: string | null
          nova_class?: number | null
          nova_confidence?: number | null
          nova_reason?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          ean?: string
          id?: string
          image_url?: string | null
          ingredients_hash?: string | null
          ingredients_raw?: string | null
          name?: string | null
          nova_class?: number | null
          nova_confidence?: number | null
          nova_reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          preferences: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          preferences?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          preferences?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          allergens: string[] | null
          base_product_id: string | null
          created_at: string
          id: string
          is_optional: boolean | null
          name: string
          quantity: string | null
          recipe_id: string
          unit: string | null
        }
        Insert: {
          allergens?: string[] | null
          base_product_id?: string | null
          created_at?: string
          id?: string
          is_optional?: boolean | null
          name: string
          quantity?: string | null
          recipe_id: string
          unit?: string | null
        }
        Update: {
          allergens?: string[] | null
          base_product_id?: string | null
          created_at?: string
          id?: string
          is_optional?: boolean | null
          name?: string
          quantity?: string | null
          recipe_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_base_product_id_fkey"
            columns: ["base_product_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          allergens: string[] | null
          calories_per_serving: number | null
          carbs_per_serving: number | null
          category: string
          cook_time: number | null
          created_at: string
          description: string | null
          diet_tags: string[] | null
          fat_per_serving: number | null
          id: string
          image_url: string | null
          prep_time: number | null
          protein_per_serving: number | null
          recipe_type: string
          replaces: string | null
          servings: number | null
          status: string
          steps: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          allergens?: string[] | null
          calories_per_serving?: number | null
          carbs_per_serving?: number | null
          category: string
          cook_time?: number | null
          created_at?: string
          description?: string | null
          diet_tags?: string[] | null
          fat_per_serving?: number | null
          id?: string
          image_url?: string | null
          prep_time?: number | null
          protein_per_serving?: number | null
          recipe_type?: string
          replaces?: string | null
          servings?: number | null
          status?: string
          steps?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          allergens?: string[] | null
          calories_per_serving?: number | null
          carbs_per_serving?: number | null
          category?: string
          cook_time?: number | null
          created_at?: string
          description?: string | null
          diet_tags?: string[] | null
          fat_per_serving?: number | null
          id?: string
          image_url?: string | null
          prep_time?: number | null
          protein_per_serving?: number | null
          recipe_type?: string
          replaces?: string | null
          servings?: number | null
          status?: string
          steps?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      shopping_list_items: {
        Row: {
          created_at: string | null
          id: string
          in_cart: boolean | null
          list_id: string
          name: string
          notes: string | null
          product_data: Json | null
          quantity: number
          selected_product_ean: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          in_cart?: boolean | null
          list_id: string
          name: string
          notes?: string | null
          product_data?: Json | null
          quantity?: number
          selected_product_ean?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          in_cart?: boolean | null
          list_id?: string
          name?: string
          notes?: string | null
          product_data?: Json | null
          quantity?: number
          selected_product_ean?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "shopping_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_lists: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          name: string
          status: string
          store_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          name?: string
          status?: string
          store_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          name?: string
          status?: string
          store_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_cookbook: {
        Row: {
          calories_per_serving: number | null
          carbs_per_serving: number | null
          cook_time: number | null
          created_at: string
          description: string | null
          fat_per_serving: number | null
          id: string
          image_url: string | null
          prep_time: number | null
          protein_per_serving: number | null
          servings: number | null
          source_recipe_id: string | null
          steps: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calories_per_serving?: number | null
          carbs_per_serving?: number | null
          cook_time?: number | null
          created_at?: string
          description?: string | null
          fat_per_serving?: number | null
          id?: string
          image_url?: string | null
          prep_time?: number | null
          protein_per_serving?: number | null
          servings?: number | null
          source_recipe_id?: string | null
          steps?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calories_per_serving?: number | null
          carbs_per_serving?: number | null
          cook_time?: number | null
          created_at?: string
          description?: string | null
          fat_per_serving?: number | null
          id?: string
          image_url?: string | null
          prep_time?: number | null
          protein_per_serving?: number | null
          servings?: number | null
          source_recipe_id?: string | null
          steps?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cookbook_source_recipe_id_fkey"
            columns: ["source_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_cookbook_ingredients: {
        Row: {
          cookbook_recipe_id: string
          created_at: string
          id: string
          is_optional: boolean | null
          name: string
          quantity: string | null
          sort_order: number | null
          unit: string | null
        }
        Insert: {
          cookbook_recipe_id: string
          created_at?: string
          id?: string
          is_optional?: boolean | null
          name: string
          quantity?: string | null
          sort_order?: number | null
          unit?: string | null
        }
        Update: {
          cookbook_recipe_id?: string
          created_at?: string
          id?: string
          is_optional?: boolean | null
          name?: string
          quantity?: string | null
          sort_order?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_cookbook_ingredients_cookbook_recipe_id_fkey"
            columns: ["cookbook_recipe_id"]
            isOneToOne: false
            referencedRelation: "user_cookbook"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorite_products: {
        Row: {
          brand: string | null
          created_at: string
          ean: string
          id: string
          image_url: string | null
          product_name: string
          search_terms: string[]
          user_id: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          ean: string
          id?: string
          image_url?: string | null
          product_name: string
          search_terms?: string[]
          user_id: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          ean?: string
          id?: string
          image_url?: string | null
          product_name?: string
          search_terms?: string[]
          user_id?: string
        }
        Relationships: []
      }
      user_favorite_recipes: {
        Row: {
          created_at: string
          id: string
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipe_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorite_recipes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_recipe_history: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          recipe_id: string
          servings: number | null
          shopping_list_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          recipe_id: string
          servings?: number | null
          shopping_list_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          recipe_id?: string
          servings?: number | null
          shopping_list_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_recipe_history_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_recipe_history_shopping_list_id_fkey"
            columns: ["shopping_list_id"]
            isOneToOne: false
            referencedRelation: "shopping_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      user_recipe_substitutions: {
        Row: {
          created_at: string
          id: string
          recipe_id: string
          substitutions: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipe_id: string
          substitutions?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recipe_id?: string
          substitutions?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_recipe_substitutions_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      product_source_type: "EPD" | "KASSALAPP" | "MANUAL"
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
      product_source_type: ["EPD", "KASSALAPP", "MANUAL"],
    },
  },
} as const
