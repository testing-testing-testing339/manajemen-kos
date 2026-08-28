import { createClient } from '@supabase/supabase-js'
import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'
import path from 'path'

// Load .env.local manually
const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8')
const env = {}
envFile.split('\n').forEach(line => {
  const cleanLine = line.trim()
  if (cleanLine && !cleanLine.startsWith('#')) {
    const [key, ...vals] = cleanLine.split('=')
    if (key && vals.length > 0) {
      env[key.trim()] = vals.join('=').trim()
    }
  }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
})

async function checkAndMigrate(isDryRun = true) {
  console.log(`\n======================================================`)
  console.log(`=== CLOUDINARY MIGRATION TOOL (${isDryRun ? 'DRY-RUN / CEK SAJA' : 'EKSEKUSI MIGRASI'}) ===`)
  console.log(`======================================================\n`)

  let totalFound = 0
  let totalMigrated = 0
  let errors = 0

  // 1. Check & Migrate check_in_requests
  const { data: checkIns, error: err1 } = await supabase
    .from('check_in_requests')
    .select('id, full_name, id_card_photo_url, selfie_photo_url, payment_proof_url')
  
  if (err1) {
    console.error('Error fetching check_in_requests:', err1.message)
  } else {
    console.log(`[1] Memeriksa tabel 'check_in_requests' (${(checkIns || []).length} baris)...`)
    for (const c of checkIns || []) {
      const updates = {}

      if (c.id_card_photo_url && c.id_card_photo_url.includes('supabase.co')) {
        totalFound++
        console.log(`  - Menemukan KTP Tamu: ${c.full_name} (${c.id_card_photo_url})`)
        if (!isDryRun) {
          try {
            const res = await cloudinary.uploader.upload(c.id_card_photo_url, {
              folder: 'graha-aisyah/migrated/ktp',
              public_id: `ktp-${c.id}`,
              resource_type: 'image'
            })
            updates.id_card_photo_url = res.secure_url
            console.log(`    -> Sukses ke Cloudinary: ${res.secure_url}`)
          } catch (e) {
            console.error(`    -> Gagal upload Cloudinary:`, e.message)
            errors++
          }
        }
      }

      if (c.selfie_photo_url && c.selfie_photo_url.includes('supabase.co')) {
        totalFound++
        console.log(`  - Menemukan Selfie Tamu: ${c.full_name} (${c.selfie_photo_url})`)
        if (!isDryRun) {
          try {
            const res = await cloudinary.uploader.upload(c.selfie_photo_url, {
              folder: 'graha-aisyah/migrated/selfie',
              public_id: `selfie-${c.id}`,
              resource_type: 'image'
            })
            updates.selfie_photo_url = res.secure_url
            console.log(`    -> Sukses ke Cloudinary: ${res.secure_url}`)
          } catch (e) {
            console.error(`    -> Gagal upload Cloudinary:`, e.message)
            errors++
          }
        }
      }

      if (c.payment_proof_url && c.payment_proof_url.includes('supabase.co')) {
        totalFound++
        console.log(`  - Menemukan Bukti Bayar: ${c.full_name} (${c.payment_proof_url})`)
        if (!isDryRun) {
          try {
            const res = await cloudinary.uploader.upload(c.payment_proof_url, {
              folder: 'graha-aisyah/migrated/payment',
              public_id: `payment-${c.id}`,
              resource_type: 'image'
            })
            updates.payment_proof_url = res.secure_url
            console.log(`    -> Sukses ke Cloudinary: ${res.secure_url}`)
          } catch (e) {
            console.error(`    -> Gagal upload Cloudinary:`, e.message)
            errors++
          }
        }
      }

      if (!isDryRun && Object.keys(updates).length > 0) {
        const { error: updErr } = await supabase
          .from('check_in_requests')
          .update(updates)
          .eq('id', c.id)
        if (!updErr) {
          totalMigrated += Object.keys(updates).length
        } else {
          console.error(`    -> Gagal update DB check_in_requests:`, updErr.message)
          errors++
        }
      }
    }
  }

  // 2. Check & Migrate tenants
  const { data: tenants, error: err2 } = await supabase
    .from('tenants')
    .select('id, full_name, id_card_url')
  
  if (err2) {
    console.error('Error fetching tenants:', err2.message)
  } else {
    console.log(`\n[2] Memeriksa tabel 'tenants' (${(tenants || []).length} baris)...`)
    for (const t of tenants || []) {
      if (t.id_card_url && t.id_card_url.includes('supabase.co')) {
        totalFound++
        console.log(`  - Menemukan KTP Penghuni Aktif: ${t.full_name} (${t.id_card_url})`)
        if (!isDryRun) {
          try {
            const res = await cloudinary.uploader.upload(t.id_card_url, {
              folder: 'graha-aisyah/migrated/tenants',
              public_id: `tenant-ktp-${t.id}`,
              resource_type: 'image'
            })
            await supabase.from('tenants').update({ id_card_url: res.secure_url }).eq('id', t.id)
            totalMigrated++
            console.log(`    -> Sukses ke Cloudinary & DB: ${res.secure_url}`)
          } catch (e) {
            console.error(`    -> Gagal upload Cloudinary:`, e.message)
            errors++
          }
        }
      }
    }
  }

  // 3. Check & Migrate profiles (Staff)
  const { data: profiles, error: err3 } = await supabase
    .from('profiles')
    .select('id, full_name, photo_url')
  
  if (err3) {
    console.error('Error fetching profiles:', err3.message)
  } else {
    console.log(`\n[3] Memeriksa tabel 'profiles' (${(profiles || []).length} baris)...`)
    for (const p of profiles || []) {
      if (p.photo_url && p.photo_url.includes('supabase.co')) {
        totalFound++
        console.log(`  - Menemukan Foto Staf: ${p.full_name} (${p.photo_url})`)
        if (!isDryRun) {
          try {
            const res = await cloudinary.uploader.upload(p.photo_url, {
              folder: 'graha-aisyah/migrated/staff',
              public_id: `staff-${p.id}`,
              resource_type: 'image'
            })
            await supabase.from('profiles').update({ photo_url: res.secure_url }).eq('id', p.id)
            totalMigrated++
            console.log(`    -> Sukses ke Cloudinary & DB: ${res.secure_url}`)
          } catch (e) {
            console.error(`    -> Gagal upload Cloudinary:`, e.message)
            errors++
          }
        }
      }
    }
  }

  console.log(`\n======================================================`)
  console.log(`Total Foto di Supabase Ditemukan : ${totalFound}`)
  if (!isDryRun) {
    console.log(`Total Berhasil Dimigrasi ke Cloudinary: ${totalMigrated}`)
    console.log(`Total Gagal                     : ${errors}`)
  }
  console.log(`======================================================\n`)
}

const isExecute = process.argv.includes('--execute')
checkAndMigrate(!isExecute).catch(console.error)
