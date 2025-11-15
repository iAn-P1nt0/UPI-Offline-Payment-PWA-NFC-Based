-- =====================================================================================
-- UPI Offline Payment PWA - Row-Level Security (RLS) Policies
-- Phase 1: MVP Foundations
-- Reference: CLAUDE.md - Security Requirements
-- =====================================================================================
-- CRITICAL: These policies enforce data isolation and security at the database level
-- Users can ONLY access their own data
-- =====================================================================================

-- =====================================================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================================================
-- USERS TABLE POLICIES
-- =====================================================================================

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile (except sensitive fields)
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND id = OLD.id -- Cannot change ID
    AND phone_number = OLD.phone_number -- Cannot change phone
  );

-- Policy: Users can insert their own profile (during registration)
CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy: Users cannot delete their profile (admin only via service role)
-- No DELETE policy = users cannot delete

-- =====================================================================================
-- WALLETS TABLE POLICIES
-- =====================================================================================

-- Policy: Users can read their own wallets
CREATE POLICY "Users can read own wallets"
  ON wallets
  FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- Policy: Users can insert their own wallet
CREATE POLICY "Users can insert own wallet"
  ON wallets
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'active' -- Can only create active wallets
    AND balance_paise = 0 -- Must start with zero balance
  );

-- Policy: Users can update their own wallet (limited fields)
CREATE POLICY "Users can update own wallet"
  ON wallets
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND user_id = OLD.user_id -- Cannot transfer ownership
    AND balance_paise >= 0 -- Cannot go negative
    AND balance_paise <= max_balance_paise -- Cannot exceed limit
  );

-- Policy: Users cannot delete wallets
-- No DELETE policy = cannot delete

-- =====================================================================================
-- TRANSACTIONS TABLE POLICIES
-- =====================================================================================

-- Policy: Users can read transactions where they are sender or receiver
CREATE POLICY "Users can read own transactions"
  ON transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wallets
      WHERE wallets.id = transactions.sender_wallet_id
        AND wallets.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM wallets
      WHERE wallets.id = transactions.receiver_wallet_id
        AND wallets.user_id = auth.uid()
    )
  );

-- Policy: Users can insert transactions from their own wallet
CREATE POLICY "Users can insert transactions"
  ON transactions
  FOR INSERT
  WITH CHECK (
    -- Must be sender's wallet
    EXISTS (
      SELECT 1 FROM wallets
      WHERE wallets.id = transactions.sender_wallet_id
        AND wallets.user_id = auth.uid()
        AND wallets.status = 'active'
    )
    AND amount_paise > 0
    AND amount_paise <= 100000 -- NPCI limit: ₹1,000
    AND status IN ('pending', 'processing') -- Can only create pending/processing
  );

-- Policy: Users can update their own transactions (limited fields for sync)
CREATE POLICY "Users can update own transactions"
  ON transactions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM wallets
      WHERE wallets.id = transactions.sender_wallet_id
        AND wallets.user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Can only update specific fields during sync
    sender_wallet_id = OLD.sender_wallet_id
    AND receiver_wallet_id = OLD.receiver_wallet_id
    AND amount_paise = OLD.amount_paise
    AND transaction_type = OLD.transaction_type
  );

-- Policy: Users cannot delete transactions (immutable record)
-- No DELETE policy = cannot delete

-- =====================================================================================
-- MERCHANTS TABLE POLICIES
-- =====================================================================================

-- Policy: All authenticated users can read active merchants (for offline cache)
CREATE POLICY "Users can read active merchants"
  ON merchants
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND is_active = true
  );

-- Policy: Only admins can insert/update/delete merchants (via service role)
-- No INSERT/UPDATE/DELETE policies for regular users

-- =====================================================================================
-- DEVICES TABLE POLICIES
-- =====================================================================================

-- Policy: Users can read their own devices
CREATE POLICY "Users can read own devices"
  ON devices
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can insert their own devices
CREATE POLICY "Users can insert own devices"
  ON devices
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending' -- New devices start as pending
  );

-- Policy: Users can update their own devices (limited fields)
CREATE POLICY "Users can update own devices"
  ON devices
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND user_id = OLD.user_id
  );

-- Policy: Users can delete their own devices
CREATE POLICY "Users can delete own devices"
  ON devices
  FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================================================
-- SYNC_QUEUE TABLE POLICIES
-- =====================================================================================

-- Policy: Users can read their own sync queue items
CREATE POLICY "Users can read own sync queue"
  ON sync_queue
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can insert their own sync queue items
CREATE POLICY "Users can insert own sync queue"
  ON sync_queue
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND is_processed = false -- New items must be unprocessed
  );

-- Policy: Users can update their own sync queue items
CREATE POLICY "Users can update own sync queue"
  ON sync_queue
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND user_id = OLD.user_id
  );

-- Policy: Users can delete their own processed sync queue items
CREATE POLICY "Users can delete processed sync queue"
  ON sync_queue
  FOR DELETE
  USING (
    user_id = auth.uid()
    AND is_processed = true
  );

