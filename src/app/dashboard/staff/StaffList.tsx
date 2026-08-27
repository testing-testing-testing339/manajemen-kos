'use client'

import { useEffect, useState } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { createStaff, updateStaff, deleteStaff, changeStaffPassword } from './actions'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'
import SubmitButton from '@/components/ui/SubmitButton'
import { Users, UserCheck, UserX, Plus, KeyRound, Pencil, Trash2, ShieldCheck, Mail, Phone, Building2 } from 'lucide-react'

export default function StaffList({ initialStaff, initialBranches }: { initialStaff: any[], initialBranches: any[] }) {
  const [staff, setStaff] = useState(initialStaff)
  const [branches, setBranches] = useState(initialBranches)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<any>(null)
  const [createState, createAction] = useActionState(createStaff, null)
  const [updateState, updateAction] = useActionState(updateStaff, null)
  const [deleteState, deleteAction] = useActionState(deleteStaff, null)
  const [passwordState, passwordAction] = useActionState(changeStaffPassword, null)
  const router = useRouter()

  // Sync state with props
  useEffect(() => {
    setStaff(initialStaff)
    setBranches(initialBranches)
  }, [initialStaff, initialBranches])

  useEffect(() => {
    if (createState?.success) {
      setIsModalOpen(false)
      router.refresh()
    }
  }, [createState, router])

  useEffect(() => {
    if (updateState?.success) {
      setIsEditModalOpen(false)
      setSelectedStaff(null)
      router.refresh()
    }
  }, [updateState, router])

  useEffect(() => {
    if (deleteState?.success) {
      router.refresh()
    }
  }, [deleteState, router])

  useEffect(() => {
    if (passwordState?.success) {
      setIsPasswordModalOpen(false)
      setSelectedStaff(null)
      router.refresh()
    }
  }, [passwordState, router])

  // Statistics
  const totalStaff = staff.length
  const activeStaff = staff.filter(s => s.is_active !== false).length
  const inactiveStaff = totalStaff - activeStaff

  const headers = ['Foto', 'Nama', 'Email Login', 'Role', 'Cabang', 'Telepon', 'Status', 'Aksi']
  const rows = staff.map(staffMember => {
    const statusBadge = staffMember.is_active !== false ? (
      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold inline-flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
        Aktif
      </span>
    ) : (
      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold inline-flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
        Nonaktif
      </span>
    )

    return [
      <div key={`photo-${staffMember.id}`} className="flex items-center">
        {staffMember.photo_url ? (
          <img 
            src={staffMember.photo_url} 
            alt={staffMember.full_name}
            className="w-10 h-10 rounded-full object-cover border border-slate-200"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-sm">
            {(staffMember.full_name || 'S').charAt(0).toUpperCase()}
          </div>
        )}
      </div>,
      <div key={`name-${staffMember.id}`}>
        <p className="font-bold text-slate-900">{staffMember.full_name}</p>
        <p className="text-[11px] text-slate-400">ID: {staffMember.id.substring(0, 8)}</p>
      </div>,
      <span key={`email-${staffMember.id}`} className="font-mono text-xs font-semibold text-indigo-950 bg-indigo-50/60 px-2.5 py-1 rounded-lg border border-indigo-100/80">
        {staffMember.email || 'N/A'}
      </span>,
      <span key={`role-${staffMember.id}`} className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md text-xs font-bold uppercase tracking-wider">
        {staffMember.role}
      </span>,
      <span key={`branch-${staffMember.id}`} className="text-xs font-medium text-slate-700">{staffMember.branches?.name || '-'}</span>,
      <span key={`phone-${staffMember.id}`} className="text-xs text-slate-600">{staffMember.phone || '-'}</span>,
      statusBadge,
      <div key={`actions-${staffMember.id}`} className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            setSelectedStaff(staffMember)
            setIsEditModalOpen(true)
          }}
          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-all text-xs cursor-pointer flex items-center gap-1"
        >
          <Pencil className="w-3.5 h-3.5" />
          <span>Edit</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedStaff(staffMember)
            setIsPasswordModalOpen(true)
          }}
          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 rounded-lg font-bold transition-all text-xs cursor-pointer flex items-center gap-1"
        >
          <KeyRound className="w-3.5 h-3.5 text-amber-600" />
          <span>Ganti Password</span>
        </button>
        <form action={deleteAction}>
          <input type="hidden" name="staff_id" value={staffMember.id} />
          <SubmitButton
            variant="danger"
            className="px-2.5 py-1.5 text-xs font-bold"
            loadingText="Hapus..."
          >
            Hapus
          </SubmitButton>
        </form>
      </div>
    ]
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Manajemen Staff
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Graha Aisyah Menteng • Kelola hak akses login resepsionis shift pagi dan shift malam
          </p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)} 
          className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-xs flex items-center gap-2 text-xs cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Staff Baru</span>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Staff</p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{totalStaff}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Staff Aktif</p>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">{activeStaff}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Staff Nonaktif</p>
            <p className="text-2xl sm:text-3xl font-black text-slate-700 mt-1">{inactiveStaff}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
            <UserX className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
        <Table headers={headers} rows={rows} />
      </div>

      {/* Create Staff Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h2 className="text-xl font-bold mb-4 text-slate-900">Tambah Staff Baru</h2>
        <StaffForm 
          action={createAction}
          branches={branches}
          state={createState}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      {/* Edit Staff Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => {
        setIsEditModalOpen(false)
        setSelectedStaff(null)
      }}>
        {selectedStaff && (
          <>
            <h2 className="text-xl font-bold mb-4 text-slate-900">Edit Staff</h2>
            <StaffForm 
              action={updateAction}
              branches={branches}
              state={updateState}
              staff={selectedStaff}
              onCancel={() => {
                setIsEditModalOpen(false)
                setSelectedStaff(null)
              }}
            />
          </>
        )}
      </Modal>

      {/* Change Password Modal */}
      <Modal isOpen={isPasswordModalOpen} onClose={() => {
        setIsPasswordModalOpen(false)
        setSelectedStaff(null)
      }}>
        {selectedStaff && (
          <>
            <h2 className="text-xl font-bold mb-4 text-slate-900">Ganti Password Staff</h2>
            <form action={passwordAction} className="space-y-4">
              <input type="hidden" name="staff_id" value={selectedStaff.id} />
              
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Akun Staff</p>
                <p className="font-bold text-slate-900 text-sm">{selectedStaff.full_name}</p>
                <p className="font-mono text-xs text-indigo-600 font-semibold">{selectedStaff.email}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Password baru akan digunakan saat staf login dengan email di atas.
                </p>
              </div>

              <div>
                <label htmlFor="new_password" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Password Baru *
                </label>
                <input
                  id="new_password"
                  name="new_password"
                  type="password"
                  required
                  minLength={6}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Minimal 6 karakter"
                />
              </div>

              <div>
                <label htmlFor="confirm_password" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Konfirmasi Password Baru *
                </label>
                <input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  required
                  minLength={6}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ulangi password baru"
                />
              </div>

              {passwordState?.error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{passwordState.error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => {
                    setIsPasswordModalOpen(false)
                    setSelectedStaff(null)
                  }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <SubmitButton
                  variant="primary"
                  className="flex-1 px-4 py-2.5 text-xs font-bold"
                  loadingText="Mengganti password..."
                >
                  Simpan Password Baru
                </SubmitButton>
              </div>
            </form>
          </>
        )}
      </Modal>
    </div>
  )
}

