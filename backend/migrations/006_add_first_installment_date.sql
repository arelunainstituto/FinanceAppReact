-- Migration 006: Add first_installment_date to contracts
-- Allows the user to choose when installments start being charged,
-- decoupled from start_date (which remains the contract effective date / down payment date).
-- When NULL, the previous behaviour is preserved (first installment = start_date + 1 interval).

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS first_installment_date DATE;
