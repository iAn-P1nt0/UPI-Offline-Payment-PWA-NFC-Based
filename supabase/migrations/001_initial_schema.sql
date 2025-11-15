-- =====================================================================================
-- UPI Offline Payment PWA - Initial Database Schema
-- Phase 1: MVP Foundations
-- Reference: CLAUDE.md - Phase 1 Implementation
-- NPCI UPI Lite Compliance: Max ₹1,000/txn, ₹5,000 wallet, 20 daily txns
-- =====================================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for encryption functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================================
-- ENUMS
-- =====================================================================================

-- Transaction status
CREATE TYPE transaction_status AS ENUM (
  'pending',      -- Offline transaction not yet synced
  'processing',   -- Being processed on server
  'completed',    -- Successfully completed
  'failed',       -- Transaction failed
  'cancelled'     -- User cancelled
);

-- Transaction type
CREATE TYPE transaction_type AS ENUM (
  'payment',      -- User paying merchant
  'receive',      -- User receiving payment
  'refund',       -- Refund transaction
  'topup'         -- Wallet top-up
);

-- Payment method
CREATE TYPE payment_method AS ENUM (
  'nfc',          -- NFC tap-to-pay
  'qr',           -- QR code scan
  'manual'        -- Manual entry
);

-- Wallet status
CREATE TYPE wallet_status AS ENUM (
  'active',       -- Normal operation
  'frozen',       -- Temporarily frozen (security)
  'suspended',    -- Suspended by admin
  'closed'        -- Permanently closed
);

-- Device status
CREATE TYPE device_status AS ENUM (
  'active',       -- Trusted device
  'pending',      -- Pending verification
  'revoked'       -- Access revoked
);

-- =====================================================================================
-- TABLE: users
-- Extended user profile beyond Supabase Auth
-- =====================================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number VARCHAR(15) NOT NULL UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),

  -- KYC/Verification
  is_verified BOOLEAN DEFAULT false,
  verification_level INTEGER DEFAULT 0, -- 0=unverified, 1=basic, 2=full KYC

  -- Preferences
  preferred_language VARCHAR(10) DEFAULT 'en',
  notification_enabled BOOLEAN DEFAULT true,

  -- Security
  pin_hash VARCHAR(255), -- Hashed UPI PIN (never store plain text)
  pin_attempts INTEGER DEFAULT 0,
  pin_locked_until TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,

  CONSTRAINT phone_number_format CHECK (phone_number ~ '^[0-9]{10,15}$')
);

-- Index for faster lookups
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_verified ON users(is_verified);

-- =====================================================================================
-- TABLE: wallets
-- UPI Lite wallet with NPCI compliance limits
-- =====================================================================================

CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- UPI Details
  upi_id VARCHAR(100) NOT NULL UNIQUE,
  upi_provider VARCHAR(50),

  -- Balance (in paise/smallest unit to avoid floating point issues)
  balance_paise INTEGER DEFAULT 0 NOT NULL,

  -- NPCI UPI Lite Limits
  max_balance_paise INTEGER DEFAULT 500000 NOT NULL, -- ₹5,000 default
  max_transaction_paise INTEGER DEFAULT 100000 NOT NULL, -- ₹1,000 default
  max_daily_transactions INTEGER DEFAULT 20 NOT NULL,
  max_offline_transactions INTEGER DEFAULT 5 NOT NULL,

  -- Status
  status wallet_status DEFAULT 'active',

  -- Sync tracking
  last_sync_at TIMESTAMPTZ,
  pending_sync_count INTEGER DEFAULT 0,
  sync_deadline TIMESTAMPTZ, -- 4 days from first offline transaction

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT balance_non_negative CHECK (balance_paise >= 0),
  CONSTRAINT balance_limit CHECK (balance_paise <= max_balance_paise),
  CONSTRAINT upi_id_format CHECK (upi_id ~ '^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$'),
  CONSTRAINT sync_deadline_valid CHECK (
    sync_deadline IS NULL OR
    sync_deadline > created_at
  )
);

-- Indexes
CREATE INDEX idx_wallets_user ON wallets(user_id);
CREATE INDEX idx_wallets_upi_id ON wallets(upi_id);
CREATE INDEX idx_wallets_status ON wallets(status);
CREATE INDEX idx_wallets_sync_deadline ON wallets(sync_deadline) WHERE sync_deadline IS NOT NULL;

