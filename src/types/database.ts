/**
 * Database TypeScript Types
 * Phase 1: MVP Foundations
 * Auto-generated types from Supabase schema
 *
 * To regenerate: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          phone_number: string;
          full_name: string;
          email: string | null;
          is_verified: boolean;
          verification_level: number;
          preferred_language: string;
          notification_enabled: boolean;
          pin_hash: string | null;
          pin_attempts: number;
          pin_locked_until: string | null;
          created_at: string;
          updated_at: string;
          last_login_at: string | null;
        };
        Insert: {
          id: string;
          phone_number: string;
          full_name: string;
          email?: string | null;
          is_verified?: boolean;
          verification_level?: number;
          preferred_language?: string;
          notification_enabled?: boolean;
          pin_hash?: string | null;
          pin_attempts?: number;
          pin_locked_until?: string | null;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
        };
        Update: {
          id?: string;
          phone_number?: string;
          full_name?: string;
          email?: string | null;
          is_verified?: boolean;
          verification_level?: number;
          preferred_language?: string;
          notification_enabled?: boolean;
          pin_hash?: string | null;
          pin_attempts?: number;
          pin_locked_until?: string | null;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
        };
      };
      wallets: {
        Row: {
          id: string;
          user_id: string;
          upi_id: string;
          upi_provider: string | null;
          balance_paise: number;
          max_balance_paise: number;
          max_transaction_paise: number;
          max_daily_transactions: number;
          max_offline_transactions: number;
          status: "active" | "frozen" | "suspended" | "closed";
          last_sync_at: string | null;
          pending_sync_count: number;
          sync_deadline: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          upi_id: string;
          upi_provider?: string | null;
          balance_paise?: number;
          max_balance_paise?: number;
          max_transaction_paise?: number;
          max_daily_transactions?: number;
          max_offline_transactions?: number;
          status?: "active" | "frozen" | "suspended" | "closed";
          last_sync_at?: string | null;
          pending_sync_count?: number;
          sync_deadline?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          upi_id?: string;
          upi_provider?: string | null;
          balance_paise?: number;
          max_balance_paise?: number;
          max_transaction_paise?: number;
          max_daily_transactions?: number;
          max_offline_transactions?: number;
          status?: "active" | "frozen" | "suspended" | "closed";
          last_sync_at?: string | null;
          pending_sync_count?: number;
          sync_deadline?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          sender_wallet_id: string | null;
          receiver_wallet_id: string | null;
          merchant_id: string | null;
          amount_paise: number;
          description: string | null;
          reference_id: string | null;
          transaction_type: "payment" | "receive" | "refund" | "topup";
          payment_method: "nfc" | "qr" | "manual";
          status: "pending" | "processing" | "completed" | "failed" | "cancelled";
          is_offline: boolean;
          created_offline_at: string | null;
          synced_at: string | null;
          nfc_tag_id: string | null;
          nfc_signature: string | null;
          qr_code_data: string | null;
          device_id: string | null;
          device_fingerprint: string | null;
          latitude: number | null;
          longitude: number | null;
          location_accuracy: number | null;
          error_code: string | null;
          error_message: string | null;
          retry_count: number;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          sender_wallet_id?: string | null;
          receiver_wallet_id?: string | null;
          merchant_id?: string | null;
          amount_paise: number;
          description?: string | null;
          reference_id?: string | null;
          transaction_type: "payment" | "receive" | "refund" | "topup";
          payment_method: "nfc" | "qr" | "manual";
          status?: "pending" | "processing" | "completed" | "failed" | "cancelled";
          is_offline?: boolean;
          created_offline_at?: string | null;
          synced_at?: string | null;
          nfc_tag_id?: string | null;
          nfc_signature?: string | null;
          qr_code_data?: string | null;
          device_id?: string | null;
          device_fingerprint?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location_accuracy?: number | null;
          error_code?: string | null;
          error_message?: string | null;
          retry_count?: number;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          sender_wallet_id?: string | null;
          receiver_wallet_id?: string | null;
          merchant_id?: string | null;
          amount_paise?: number;
          description?: string | null;
          reference_id?: string | null;
          transaction_type?: "payment" | "receive" | "refund" | "topup";
          payment_method?: "nfc" | "qr" | "manual";
          status?: "pending" | "processing" | "completed" | "failed" | "cancelled";
          is_offline?: boolean;
          created_offline_at?: string | null;
          synced_at?: string | null;
          nfc_tag_id?: string | null;
          nfc_signature?: string | null;
          qr_code_data?: string | null;
          device_id?: string | null;
          device_fingerprint?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location_accuracy?: number | null;
          error_code?: string | null;
          error_message?: string | null;
          retry_count?: number;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
      };
      merchants: {
        Row: {
          id: string;
          business_name: string;
          display_name: string;
          merchant_code: string;
          upi_id: string;
          phone_number: string | null;
          email: string | null;
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          state: string | null;
          postal_code: string | null;
          country: string;
          latitude: number | null;
          longitude: number | null;
          category: string | null;
          description: string | null;
          logo_url: string | null;
          is_active: boolean;
          is_verified: boolean;
          supports_offline: boolean;
          nfc_enabled: boolean;
          qr_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_name: string;
          display_name: string;
          merchant_code: string;
          upi_id: string;
          phone_number?: string | null;
          email?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          country?: string;
          latitude?: number | null;
          longitude?: number | null;
          category?: string | null;
          description?: string | null;
          logo_url?: string | null;
          is_active?: boolean;
          is_verified?: boolean;
          supports_offline?: boolean;
          nfc_enabled?: boolean;
          qr_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_name?: string;
          display_name?: string;
          merchant_code?: string;
          upi_id?: string;
          phone_number?: string | null;
          email?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          country?: string;
          latitude?: number | null;
          longitude?: number | null;
          category?: string | null;
          description?: string | null;
          logo_url?: string | null;
          is_active?: boolean;
          is_verified?: boolean;
          supports_offline?: boolean;
          nfc_enabled?: boolean;
          qr_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      devices: {
        Row: {
          id: string;
          user_id: string;
          device_fingerprint: string;
          device_name: string | null;
          platform: string | null;
          browser: string | null;
          os_version: string | null;
          app_version: string | null;
          supports_nfc: boolean;
          supports_biometric: boolean;
          status: "active" | "pending" | "revoked";
          trust_score: number;
          last_used_at: string;
          login_count: number;
          transaction_count: number;
          last_known_latitude: number | null;
          last_known_longitude: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          device_fingerprint: string;
          device_name?: string | null;
          platform?: string | null;
          browser?: string | null;
          os_version?: string | null;
          app_version?: string | null;
          supports_nfc?: boolean;
          supports_biometric?: boolean;
          status?: "active" | "pending" | "revoked";
          trust_score?: number;
          last_used_at?: string;
          login_count?: number;
          transaction_count?: number;
          last_known_latitude?: number | null;
          last_known_longitude?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          device_fingerprint?: string;
          device_name?: string | null;
          platform?: string | null;
          browser?: string | null;
          os_version?: string | null;
          app_version?: string | null;
          supports_nfc?: boolean;
          supports_biometric?: boolean;
          status?: "active" | "pending" | "revoked";
          trust_score?: number;
          last_used_at?: string;
          login_count?: number;
          transaction_count?: number;
          last_known_latitude?: number | null;
          last_known_longitude?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      sync_queue: {
        Row: {
          id: string;
          user_id: string;
          wallet_id: string | null;
          transaction_id: string | null;
          device_id: string | null;
          operation_type: string;
          payload: Json;
          priority: number;
          retry_count: number;
          max_retries: number;
          is_processed: boolean;
          processed_at: string | null;
          error_message: string | null;
          last_retry_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          wallet_id?: string | null;
          transaction_id?: string | null;
          device_id?: string | null;
          operation_type: string;
          payload: Json;
          priority?: number;
          retry_count?: number;
          max_retries?: number;
          is_processed?: boolean;
          processed_at?: string | null;
          error_message?: string | null;
          last_retry_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          wallet_id?: string | null;
          transaction_id?: string | null;
          device_id?: string | null;
          operation_type?: string;
          payload?: Json;
          priority?: number;
          retry_count?: number;
          max_retries?: number;
          is_processed?: boolean;
          processed_at?: string | null;
          error_message?: string | null;
          last_retry_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      daily_limits: {
        Row: {
          id: string;
          wallet_id: string;
          date: string;
          transaction_count: number;
          total_amount_paise: number;
          offline_transaction_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          wallet_id: string;
          date?: string;
          transaction_count?: number;
          total_amount_paise?: number;
          offline_transaction_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          wallet_id?: string;
          date?: string;
          transaction_count?: number;
          total_amount_paise?: number;
          offline_transaction_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          device_id: string | null;
          action: string;
          resource_type: string;
          resource_id: string | null;
          old_values: Json | null;
          new_values: Json | null;
          metadata: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          device_id?: string | null;
          action: string;
          resource_type: string;
          resource_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          metadata?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          device_id?: string | null;
          action?: string;
          resource_type?: string;
          resource_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          metadata?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      user_owns_wallet: {
        Args: {
          wallet_uuid: string;
        };
        Returns: boolean;
      };
      user_can_access_transaction: {
        Args: {
          transaction_uuid: string;
        };
        Returns: boolean;
      };
      calculate_wallet_balance: {
        Args: {
          wallet_uuid: string;
        };
        Returns: number;
      };
      check_daily_limit: {
        Args: {
          wallet_uuid: string;
          transaction_amount: number;
        };
        Returns: boolean;
      };
    };
    Enums: {
      transaction_status: "pending" | "processing" | "completed" | "failed" | "cancelled";
      transaction_type: "payment" | "receive" | "refund" | "topup";
      payment_method: "nfc" | "qr" | "manual";
      wallet_status: "active" | "frozen" | "suspended" | "closed";
      device_status: "active" | "pending" | "revoked";
    };
  };
}
