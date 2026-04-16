-- Orders table for D17 payment tracking
CREATE TABLE IF NOT EXISTS orders (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES profiles(id) NOT NULL,
  pack_id       TEXT NOT NULL,
  credits       INTEGER NOT NULL,
  amount_dt     DECIMAL(10,3) NOT NULL,
  d17_phone     TEXT NOT NULL,
  status        TEXT DEFAULT 'PENDING'
                CHECK (status IN ('PENDING','COMPLETED','FAILED')),
  reference     TEXT UNIQUE NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at  TIMESTAMPTZ
);

-- RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
ON orders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
ON orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Index for fast lookup by reference (admin confirm flow)
CREATE INDEX idx_orders_reference ON orders(reference);

-- Index for user order history
CREATE INDEX idx_orders_user_id ON orders(user_id);
