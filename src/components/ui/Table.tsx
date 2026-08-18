export default function Table({ headers, rows }: { headers: string[], rows: (string | React.ReactNode)[][] }) {
  return (
    <table className="min-w-full bg-white border border-gray-300">
      <thead className="bg-gray-100">
        <tr>
          {headers.map((header, i) => (
            <th key={i} className="py-3 px-4 text-left text-sm font-medium text-gray-700 border-b border-gray-200">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="hover:bg-gray-50">
            {row.map((cell, j) => (
              <td key={j} className="py-3 px-4 text-sm text-gray-900 border-b border-gray-200">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}