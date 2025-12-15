'use client'

import { useState } from 'react'
import QRCode from 'qrcode'

type TabType = 'checkin' | 'complaint'

export default function QRGenerator({ branches, userRole }: { branches: any[], userRole: string | null }) {
  const [activeTab, setActiveTab] = useState<TabType>('checkin')
  const [selectedBranch, setSelectedBranch] = useState(branches[0]?.id || '')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const generateCheckInQR = async (branchId: string) => {
    setLoading(true)
    try {
      const siteUrl = window.location.origin
      const checkInUrl = `${siteUrl}/check-in/${branchId}`
      
      // Generate QR code
      const qrDataUrl = await QRCode.toDataURL(checkInUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })

      setQrCodeUrl(qrDataUrl)

      // Save to database
      const response = await fetch('/api/branch/generate-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branch_id: branchId,
          qr_code_data: checkInUrl
        }),
      })

      if (!response.ok) {
        console.error('Failed to save QR code')
      }
    } catch (error) {
      console.error('Error generating QR code:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateComplaintQR = async (branchId: string) => {
    setLoading(true)
    try {
      const siteUrl = window.location.origin
      const complaintUrl = `${siteUrl}/komplain/${branchId}`
      
      // Generate QR code
      const qrDataUrl = await QRCode.toDataURL(complaintUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })

      setQrCodeUrl(qrDataUrl)
    } catch (error) {
      console.error('Error generating QR code:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateQR = (branchId: string) => {
    if (activeTab === 'checkin') {
      generateCheckInQR(branchId)
    } else {
      generateComplaintQR(branchId)
    }
  }

  const downloadQR = () => {
    if (!qrCodeUrl) return
    
    const link = document.createElement('a')
    const type = activeTab === 'checkin' ? 'checkin' : 'komplain'
    link.download = `qr-code-${type}-${selectedBranch}.png`
    link.href = qrCodeUrl
    link.click()
  }

  const selectedBranchData = branches.find(b => b.id === selectedBranch)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Generator QR Code</h1>
        <p className="text-gray-600">Generate QR code untuk check-in dan komplain di setiap cabang</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm p-1 border border-gray-200 inline-flex">
        <button
          onClick={() => {
            setActiveTab('checkin')
            setQrCodeUrl('')
          }}
          className={`px-6 py-2 rounded-lg font-semibold transition-all ${
            activeTab === 'checkin'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Check-in
        </button>
        <button
          onClick={() => {
            setActiveTab('complaint')
            setQrCodeUrl('')
          }}
          className={`px-6 py-2 rounded-lg font-semibold transition-all ${
            activeTab === 'complaint'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Komplain
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Pilih Cabang</label>
          <select
            value={selectedBranch}
            onChange={(e) => {
              setSelectedBranch(e.target.value)
              setQrCodeUrl('')
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            {branches.map(branch => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        </div>

        {selectedBranchData && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Cabang: <span className="font-semibold">{selectedBranchData.name}</span></p>
            <p className="text-sm text-gray-600">Alamat: {selectedBranchData.address}</p>
          </div>
        )}

        <button
          onClick={() => generateQR(selectedBranch)}
          disabled={loading || !selectedBranch}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Generating...' : 'Generate QR Code'}
        </button>

        {qrCodeUrl && (
          <div className="mt-6 text-center">
            <div className="inline-block p-4 bg-white border-2 border-gray-300 rounded-lg">
              <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
            </div>
            <p className="text-sm text-gray-600 mt-4 mb-2">
              Scan QR code ini untuk {activeTab === 'checkin' ? 'check-in' : 'mengisi komplain'} di cabang <span className="font-semibold">{selectedBranchData?.name}</span>
            </p>
            <button
              onClick={downloadQR}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
            >
              Download QR Code
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

