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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          created_at: string | null
          description: string
          id: number
          related_company_id: number | null
          related_opportunity_id: number | null
          related_project_id: number | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: never
          related_company_id?: number | null
          related_opportunity_id?: number | null
          related_project_id?: number | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: never
          related_company_id?: number | null
          related_opportunity_id?: number | null
          related_project_id?: number | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_related_company_id_fkey"
            columns: ["related_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_related_opportunity_id_fkey"
            columns: ["related_opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_related_project_id_fkey"
            columns: ["related_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          annual_revenue: number | null
          city: string | null
          cnpj: string | null
          created_at: string | null
          email: string | null
          id: number
          name: string
          number_of_employees: number | null
          owner_id: string | null
          phone: string | null
          sector: string | null
          size: string | null
          state: string | null
          type: string
          website: string | null
        }
        Insert: {
          annual_revenue?: number | null
          city?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: never
          name: string
          number_of_employees?: number | null
          owner_id?: string | null
          phone?: string | null
          sector?: string | null
          size?: string | null
          state?: string | null
          type: string
          website?: string | null
        }
        Update: {
          annual_revenue?: number | null
          city?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: never
          name?: string
          number_of_employees?: number | null
          owner_id?: string | null
          phone?: string | null
          sector?: string | null
          size?: string | null
          state?: string | null
          type?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company_id: number | null
          created_at: string | null
          email: string | null
          id: number
          name: string
          observations: string | null
          origin: string | null
          owner_id: string | null
          phone: string | null
          role: string | null
        }
        Insert: {
          company_id?: number | null
          created_at?: string | null
          email?: string | null
          id?: never
          name: string
          observations?: string | null
          origin?: string | null
          owner_id?: string | null
          phone?: string | null
          role?: string | null
        }
        Update: {
          company_id?: number | null
          created_at?: string | null
          email?: string | null
          id?: never
          name?: string
          observations?: string | null
          origin?: string | null
          owner_id?: string | null
          phone?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string | null
          end_date: string
          id: number
          name: string
          start_date: string
          target_value: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: never
          name: string
          start_date: string
          target_value: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: never
          name?: string
          start_date?: string
          target_value?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          company_id: number
          contact_id: number | null
          created_at: string | null
          description: string | null
          expected_close_date: string | null
          id: number
          owner_id: string
          probability: number | null
          stage_id: number
          title: string
          value: number
        }
        Insert: {
          company_id: number
          contact_id?: number | null
          created_at?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: never
          owner_id: string
          probability?: number | null
          stage_id: number
          title: string
          value: number
        }
        Update: {
          company_id?: number
          contact_id?: number | null
          created_at?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: never
          owner_id?: string
          probability?: number | null
          stage_id?: number
          title?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          color: string | null
          counts_in_conversion: boolean | null
          created_at: string | null
          id: number
          name: string
          order: number | null
        }
        Insert: {
          color?: string | null
          counts_in_conversion?: boolean | null
          created_at?: string | null
          id?: never
          name: string
          order?: number | null
        }
        Update: {
          color?: string | null
          counts_in_conversion?: boolean | null
          created_at?: string | null
          id?: never
          name?: string
          order?: number | null
        }
        Relationships: []
      }
      project_additions: {
        Row: {
          applicant: string | null
          created_at: string | null
          description: string | null
          id: number
          project_id: number | null
          request_date: string | null
          status: string | null
          title: string
          value: number | null
        }
        Insert: {
          applicant?: string | null
          created_at?: string | null
          description?: string | null
          id?: never
          project_id?: number | null
          request_date?: string | null
          status?: string | null
          title: string
          value?: number | null
        }
        Update: {
          applicant?: string | null
          created_at?: string | null
          description?: string | null
          id?: never
          project_id?: number | null
          request_date?: string | null
          status?: string | null
          title?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_additions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number | null
          company_id: number | null
          created_at: string | null
          description: string | null
          end_date: string | null
          id: number
          manager_id: string | null
          progress: number | null
          project_code: string | null
          start_date: string | null
          status: string | null
          title: string
        }
        Insert: {
          budget?: number | null
          company_id?: number | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: never
          manager_id?: string | null
          progress?: number | null
          project_code?: string | null
          start_date?: string | null
          status?: string | null
          title: string
        }
        Update: {
          budget?: number | null
          company_id?: number | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: never
          manager_id?: string | null
          progress?: number | null
          project_code?: string | null
          start_date?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          company_id: number | null
          created_at: string | null
          id: number
          owner_id: string
          pdf_url: string | null
          status: string | null
          title: string
          value: number | null
        }
        Insert: {
          company_id?: number | null
          created_at?: string | null
          id?: never
          owner_id: string
          pdf_url?: string | null
          status?: string | null
          title: string
          value?: number | null
        }
        Update: {
          company_id?: number | null
          created_at?: string | null
          id?: never
          owner_id?: string
          pdf_url?: string | null
          status?: string | null
          title?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          company_id: number | null
          contact_id: number | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: number
          name: string
          opportunity_id: number | null
          priority: string | null
          project_id: number | null
          responsible_id: string | null
          status: string | null
          type: string | null
        }
        Insert: {
          company_id?: number | null
          contact_id?: number | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: never
          name: string
          opportunity_id?: number | null
          priority?: string | null
          project_id?: number | null
          responsible_id?: string | null
          status?: string | null
          type?: string | null
        }
        Update: {
          company_id?: number | null
          contact_id?: number | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: never
          name?: string
          opportunity_id?: number | null
          priority?: string | null
          project_id?: number | null
          responsible_id?: string | null
          status?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          id: string
          name: string
          phone: string | null
          role: string
          status: string
        }
        Insert: {
          id: string
          name: string
          phone?: string | null
          role?: string
          status?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          role?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_company_with_relations: {
        Args: { company_id_param: number }
        Returns: boolean
      }
      get_dashboard_metrics: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_my_goal_progress: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_pipeline_distribution: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_recent_activities: {
        Args: Record<PropertyKey, never>
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
    Enums: {},
  },
} as const
