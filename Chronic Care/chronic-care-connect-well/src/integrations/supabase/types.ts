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
      admin_users: {
        Row: {
          created_at: string
          id: string
          permissions: Json | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permissions?: Json | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permissions?: Json | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          batch_number: string
          cost_per_unit: number | null
          created_at: string
          expiry_date: string
          id: string
          medication_id: string
          quantity_available: number
          supplier: string | null
          updated_at: string
        }
        Insert: {
          batch_number: string
          cost_per_unit?: number | null
          created_at?: string
          expiry_date: string
          id?: string
          medication_id: string
          quantity_available?: number
          supplier?: string | null
          updated_at?: string
        }
        Update: {
          batch_number?: string
          cost_per_unit?: number | null
          created_at?: string
          expiry_date?: string
          id?: string
          medication_id?: string
          quantity_available?: number
          supplier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          available_strengths: string[] | null
          created_at: string
          description: string | null
          dosage_forms: string[] | null
          id: string
          name: string
          requires_prescription: boolean | null
        }
        Insert: {
          available_strengths?: string[] | null
          created_at?: string
          description?: string | null
          dosage_forms?: string[] | null
          id?: string
          name: string
          requires_prescription?: boolean | null
        }
        Update: {
          available_strengths?: string[] | null
          created_at?: string
          description?: string | null
          dosage_forms?: string[] | null
          id?: string
          name?: string
          requires_prescription?: boolean | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read_at: string | null
          recipient_id: string
          recipient_type: string
          related_id: string | null
          status: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          recipient_id: string
          recipient_type: string
          related_id?: string | null
          status?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          recipient_id?: string
          recipient_type?: string
          related_id?: string | null
          status?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          delivery_address: string
          dosage: string
          id: string
          medication_name: string
          notes: string | null
          prescription_number: string | null
          quantity: number
          status: string
          total_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          delivery_address: string
          dosage: string
          id?: string
          medication_name: string
          notes?: string | null
          prescription_number?: string | null
          quantity: number
          status?: string
          total_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          delivery_address?: string
          dosage?: string
          id?: string
          medication_name?: string
          notes?: string | null
          prescription_number?: string | null
          quantity?: number
          status?: string
          total_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacies: {
        Row: {
          address: string
          contact_person: string | null
          coordinates: Json | null
          created_at: string
          delivery_radius: number | null
          email: string | null
          id: string
          license_number: string
          name: string
          operating_hours: Json | null
          phone: string
          status: string
          updated_at: string
        }
        Insert: {
          address: string
          contact_person?: string | null
          coordinates?: Json | null
          created_at?: string
          delivery_radius?: number | null
          email?: string | null
          id?: string
          license_number: string
          name: string
          operating_hours?: Json | null
          phone: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string
          contact_person?: string | null
          coordinates?: Json | null
          created_at?: string
          delivery_radius?: number | null
          email?: string | null
          id?: string
          license_number?: string
          name?: string
          operating_hours?: Json | null
          phone?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      pharmacy_communications: {
        Row: {
          created_at: string
          id: string
          message: string
          message_type: string
          order_id: string | null
          pharmacy_id: string
          read_at: string | null
          sender_id: string
          sender_type: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          message_type?: string
          order_id?: string | null
          pharmacy_id: string
          read_at?: string | null
          sender_id: string
          sender_type: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          message_type?: string
          order_id?: string | null
          pharmacy_id?: string
          read_at?: string | null
          sender_id?: string
          sender_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_communications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_communications_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          dosage: string
          duration: string
          expires_at: string | null
          frequency: string
          id: string
          instructions: string | null
          medication_id: string
          patient_id: string
          prescribed_at: string
          provider_id: string
          status: string | null
        }
        Insert: {
          dosage: string
          duration: string
          expires_at?: string | null
          frequency: string
          id?: string
          instructions?: string | null
          medication_id: string
          patient_id: string
          prescribed_at?: string
          provider_id: string
          status?: string | null
        }
        Update: {
          dosage?: string
          duration?: string
          expires_at?: string | null
          frequency?: string
          id?: string
          instructions?: string | null
          medication_id?: string
          patient_id?: string
          prescribed_at?: string
          provider_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          emergency_contact: string | null
          full_name: string | null
          id: string
          medical_conditions: string[] | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact?: string | null
          full_name?: string | null
          id: string
          medical_conditions?: string[] | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact?: string | null
          full_name?: string | null
          id?: string
          medical_conditions?: string[] | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      providers: {
        Row: {
          created_at: string
          hospital_affiliation: string | null
          id: string
          license_number: string
          specialty: string
          updated_at: string
          user_id: string
          verification_status: string | null
        }
        Insert: {
          created_at?: string
          hospital_affiliation?: string | null
          id?: string
          license_number: string
          specialty: string
          updated_at?: string
          user_id: string
          verification_status?: string | null
        }
        Update: {
          created_at?: string
          hospital_affiliation?: string | null
          id?: string
          license_number?: string
          specialty?: string
          updated_at?: string
          user_id?: string
          verification_status?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          data: Json
          generated_at: string
          generated_by: string
          id: string
          title: string
          type: string
        }
        Insert: {
          data: Json
          generated_at?: string
          generated_by: string
          id?: string
          title: string
          type: string
        }
        Update: {
          data?: Json
          generated_at?: string
          generated_by?: string
          id?: string
          title?: string
          type?: string
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