// Staff Form Component
function StaffForm({ 
  action, 
  branches, 
  state, 
  staff, 
  onCancel 
}: { 
  action: any, 
  branches: any[], 
  state: any, 
  staff?: any,
  onCancel: () => void 
}) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(staff?.photo_url || null)

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <form action={action} className="space-y-4">
      {staff && <input type="hidden" name="staff_id" value={staff.id} />}
      
      {/* Photo Upload */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Foto Staff</label>
        <div className="flex items-center gap-4">
          {photoPreview ? (
            <img 
              src={photoPreview} 
              alt="Preview" 
              className="w-16 h-16 rounded-full object-cover border-2 border-slate-200"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-xl">
              {staff?.full_name?.charAt(0).toUpperCase() || 'S'}
            </div>
          )}
          <div>
            <input
              type="file"
              name="photo"
              accept="image/*"
              onChange={handlePhotoChange}
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
            />
            <p className="mt-1 text-[11px] text-slate-400">Format: JPG, PNG. Maksimal 2MB</p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Nama Lengkap *</label>
        <input 
          name="full_name" 
          type="text" 
          required 
          defaultValue={staff?.full_name || ''}
          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" 
          placeholder="Masukkan nama lengkap" 
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Email Login *</label>
        <input 
          name="email" 
          type="email" 
          required 
          defaultValue={staff?.email || ''}
          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" 
          placeholder="staff@grahamenteng.com" 
        />
        <p className="mt-1 text-[11px] text-slate-400">Email ini digunakan staf untuk login ke sistem</p>
      </div>

      {!staff && (
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Password Awal *</label>
          <input 
            name="password" 
            type="password" 
            required={!staff}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" 
            placeholder="Minimal 6 karakter" 
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Cabang *</label>
        <select 
          name="branch_id" 
          required 
          defaultValue={staff?.branch_id || ''}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        >
          <option value="">Pilih Cabang</option>
          {branches.map(branch => (
            <option key={branch.id} value={branch.id}>{branch.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">No. Telepon</label>
        <input 
          name="phone" 
          type="text" 
          defaultValue={staff?.phone || ''}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" 
          placeholder="08xxxxxxxxxx" 
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Alamat</label>
        <textarea 
          name="address" 
          rows={3}
          defaultValue={staff?.address || ''}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
          placeholder="Masukkan alamat staff"
        ></textarea>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Keterangan/Catatan</label>
        <textarea 
          name="notes" 
          rows={3}
          defaultValue={staff?.notes || ''}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
          placeholder="Tambahkan catatan tentang staff"
        ></textarea>
      </div>

      {staff && (
        <div>
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              name="is_active" 
              defaultChecked={staff.is_active !== false}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="text-sm font-semibold text-gray-700">Staff Aktif</span>
          </label>
        </div>
      )}

      {state?.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{state.error}</p>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button 
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Batal
        </button>
        <SubmitButton
          variant="primary"
          className="flex-1 px-4 py-3"
          loadingText={staff ? 'Mengupdate...' : 'Menambahkan...'}
        >
          {staff ? 'Update Staff' : 'Tambah Staff'}
        </SubmitButton>
      </div>
    </form>
  )
}

