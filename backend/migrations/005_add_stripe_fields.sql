-- Migration 005: Add Stripe integration fields
-- clients.external_id already exists and will be repurposed to store stripe_customer_id

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS stripe_schedule_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_contracts_stripe_schedule_id
  ON contracts (stripe_schedule_id);

CREATE INDEX IF NOT EXISTS idx_clients_external_id
  ON clients (external_id);
