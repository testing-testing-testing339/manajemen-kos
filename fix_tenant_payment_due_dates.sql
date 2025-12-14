-- Fix payment_due_date for existing tenants based on check_in_date and rental_duration/rental_days
-- This script recalculates payment_due_date for tenants that have associated check_in_requests

UPDATE tenants t
SET payment_due_date = (
  CASE 
    -- If rental_duration is 'daily' and rental_days exists
    WHEN cir.rental_duration = 'daily' AND cir.rental_days IS NOT NULL THEN
      (t.check_in_date + (cir.rental_days || ' days')::interval)::date
    -- If rental_duration is '6months'
    WHEN cir.rental_duration = '6months' THEN
      (t.check_in_date + '6 months'::interval)::date
    -- Fallback: 1 month
    ELSE
      (t.check_in_date + '1 month'::interval)::date
  END
)
FROM check_in_requests cir
WHERE 
  cir.assigned_room_id = t.room_id
  AND cir.status = 'completed'
  AND (
    -- Only update if payment_due_date seems incorrect (more than 2 months difference from check_in_date)
    -- This prevents updating correctly calculated dates
    (cir.rental_duration = 'daily' AND cir.rental_days IS NOT NULL 
     AND t.payment_due_date != (t.check_in_date + (cir.rental_days || ' days')::interval)::date)
    OR
    (cir.rental_duration = '6months' 
     AND t.payment_due_date != (t.check_in_date + '6 months'::interval)::date)
    OR
    (cir.rental_duration IS NULL 
     AND t.payment_due_date != (t.check_in_date + '1 month'::interval)::date)
  );

-- Show updated records
SELECT 
  t.id,
  t.full_name,
  t.check_in_date,
  t.payment_due_date as old_payment_due_date,
  (
    CASE 
      WHEN cir.rental_duration = 'daily' AND cir.rental_days IS NOT NULL THEN
        (t.check_in_date + (cir.rental_days || ' days')::interval)::date
      WHEN cir.rental_duration = '6months' THEN
        (t.check_in_date + '6 months'::interval)::date
      ELSE
        (t.check_in_date + '1 month'::interval)::date
    END
  ) as calculated_payment_due_date,
  cir.rental_duration,
  cir.rental_days
FROM tenants t
LEFT JOIN check_in_requests cir ON cir.assigned_room_id = t.room_id AND cir.status = 'completed'
ORDER BY t.check_in_date DESC;

