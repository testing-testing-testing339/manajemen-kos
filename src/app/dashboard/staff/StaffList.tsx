'use client'

import { useEffect, useState } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { createStaff, updateStaff, deleteStaff, changeStaffPassword } from './actions'
import Modal from '@/components/ui/Modal'
import Table from '@/components/ui/Table'

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

  const headers = ['Foto', 'Nama', 'Email', 'Role', 'Cabang', 'Telepon', 'Status', 'Actions']
  const rows = staff.map(staffMember => {
    const statusBadge = staffMember.is_active !== false ? (
      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold flex items-center gap-1 w-fit">
        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
        Aktif
      </span>
    ) : (
      <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold flex items-center gap-1 w-fit">
        <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
        Nonaktif
      </span>
    )

    return [
      <div key={`photo-${staffMember.id}`} className="flex items-center">
        {staffMember.photo_url ? (
          <img 
            src={staffMember.photo_url} 
            alt={staffMember.full_name}
            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
            {(staffMember.full_name || 'S').charAt(0).toUpperCase()}
          </div>
        )}
      </div>,
      <span key={`name-${staffMember.id}`} className="font-semibold text-gray-900">{staffMember.full_name}</span>,
      <span key={`email-${staffMember.id}`} className="text-sm text-gray-600">
        {staffMember.email || 'N/A'}
      </span>,
      <span key={`role-${staffMember.id}`} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">{staffMember.role}</span>,
      <span key={`branch-${staffMember.id}`} className="text-sm">{staffMember.branches?.name || '-'}</span>,
      <span key={`phone-${staffMember.id}`} className="text-sm">{staffMember.phone || '-'}</span>,
      statusBadge,
      <div key={`actions-${staffMember.id}`} className="flex gap-2">
        <button
          onClick={() => {
            setSelectedStaff(staffMember)
            setIsEditModalOpen(true)
          }}
          className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium transition-all duration-150 active:scale-95 text-sm"
        >
          Edit
        </button>
        <button
          onClick={() => {
            setSelectedStaff(staffMember)
            setIsPasswordModalOpen(true)
          }}
          className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 font-medium transition-all duration-150 active:scale-95 text-sm"
        >
          Ganti Password
        </button>
        <form action={deleteAction}>
          <input type="hidden" name="staff_id" value={staffMember.id} />
          <button 
            type="submit" 
            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium transition-all duration-150 active:scale-95 active:bg-red-200 text-sm"
          >
            Hapus
          </button>
        </form>
      </div>
    ]
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-lg font-bold">GA</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Manajemen Staff</h1>
              <p className="text-gray-600">Graha Aisyah Mainframe System</p>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Staff
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold opacity-90">Total Staff</h3>
            <svg className="w-6 h-6 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold">{totalStaff}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold opacity-90">Staff Aktif</h3>
            <svg className="w-6 h-6 opacity-80" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-3xl font-bold">{activeStaff}</p>
        </div>

        <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold opacity-90">Staff Nonaktif</h3>
            <svg className="w-6 h-6 opacity-80" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-3xl font-bold">{inactiveStaff}</p>
        </div>
      </div>

      {/* Staff Table */}
      <Table headers={headers} rows={rows} />

      {/* Create Staff Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Tambah Staff Baru</h2>
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
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Edit Staff</h2>
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
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Ganti Password</h2>
            <form action={passwordAction} className="space-y-5">
              <input type="hidden" name="staff_id" value={selectedStaff.id} />
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Staff
                </label>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="font-semibold text-gray-900">{selectedStaff.full_name}</p>
                  <p className="text-sm text-gray-600">{selectedStaff.email}</p>
                </div>
              </div>

              <div>
                <label htmlFor="new_password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password Baru *
                </label>
                <input
                  id="new_password"
                  name="new_password"
                  type="password"
                  required
                  minLength={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Masukkan password baru (minimal 6 karakter)"
                />
              </div>

              <div>
                <label htmlFor="confirm_password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Konfirmasi Password Baru *
                </label>
                <input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  required
                  minLength={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Konfirmasi password baru"
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
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 active:scale-95"
                >
                  Ganti Password
                </button>
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
    <form action={action} className="space-y-5">
      {staff && <input type="hidden" name="staff_id" value={staff.id} />}
      
      {/* Photo Upload */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Foto Staff</label>
        <div className="flex items-center gap-4">
          {photoPreview ? (
            <img 
              src={photoPreview} 
              alt="Preview" 
              className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
              {staff?.full_name?.charAt(0).toUpperCase() || 'S'}
            </div>
          )}
          <div>
            <input
              type="file"
              name="photo"
              accept="image/*"
              onChange={handlePhotoChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <p className="mt-1 text-xs text-gray-500">Format: JPG, PNG. Max 2MB</p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Lengkap *</label>
        <input 
          name="full_name" 
          type="text" 
          required 
          defaultValue={staff?.full_name || ''}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" 
          placeholder="Masukkan nama lengkap" 
        />
      </div>

      {!staff ? (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
          <input 
            name="email" 
            type="email" 
            required 
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" 
            placeholder="email@example.com" 
          />
          <p className="mt-1 text-xs text-gray-500">Email akan digunakan untuk login</p>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
          <input 
            type="email" 
            value={staff.email || 'N/A'}
            disabled
            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed" 
          />
          <p className="mt-1 text-xs text-gray-500">Email tidak dapat diubah</p>
        </div>
      )}

      {!staff && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Password *</label>
          <input 
            name="password" 
            type="password" 
            required={!staff}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" 
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
        <button 
          type="submit" 
          className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 active:scale-95"
        >
          {staff ? 'Update Staff' : 'Tambah Staff'}
        </button>
      </div>
    </form>
  )
}

