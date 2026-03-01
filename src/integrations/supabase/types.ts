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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts_receivable: {
        Row: {
          balance_due: number
          created_at: string
          customer_cedula: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          description: string
          device_brand: string | null
          device_model: string | null
          due_date: string | null
          id: string
          imei: string | null
          notes: string | null
          original_amount: number
          paid_amount: number
          sale_id: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          balance_due?: number
          created_at?: string
          customer_cedula?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          description?: string
          device_brand?: string | null
          device_model?: string | null
          due_date?: string | null
          id?: string
          imei?: string | null
          notes?: string | null
          original_amount?: number
          paid_amount?: number
          sale_id?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          balance_due?: number
          created_at?: string
          customer_cedula?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          description?: string
          device_brand?: string | null
          device_model?: string | null
          due_date?: string | null
          id?: string
          imei?: string | null
          notes?: string | null
          original_amount?: number
          paid_amount?: number
          sale_id?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_receivable_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_payments: {
        Row: {
          amount: number
          ar_id: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
        }
        Insert: {
          amount?: number
          ar_id: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
        }
        Update: {
          amount?: number
          ar_id?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "ar_payments_ar_id_fkey"
            columns: ["ar_id"]
            isOneToOne: false
            referencedRelation: "accounts_receivable"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          cedula: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          tenant_id: string
        }
        Insert: {
          address?: string | null
          cedula?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          tenant_id: string
        }
        Update: {
          address?: string | null
          cedula?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          barcode: string | null
          battery_health: number | null
          condition: string
          created_at: string
          grade: string | null
          id: string
          imei: string | null
          is_new: boolean
          min_price: number
          notes: string | null
          product_id: string | null
          purchase_cost: number
          purchase_id: string | null
          quantity: number
          sale_price: number
          seller_cedula: string | null
          seller_name: string | null
          seller_phone: string | null
          serial: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          barcode?: string | null
          battery_health?: number | null
          condition?: string
          created_at?: string
          grade?: string | null
          id?: string
          imei?: string | null
          is_new?: boolean
          min_price?: number
          notes?: string | null
          product_id?: string | null
          purchase_cost?: number
          purchase_id?: string | null
          quantity?: number
          sale_price?: number
          seller_cedula?: string | null
          seller_name?: string | null
          seller_phone?: string | null
          serial?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          barcode?: string | null
          battery_health?: number | null
          condition?: string
          created_at?: string
          grade?: string | null
          id?: string
          imei?: string | null
          is_new?: boolean
          min_price?: number
          notes?: string | null
          product_id?: string | null
          purchase_cost?: number
          purchase_id?: string | null
          quantity?: number
          sale_price?: number
          seller_cedula?: string | null
          seller_name?: string | null
          seller_phone?: string | null
          serial?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_inventory_purchase"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_installments: {
        Row: {
          closing_balance: number
          due_date: string
          id: string
          installment_number: number
          interest_amount: number
          is_early_payment: boolean | null
          is_paid: boolean
          loan_id: string
          opening_balance: number
          paid_amount: number
          paid_at: string | null
          payment_notes: string | null
          principal_amount: number
          scheduled_payment: number
          tenant_id: string | null
        }
        Insert: {
          closing_balance?: number
          due_date: string
          id?: string
          installment_number: number
          interest_amount?: number
          is_early_payment?: boolean | null
          is_paid?: boolean
          loan_id: string
          opening_balance?: number
          paid_amount?: number
          paid_at?: string | null
          payment_notes?: string | null
          principal_amount?: number
          scheduled_payment?: number
          tenant_id?: string | null
        }
        Update: {
          closing_balance?: number
          due_date?: string
          id?: string
          installment_number?: number
          interest_amount?: number
          is_early_payment?: boolean | null
          is_paid?: boolean
          loan_id?: string
          opening_balance?: number
          paid_amount?: number
          paid_at?: string | null
          payment_notes?: string | null
          principal_amount?: number
          scheduled_payment?: number
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loan_installments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_installments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          balance_due: number
          created_at: string
          customer_cedula: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string
          device_brand: string
          device_model: string
          down_payment: number
          financed_amount: number
          id: string
          imei: string | null
          installments: number
          liquidated_at: string | null
          monthly_payment: number
          monthly_rate: number
          next_due_date: string | null
          paid_amount: number
          payment_period: string
          sale_id: string | null
          start_date: string
          status: string
          tenant_id: string
          total_amount: number
        }
        Insert: {
          balance_due?: number
          created_at?: string
          customer_cedula?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          device_brand?: string
          device_model?: string
          down_payment?: number
          financed_amount?: number
          id?: string
          imei?: string | null
          installments?: number
          liquidated_at?: string | null
          monthly_payment?: number
          monthly_rate?: number
          next_due_date?: string | null
          paid_amount?: number
          payment_period?: string
          sale_id?: string | null
          start_date?: string
          status?: string
          tenant_id: string
          total_amount?: number
        }
        Update: {
          balance_due?: number
          created_at?: string
          customer_cedula?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          device_brand?: string
          device_model?: string
          down_payment?: number
          financed_amount?: number
          id?: string
          imei?: string | null
          installments?: number
          liquidated_at?: string | null
          monthly_payment?: number
          monthly_rate?: number
          next_due_date?: string | null
          paid_amount?: number
          payment_period?: string
          sale_id?: string | null
          start_date?: string
          status?: string
          tenant_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "loans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number
          brand: string
          capacity: string | null
          category: string
          color: string
          created_at: string
          id: string
          image_url: string | null
          name: string
          tenant_id: string
        }
        Insert: {
          base_price?: number
          brand?: string
          capacity?: string | null
          category?: string
          color?: string
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          tenant_id: string
        }
        Update: {
          base_price?: number
          brand?: string
          capacity?: string | null
          category?: string
          color?: string
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string | null
          full_name: string
          id: string
          last_name: string | null
          phone: string | null
          tenant_id: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          full_name?: string
          id?: string
          last_name?: string | null
          phone?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          full_name?: string
          id?: string
          last_name?: string | null
          phone?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          notes: string | null
          purchased_at: string
          reference_number: string | null
          supplier_cedula: string | null
          supplier_name: string
          supplier_phone: string | null
          tenant_id: string
          total_amount: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          purchased_at?: string
          reference_number?: string | null
          supplier_cedula?: string | null
          supplier_name?: string
          supplier_phone?: string | null
          tenant_id: string
          total_amount?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          purchased_at?: string
          reference_number?: string | null
          supplier_cedula?: string | null
          supplier_name?: string
          supplier_phone?: string | null
          tenant_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      repairs: {
        Row: {
          advance: number
          assigned_to: string | null
          balance: number
          brand: string
          checklist: Json
          color: string | null
          created_at: string
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          delivered_at: string | null
          id: string
          imei: string | null
          labor_cost: number
          lock_code: string | null
          model: string
          notes: string | null
          parts_cost: number
          received_at: string
          reported_fault: string
          status: string
          technician_notes: string | null
          tenant_id: string
          total_price: number
        }
        Insert: {
          advance?: number
          assigned_to?: string | null
          balance?: number
          brand?: string
          checklist?: Json
          color?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          delivered_at?: string | null
          id?: string
          imei?: string | null
          labor_cost?: number
          lock_code?: string | null
          model?: string
          notes?: string | null
          parts_cost?: number
          received_at?: string
          reported_fault?: string
          status?: string
          technician_notes?: string | null
          tenant_id: string
          total_price?: number
        }
        Update: {
          advance?: number
          assigned_to?: string | null
          balance?: number
          brand?: string
          checklist?: Json
          color?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          delivered_at?: string | null
          id?: string
          imei?: string | null
          labor_cost?: number
          lock_code?: string | null
          model?: string
          notes?: string | null
          parts_cost?: number
          received_at?: string
          reported_fault?: string
          status?: string
          technician_notes?: string | null
          tenant_id?: string
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "repairs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repairs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_appointments: {
        Row: {
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          duration_minutes: number
          id: string
          location: string | null
          notes: string | null
          scheduled_at: string
          status: string
          tenant_id: string | null
          title: string
          type: string
        }
        Insert: {
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          location?: string | null
          notes?: string | null
          scheduled_at: string
          status?: string
          tenant_id?: string | null
          title: string
          type?: string
        }
        Update: {
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          location?: string | null
          notes?: string | null
          scheduled_at?: string
          status?: string
          tenant_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          expense_date: string
          id: string
          notes: string | null
          receipt_url: string | null
          title: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          title: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          title?: string
        }
        Relationships: []
      }
      saas_invoices: {
        Row: {
          amount_due: number
          created_at: string
          due_date: string
          id: string
          notes: string | null
          paid_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          amount_due?: number
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          amount_due?: number
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_leads: {
        Row: {
          business_name: string
          created_at: string
          email: string | null
          id: string
          notes: string | null
          owner_name: string
          phone: string | null
          potential_value: number
          status: string
        }
        Insert: {
          business_name: string
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          owner_name: string
          phone?: string | null
          potential_value?: number
          status?: string
        }
        Update: {
          business_name?: string
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          owner_name?: string
          phone?: string | null
          potential_value?: number
          status?: string
        }
        Relationships: []
      }
      saas_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          brand: string
          color: string | null
          id: string
          imei: string | null
          inventory_item_id: string | null
          model: string
          quantity: number
          sale_id: string
          subtotal: number
          unit_price: number
        }
        Insert: {
          brand?: string
          color?: string | null
          id?: string
          imei?: string | null
          inventory_item_id?: string | null
          model?: string
          quantity?: number
          sale_id: string
          subtotal?: number
          unit_price?: number
        }
        Update: {
          brand?: string
          color?: string | null
          id?: string
          imei?: string | null
          inventory_item_id?: string | null
          model?: string
          quantity?: number
          sale_id?: string
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          amount_received: number
          change_given: number
          created_by: string | null
          customer_cedula: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          deleted_at: string | null
          id: string
          notes: string | null
          payment_method: string
          reference_number: string | null
          sold_at: string
          tenant_id: string
          total_amount: number
        }
        Insert: {
          amount_received?: number
          change_given?: number
          created_by?: string | null
          customer_cedula?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          reference_number?: string | null
          sold_at?: string
          tenant_id: string
          total_amount?: number
        }
        Update: {
          amount_received?: number
          change_given?: number
          created_by?: string | null
          customer_cedula?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          reference_number?: string | null
          sold_at?: string
          tenant_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          cedula: string | null
          company: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          tenant_id: string
        }
        Insert: {
          address?: string | null
          cedula?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          tenant_id: string
        }
        Update: {
          address?: string | null
          cedula?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          blocked_at: string | null
          created_at: string
          id: string
          installation_status: string
          logo_url: string | null
          monthly_fee: number
          name: string
          next_due_date: string | null
          slug: string
          subscription_plan: string
          subscription_status: string
          warranty_text: string | null
        }
        Insert: {
          blocked_at?: string | null
          created_at?: string
          id?: string
          installation_status?: string
          logo_url?: string | null
          monthly_fee?: number
          name: string
          next_due_date?: string | null
          slug: string
          subscription_plan?: string
          subscription_status?: string
          warranty_text?: string | null
        }
        Update: {
          blocked_at?: string | null
          created_at?: string
          id?: string
          installation_status?: string
          logo_url?: string | null
          monthly_fee?: number
          name?: string
          next_due_date?: string | null
          slug?: string
          subscription_plan?: string
          subscription_status?: string
          warranty_text?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_email_by_username: { Args: { _username: string }; Returns: string }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_tenant_access: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      is_admin_or_above: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      is_manager_or_above: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "manager" | "staff" | "technician"
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
      app_role: ["super_admin", "admin", "manager", "staff", "technician"],
    },
  },
} as const
