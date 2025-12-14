-- Script untuk reset data keuangan dan riwayat transaksi
-- PERINGATAN: Script ini akan menghapus semua data pembayaran dan riwayat check-in
-- Data yang TIDAK akan dihapus: tenants, rooms, floors, branches, profiles

BEGIN;

-- 1. Hapus semua data pembayaran (payments)
DELETE FROM payments;
RAISE NOTICE 'Data pembayaran telah dihapus';

-- 2. Hapus semua riwayat check-in requests
DELETE FROM check_in_requests;
RAISE NOTICE 'Riwayat check-in requests telah dihapus';

-- 3. Reset payment_due_date untuk semua tenants
-- Hitung ulang berdasarkan check_in_date + 1 bulan (default)
UPDATE tenants
SET payment_due_date = (check_in_date::date + '1 month'::interval)::date;
RAISE NOTICE 'Payment due date untuk tenants telah di-reset';

-- 4. Tampilkan ringkasan
DO $$
DECLARE
  tenant_count INTEGER;
  room_count INTEGER;
  payment_count INTEGER;
  checkin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO tenant_count FROM tenants;
  SELECT COUNT(*) INTO room_count FROM rooms;
  SELECT COUNT(*) INTO payment_count FROM payments;
  SELECT COUNT(*) INTO checkin_count FROM check_in_requests;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Ringkasan setelah reset:';
  RAISE NOTICE 'Total Penghuni: %', tenant_count;
  RAISE NOTICE 'Total Kamar: %', room_count;
  RAISE NOTICE 'Total Pembayaran: %', payment_count;
  RAISE NOTICE 'Total Check-in Requests: %', checkin_count;
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- Verifikasi hasil
SELECT 
  'Tenants' as table_name,
  COUNT(*) as record_count
FROM tenants
UNION ALL
SELECT 
  'Rooms' as table_name,
  COUNT(*) as record_count
FROM rooms
UNION ALL
SELECT 
  'Payments' as table_name,
  COUNT(*) as record_count
FROM payments
UNION ALL
SELECT 
  'Check-in Requests' as table_name,
  COUNT(*) as record_count
FROM check_in_requests
ORDER BY table_name;

