-- Fix payment_due_date for existing tenants based on check_in_date and rental_duration/rental_days
-- This script recalculates payment_due_date for tenants that have associated check_in_requests

-- First, let's see what needs to be fixed
SELECT 
  t.id,
  t.full_name,
  t.check_in_date,
  t.payment_due_date as current_payment_due_date,
  cir.rental_duration,
  cir.rental_days,
  (
    CASE 
      WHEN cir.rental_duration = 'daily' AND cir.rental_days IS NOT NULL THEN
        (t.check_in_date::date + (cir.rental_days || ' days')::interval)::date
      WHEN cir.rental_duration = '6months' THEN
        (t.check_in_date::date + '6 months'::interval)::date
      ELSE
        (t.check_in_date::date + '1 month'::interval)::date
    END
  ) as calculated_payment_due_date
FROM tenants t
INNER JOIN check_in_requests cir ON cir.assigned_room_id = t.room_id AND cir.status = 'completed'
ORDER BY t.check_in_date DESC;

-- Update payment_due_date based on rental_duration and rental_days
UPDATE tenants t
SET payment_due_date = (
  CASE 
    -- If rental_duration is 'daily' and rental_days exists
    WHEN cir.rental_duration = 'daily' AND cir.rental_days IS NOT NULL THEN
      (t.check_in_date::date + (cir.rental_days || ' days')::interval)::date
    -- If rental_duration is '6months'
    WHEN cir.rental_duration = '6months' THEN
      (t.check_in_date::date + '6 months'::interval)::date
    -- Fallback: 1 month
    ELSE
      (t.check_in_date::date + '1 month'::interval)::date
  END
)
FROM check_in_requests cir
WHERE 
  cir.assigned_room_id = t.room_id
  AND cir.status = 'completed';