-- =====================================================================================
-- DAILY_LIMITS TABLE POLICIES
-- =====================================================================================

-- Policy: Users can read their own wallet limits
CREATE POLICY "Users can read own daily limits"
  ON daily_limits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wallets
      WHERE wallets.id = daily_limits.wallet_id
        AND wallets.user_id = auth.uid()
    )
  );

-- Policy: System can insert/update limits (via triggers or service role)
-- Users cannot directly modify limits

-- =====================================================================================
-- AUDIT_LOGS TABLE POLICIES
-- =====================================================================================

-- Policy: Users can read their own audit logs
CREATE POLICY "Users can read own audit logs"
  ON audit_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: System inserts audit logs (via triggers)
-- Users cannot insert/update/delete audit logs

-- =====================================================================================
-- SERVICE ROLE BYPASS
-- =====================================================================================
-- Service role (backend) can bypass all RLS policies for admin operations
-- This is handled automatically by Supabase when using service_role key

-- =====================================================================================
-- ADDITIONAL SECURITY FUNCTIONS
-- =====================================================================================

-- Function: Check if user owns wallet
CREATE OR REPLACE FUNCTION user_owns_wallet(wallet_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM wallets
    WHERE id = wallet_uuid
      AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user can access transaction
CREATE OR REPLACE FUNCTION user_can_access_transaction(transaction_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM transactions t
    LEFT JOIN wallets ws ON t.sender_wallet_id = ws.id
    LEFT JOIN wallets wr ON t.receiver_wallet_id = wr.id
    WHERE t.id = transaction_uuid
      AND (ws.user_id = auth.uid() OR wr.user_id = auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Validate transaction before insert (business rules)
CREATE OR REPLACE FUNCTION validate_transaction()
RETURNS TRIGGER AS $$
DECLARE
  sender_wallet RECORD;
  daily_limit_record RECORD;
BEGIN
  -- Get sender wallet details
  SELECT * INTO sender_wallet
  FROM wallets
  WHERE id = NEW.sender_wallet_id;

  -- Check wallet status
  IF sender_wallet.status != 'active' THEN
    RAISE EXCEPTION 'Wallet is not active';
  END IF;

  -- Check sufficient balance
  IF sender_wallet.balance_paise < NEW.amount_paise THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Check NPCI single transaction limit
  IF NEW.amount_paise > sender_wallet.max_transaction_paise THEN
    RAISE EXCEPTION 'Transaction amount exceeds limit';
  END IF;

  -- Get today's limits
  SELECT * INTO daily_limit_record
  FROM daily_limits
  WHERE wallet_id = NEW.sender_wallet_id
    AND date = CURRENT_DATE;

  -- Check daily transaction count
  IF daily_limit_record.transaction_count >= sender_wallet.max_daily_transactions THEN
    RAISE EXCEPTION 'Daily transaction limit exceeded';
  END IF;

  -- Check offline transaction limit
  IF NEW.is_offline = true AND
     daily_limit_record.offline_transaction_count >= sender_wallet.max_offline_transactions THEN
    RAISE EXCEPTION 'Offline transaction limit exceeded';
  END IF;

  -- Set sync deadline for first offline transaction
  IF NEW.is_offline = true AND sender_wallet.sync_deadline IS NULL THEN
    UPDATE wallets
    SET sync_deadline = NOW() + INTERVAL '4 days'
    WHERE id = NEW.sender_wallet_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Validate transaction before insert
CREATE TRIGGER validate_transaction_trigger
  BEFORE INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_transaction();

-- Function: Update daily limits after transaction
CREATE OR REPLACE FUNCTION update_daily_limits()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update daily limits
  INSERT INTO daily_limits (wallet_id, date, transaction_count, total_amount_paise, offline_transaction_count)
  VALUES (
    NEW.sender_wallet_id,
    CURRENT_DATE,
    1,
    NEW.amount_paise,
    CASE WHEN NEW.is_offline THEN 1 ELSE 0 END
  )
  ON CONFLICT (wallet_id, date)
  DO UPDATE SET
    transaction_count = daily_limits.transaction_count + 1,
    total_amount_paise = daily_limits.total_amount_paise + NEW.amount_paise,
    offline_transaction_count = daily_limits.offline_transaction_count +
      CASE WHEN NEW.is_offline THEN 1 ELSE 0 END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update daily limits after transaction insert
CREATE TRIGGER update_daily_limits_trigger
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_limits();

-- Function: Create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values
  )
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers: Create audit logs for critical tables
CREATE TRIGGER audit_wallets_trigger
  AFTER INSERT OR UPDATE OR DELETE ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_transactions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_log();

-- =====================================================================================
-- GRANTS
-- =====================================================================================

-- Grant usage on public schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant access to tables for authenticated users (RLS will filter)
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON wallets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON transactions TO authenticated;
GRANT SELECT ON merchants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON devices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sync_queue TO authenticated;
GRANT SELECT ON daily_limits TO authenticated;
GRANT SELECT ON audit_logs TO authenticated;

-- =====================================================================================
-- END OF RLS POLICIES
-- =====================================================================================
