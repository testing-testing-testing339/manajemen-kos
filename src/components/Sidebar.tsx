import Link from 'next/link'

export default function Sidebar() {
  return (
    <div className="bg-white text-gray-700 w-64 min-h-screen p-4 border-r border-gray-200">
      <h2 className="text-xl font-bold mb-6">Manajemen Kost</h2>
      <nav>
        <ul>
          <li className="mb-2">
            <Link href="/dashboard" className="block py-2 px-4 rounded hover:bg-gray-100">Dashboard</Link>
          </li>
          <li className="mb-2">
            <Link href="/dashboard/cabang" className="block py-2 px-4 rounded hover:bg-gray-100">Cabang</Link>
          </li>
          <li className="mb-2">
            <Link href="/dashboard/lantai" className="block py-2 px-4 rounded hover:bg-gray-100">Lantai</Link>
          </li>
          <li className="mb-2">
            <Link href="/dashboard/kamar" className="block py-2 px-4 rounded hover:bg-gray-100">Kamar</Link>
          </li>
          <li className="mb-2">
            <Link href="/dashboard/penghuni" className="block py-2 px-4 rounded hover:bg-gray-100">Penghuni</Link>
          </li>
        </ul>
      </nav>
    </div>
  )
}