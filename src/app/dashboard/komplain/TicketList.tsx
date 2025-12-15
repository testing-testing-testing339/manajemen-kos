'use client'

import { useEffect, useState, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { updateTicketStatus } from './actions'
import SubmitButton from '@/components/ui/SubmitButton'
import Modal from '@/components/ui/Modal'

export default function TicketList({ 
  initialTickets, 
  userRole,
  openTicketsCount: initialOpenCount 
}: { 
  initialTickets: any[]
  userRole: string | null
  openTicketsCount: number
}) {
  const [tickets, setTickets] = useState(initialTickets)
  const [openTicketsCount, setOpenTicketsCount] = useState(initialOpenCount)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [state, formAction] = useActionState(updateTicketStatus, null)
  const router = useRouter()

  // Real-time subscription
  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Subscribe to ticket changes
    const channel = supabase
      .channel('tickets-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'tickets',
        },
        (payload) => {
          console.log('Ticket change detected:', payload)
          // Refresh the page to get updated data
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  // Update tickets when initialTickets changes (from real-time updates)
  useEffect(() => {
    setTickets(initialTickets)
    const openCount = initialTickets.filter((t: any) => 
      t.status === 'open' || t.status === 'in_progress'
    ).length
    setOpenTicketsCount(openCount)
    
    // Update badge in sidebar (using custom event)
    window.dispatchEvent(new CustomEvent('tickets-updated', { detail: openCount }))
  }, [initialTickets])

  // Close modal on success
  useEffect(() => {
    if (state?.success) {
      setIsDetailModalOpen(false)
      setSelectedTicket(null)
      router.refresh()
    }
  }, [state, router])

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      open: { label: 'Terbuka', className: 'bg-yellow-100 text-yellow-800' },
      in_progress: { label: 'Ditangani', className: 'bg-blue-100 text-blue-800' },
      resolved: { label: 'Selesai', className: 'bg-green-100 text-green-800' },
      closed: { label: 'Ditutup', className: 'bg-gray-100 text-gray-800' },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${config.className}`}>
        {config.label}
      </span>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { label: 'Rendah', className: 'bg-gray-100 text-gray-800' },
      medium: { label: 'Sedang', className: 'bg-blue-100 text-blue-800' },
      high: { label: 'Tinggi', className: 'bg-orange-100 text-orange-800' },
      urgent: { label: 'Mendesak', className: 'bg-red-100 text-red-800' },
    }
    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${config.className}`}>
        {config.label}
      </span>
    )
  }

  const getCategoryLabel = (category: string) => {
    const categoryMap: Record<string, string> = {
      plumbing: 'Pipa & Air',
      electrical: 'Listrik',
      cleaning: 'Kebersihan',
      furniture: 'Perabotan',
      security: 'Keamanan',
      other: 'Lainnya',
    }
    return categoryMap[category] || category
  }

  const canManageTicket = userRole === 'owner' || userRole === 'staff'

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {userRole === 'tenant' ? 'Komplain Saya' : 'Daftar Komplain'}
          </h2>
          {canManageTicket && openTicketsCount > 0 && (
            <div className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
              {openTicketsCount} Belum Ditangani
            </div>
          )}
        </div>

        {tickets.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-gray-500 font-semibold">Belum ada komplain</p>
            <p className="text-sm text-gray-400 mt-1">
              {userRole === 'tenant' 
                ? 'Komplain yang Anda buat akan muncul di sini'
                : 'Belum ada komplain dari penyewa'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket: any) => (
              <div
                key={ticket.id}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all cursor-pointer"
                onClick={() => {
                  setSelectedTicket(ticket)
                  setIsDetailModalOpen(true)
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{ticket.title}</h3>
                      {getStatusBadge(ticket.status)}
                      {getPriorityBadge(ticket.priority)}
                    </div>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {ticket.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>📁 {getCategoryLabel(ticket.category)}</span>
                      {ticket.tenants && (
                        <span>👤 {ticket.tenants.full_name}</span>
                      )}
                      {ticket.rooms && (
                        <span>🚪 Kamar No. {ticket.rooms.room_number}</span>
                      )}
                      <span>🕐 {new Date(ticket.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                  {canManageTicket && ticket.status === 'open' && (
                    <div className="ml-4">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-red-100 text-red-800 rounded-full text-xs font-bold">
                        !
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ticket Detail Modal */}
      <Modal 
        isOpen={isDetailModalOpen} 
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedTicket(null)
        }}
      >
        {selectedTicket && (
          <>
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Detail Komplain</h2>

            {state?.error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{state.error}</p>
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Judul</p>
                <p className="font-semibold text-gray-900">{selectedTicket.title}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Deskripsi</p>
                <p className="text-gray-900 whitespace-pre-wrap">{selectedTicket.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Kategori</p>
                  <p className="font-semibold text-gray-900">{getCategoryLabel(selectedTicket.category)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Prioritas</p>
                  <div>{getPriorityBadge(selectedTicket.priority)}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <div>{getStatusBadge(selectedTicket.status)}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Tanggal Dibuat</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(selectedTicket.created_at).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              {selectedTicket.tenants && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Penyewa</p>
                  <p className="font-semibold text-gray-900">{selectedTicket.tenants.full_name}</p>
                </div>
              )}

              {selectedTicket.rooms && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Kamar</p>
                  <p className="font-semibold text-gray-900">
                    No. {selectedTicket.rooms.room_number} - {selectedTicket.rooms.floors?.branches?.name}
                  </p>
                </div>
              )}

              {selectedTicket.assigned_to && selectedTicket.profiles && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Ditangani Oleh</p>
                  <p className="font-semibold text-gray-900">{selectedTicket.profiles.full_name}</p>
                </div>
              )}

              {selectedTicket.resolution_notes && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-600 mb-1">Catatan Penyelesaian</p>
                  <p className="text-blue-900 whitespace-pre-wrap">{selectedTicket.resolution_notes}</p>
                </div>
              )}
            </div>

            {canManageTicket && (
              <form action={formAction} className="space-y-4">
                <input type="hidden" name="ticket_id" value={selectedTicket.id} />

                {selectedTicket.status === 'open' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tindakan
                    </label>
                    <input type="hidden" name="status" value="in_progress" />
                    <SubmitButton
                      variant="primary"
                      className="w-full"
                      loadingText="Memproses..."
                    >
                      Ambil Tiket (Mulai Tangani)
                    </SubmitButton>
                  </div>
                )}

                {selectedTicket.status === 'in_progress' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Catatan Penyelesaian
                      </label>
                      <textarea
                        name="resolution_notes"
                        rows={3}
                        placeholder="Jelaskan bagaimana masalah telah ditangani..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                      />
                    </div>
                    <div className="flex gap-3">
                      <input type="hidden" name="status" value="resolved" />
                      <SubmitButton
                        variant="success"
                        className="flex-1"
                        loadingText="Menyelesaikan..."
                      >
                        Tandai Selesai
                      </SubmitButton>
                      <button
                        type="button"
                        onClick={() => {
                          setIsDetailModalOpen(false)
                          setSelectedTicket(null)
                        }}
                        className="px-6 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                      >
                        Batal
                      </button>
                    </div>
                  </>
                )}

                {selectedTicket.status === 'resolved' && (
                  <div>
                    <input type="hidden" name="status" value="closed" />
                    <SubmitButton
                      variant="primary"
                      className="w-full"
                      loadingText="Menutup..."
                    >
                      Tutup Tiket
                    </SubmitButton>
                  </div>
                )}
              </form>
            )}

            {!canManageTicket && (
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false)
                    setSelectedTicket(null)
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Tutup
                </button>
              </div>
            )}
          </>
        )}
      </Modal>
    </>
  )
}