-- =====================================================================================
-- TABLE: transactions
-- All payment transactions (online and offline)
-- =====================================================================================

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Parties
  sender_wallet_id UUID REFERENCES wallets(id),
  receiver_wallet_id UUID REFERENCES wallets(id),
  merchant_id UUID REFERENCES merchants(id), -- null if P2P

  -- Transaction details
  amount_paise INTEGER NOT NULL,
  description TEXT,
  reference_id VARCHAR(100) UNIQUE, -- External reference

  -- Type and method
  transaction_type transaction_type NOT NULL,
  payment_method payment_method NOT NULL,
  status transaction_status DEFAULT 'pending',

  -- Offline handling
  is_offline BOOLEAN DEFAULT false,
  created_offline_at TIMESTAMPTZ, -- When created offline on device
  synced_at TIMESTAMPTZ, -- When synced to server

  -- NFC specific
  nfc_tag_id VARCHAR(100),
  nfc_signature TEXT, -- Cryptographic signature

  -- QR specific
  qr_code_data TEXT,

  -- Device tracking
  device_id UUID REFERENCES devices(id),
  device_fingerprint TEXT,

  -- Geolocation (optional)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location_accuracy DECIMAL(10, 2),

  -- Error handling
  error_code VARCHAR(50),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  CONSTRAINT amount_positive CHECK (amount_paise > 0),
  CONSTRAINT amount_upi_lite_limit CHECK (amount_paise <= 100000), -- ₹1,000 max
  CONSTRAINT valid_parties CHECK (
    (sender_wallet_id IS NOT NULL OR receiver_wallet_id IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_transactions_sender ON transactions(sender_wallet_id);
CREATE INDEX idx_transactions_receiver ON transactions(receiver_wallet_id);
CREATE INDEX idx_transactions_merchant ON transactions(merchant_id);
CREATE INDEX idx_transactions_device ON transactions(device_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_offline ON transactions(is_offline) WHERE is_offline = true;
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX idx_transactions_reference ON transactions(reference_id);

-- =====================================================================================
-- TABLE: merchants
-- Merchant information for offline caching
-- =====================================================================================

CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Merchant details
  business_name VARCHAR(200) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  merchant_code VARCHAR(50) UNIQUE NOT NULL,

  -- UPI details
  upi_id VARCHAR(100) NOT NULL,

  -- Contact
  phone_number VARCHAR(15),
  email VARCHAR(255),

  -- Address
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(2) DEFAULT 'IN',

  -- Geolocation
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Business info
  category VARCHAR(100),
  description TEXT,
  logo_url TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,

  -- Offline support
  supports_offline BOOLEAN DEFAULT true,
  nfc_enabled BOOLEAN DEFAULT false,
  qr_enabled BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT merchant_upi_format CHECK (upi_id ~ '^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$')
);

-- Indexes
CREATE INDEX idx_merchants_code ON merchants(merchant_code);
CREATE INDEX idx_merchants_upi ON merchants(upi_id);
CREATE INDEX idx_merchants_active ON merchants(is_active);
CREATE INDEX idx_merchants_category ON merchants(category);
CREATE INDEX idx_merchants_location ON merchants(latitude, longitude) WHERE latitude IS NOT NULL;

-- =====================================================================================
-- TABLE: devices
-- Device fingerprinting and trust management
-- =====================================================================================

CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Device identification
  device_fingerprint TEXT NOT NULL,
  device_name VARCHAR(100),

  -- Device details
  platform VARCHAR(50), -- 'android', 'ios', 'web'
  browser VARCHAR(100),
  os_version VARCHAR(50),
  app_version VARCHAR(20),

  -- Capabilities
  supports_nfc BOOLEAN DEFAULT false,
  supports_biometric BOOLEAN DEFAULT false,

  -- Trust and security
  status device_status DEFAULT 'pending',
  trust_score INTEGER DEFAULT 50, -- 0-100

  -- Usage tracking
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  login_count INTEGER DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,

  -- Geolocation
  last_known_latitude DECIMAL(10, 8),
  last_known_longitude DECIMAL(11, 8),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT trust_score_range CHECK (trust_score >= 0 AND trust_score <= 100),
  UNIQUE(user_id, device_fingerprint)
);

-- Indexes
CREATE INDEX idx_devices_user ON devices(user_id);
CREATE INDEX idx_devices_fingerprint ON devices(device_fingerprint);
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_last_used ON devices(last_used_at DESC);

-- =====================================================================================
-- TABLE: sync_queue
-- Queue for offline operations that need to be synced
-- =====================================================================================

CREATE TABLE sync_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,

  -- Queue details
  operation_type VARCHAR(50) NOT NULL, -- 'transaction', 'wallet_update', etc.
  payload JSONB NOT NULL,

  -- Priority and retry
  priority INTEGER DEFAULT 0, -- Higher = more important
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Status
  is_processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,

  -- Error handling
  error_message TEXT,
  last_retry_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT priority_range CHECK (priority >= 0)
);

