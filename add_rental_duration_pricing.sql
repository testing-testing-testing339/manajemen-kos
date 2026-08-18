-- ============================================
-- ADD RENTAL DURATION PRICING
-- ============================================
-- Add columns for different rental duration pricing
-- ============================================

-- Add price columns for different durations
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS price_per_day numeric,
ADD COLUMN IF NOT EXISTS price_per_month numeric,
ADD COLUMN IF NOT EXISTS price_per_6months numeric;

-- Migrate existing price to price_per_month (backward compatibility)
UPDATE rooms 
SET price_per_month = price 
WHERE price_per_month IS NULL AND price IS NOT NULL;

-- Add rental_duration and rental_days to check_in_requests
ALTER TABLE check_in_requests
ADD COLUMN IF NOT EXISTS rental_duration text CHECK (rental_duration IN ('daily', 'monthly', '6months')) DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS rental_days integer; -- For daily rental, store number of days

-- Add comment
COMMENT ON COLUMN rooms.price_per_day IS 'Harga sewa per hari';
COMMENT ON COLUMN rooms.price_per_month IS 'Harga sewa per bulan';
COMMENT ON COLUMN rooms.price_per_6months IS 'Harga sewa per 6 bulan';
COMMENT ON COLUMN check_in_requests.rental_duration IS 'Durasi sewa: daily, monthly, atau 6months';
COMMENT ON COLUMN check_in_requests.rental_days IS 'Jumlah hari untuk sewa harian';





