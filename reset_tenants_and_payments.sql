-- ============================================
-- RESET SEMUA DATA UNTUK TESTING
-- ============================================
-- WARNING: Script ini akan menghapus SEMUA data:
--   - Semua pembayaran (payments)
--   - Semua tenant/penghuni (tenants)
--   - Semua check-in requests
--   - Reset semua kamar menjadi kosong (is_occupied = false)
--
-- Gunakan script ini HANYA untuk testing/development!
-- JANGAN jalankan di production tanpa backup!
-- ============================================

BEGIN;

-- Step 1: Hapus semua check-in requests
DELETE FROM check_in_requests;

-- Step 2: Hapus semua pembayaran
DELETE FROM payments;

-- Step 3: Hapus data guest_book (jika tabel masih ada) - harus sebelum hapus tenants
-- karena ada foreign key constraint
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'guest_book') THEN
        DELETE FROM guest_book;
    END IF;
END $$;

-- Step 4: Hapus semua tenant/penghuni (setelah guest_book dihapus)
DELETE FROM tenants;

-- Step 5: Reset semua kamar menjadi kosong
UPDATE rooms SET is_occupied = false;

COMMIT;

-- ============================================
-- VERIFIKASI RESET
-- ============================================
SELECT 
    'Data setelah reset:' as info,
    (SELECT COUNT(*) FROM tenants) as total_tenants,
    (SELECT COUNT(*) FROM payments) as total_payments,
    (SELECT COUNT(*) FROM check_in_requests) as total_check_ins,
    (SELECT COUNT(*) FROM rooms WHERE is_occupied = true) as kamar_terisi,
    (SELECT COUNT(*) FROM rooms WHERE is_occupied = false) as kamar_kosong;

-- Cek apakah guest_book masih ada dan berapa datanya
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'guest_book') THEN
        RAISE NOTICE 'Tabel guest_book masih ada di database (total: % baris)', 
            (SELECT COUNT(*) FROM guest_book);
    ELSE
        RAISE NOTICE 'Tabel guest_book tidak ditemukan';
    END IF;
END $$;