-- Indexes
CREATE INDEX idx_sync_queue_user ON sync_queue(user_id);
CREATE INDEX idx_sync_queue_wallet ON sync_queue(wallet_id);
CREATE INDEX idx_sync_queue_transaction ON sync_queue(transaction_id);
CREATE INDEX idx_sync_queue_unprocessed ON sync_queue(is_processed, priority DESC, created_at ASC)
  WHERE is_processed = false;

-- =====================================================================================
-- TABLE: daily_limits
-- Track daily transaction limits per wallet
-- =====================================================================================

CREATE TABLE daily_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,

  -- Date tracking
  date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Counters
  transaction_count INTEGER DEFAULT 0,
  total_amount_paise INTEGER DEFAULT 0,
  offline_transaction_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT transaction_count_non_negative CHECK (transaction_count >= 0),
  CONSTRAINT amount_non_negative CHECK (total_amount_paise >= 0),
  UNIQUE(wallet_id, date)
);

-- Indexes
CREATE INDEX idx_daily_limits_wallet ON daily_limits(wallet_id);
CREATE INDEX idx_daily_limits_date ON daily_limits(date DESC);

-- =====================================================================================
-- TABLE: audit_logs
-- Comprehensive audit trail for security and compliance
-- =====================================================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Who
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,

  -- What
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,

  -- Details
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,

  -- Context
  ip_address INET,
  user_agent TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT action_not_empty CHECK (action <> '')
);

-- Indexes
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_device ON audit_logs(device_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- =====================================================================================
-- FUNCTIONS
-- =====================================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate wallet balance (from transactions)
CREATE OR REPLACE FUNCTION calculate_wallet_balance(wallet_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  total_received INTEGER;
  total_sent INTEGER;
BEGIN
  -- Sum received transactions
  SELECT COALESCE(SUM(amount_paise), 0) INTO total_received
  FROM transactions
  WHERE receiver_wallet_id = wallet_uuid
    AND status = 'completed';

  -- Sum sent transactions
  SELECT COALESCE(SUM(amount_paise), 0) INTO total_sent
  FROM transactions
  WHERE sender_wallet_id = wallet_uuid
    AND status = 'completed';

  RETURN total_received - total_sent;
END;
$$ LANGUAGE plpgsql;

-- Function: Check daily transaction limit
CREATE OR REPLACE FUNCTION check_daily_limit(
  wallet_uuid UUID,
  transaction_amount INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  limit_record RECORD;
  wallet_record RECORD;
BEGIN
  -- Get wallet limits
  SELECT * INTO wallet_record FROM wallets WHERE id = wallet_uuid;

  -- Get or create today's limit record
  INSERT INTO daily_limits (wallet_id, date)
  VALUES (wallet_uuid, CURRENT_DATE)
  ON CONFLICT (wallet_id, date) DO NOTHING;

  SELECT * INTO limit_record FROM daily_limits
  WHERE wallet_id = wallet_uuid AND date = CURRENT_DATE;

  -- Check transaction count limit
  IF limit_record.transaction_count >= wallet_record.max_daily_transactions THEN
    RETURN false;
  END IF;

  -- Check amount won't exceed wallet balance after this transaction
  IF (wallet_record.balance_paise - transaction_amount) < 0 THEN
    RETURN false;
  END IF;

  -- Check single transaction limit
  IF transaction_amount > wallet_record.max_transaction_paise THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- TRIGGERS
-- =====================================================================================

-- Trigger: Update updated_at on all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_merchants_updated_at BEFORE UPDATE ON merchants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_queue_updated_at BEFORE UPDATE ON sync_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_limits_updated_at BEFORE UPDATE ON daily_limits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- COMMENTS
-- =====================================================================================

COMMENT ON TABLE users IS 'Extended user profiles beyond Supabase Auth';
COMMENT ON TABLE wallets IS 'UPI Lite wallets with NPCI compliance limits';
COMMENT ON TABLE transactions IS 'All payment transactions (online and offline)';
COMMENT ON TABLE merchants IS 'Merchant information for offline caching';
COMMENT ON TABLE devices IS 'Device fingerprinting and trust management';
COMMENT ON TABLE sync_queue IS 'Queue for offline operations to sync';
COMMENT ON TABLE daily_limits IS 'Track daily transaction limits per wallet';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for compliance';

COMMENT ON COLUMN wallets.balance_paise IS 'Balance in smallest currency unit (paise) to avoid floating point errors';
COMMENT ON COLUMN wallets.sync_deadline IS 'NPCI requirement: must sync within 4 days of first offline transaction';
COMMENT ON COLUMN transactions.nfc_signature IS 'Cryptographic signature for NFC transactions';
COMMENT ON COLUMN devices.trust_score IS 'Device trust score (0-100) based on usage patterns';

-- =====================================================================================
-- END OF SCHEMA
-- =====================================================================================
