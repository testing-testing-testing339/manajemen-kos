export default function Table({ 
  headers, 
  rows,
  minWidth = 'min-w-[680px]'
}: { 
  headers: string[]
  rows: (string | React.ReactNode)[][]
  minWidth?: string
}) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs scrollbar-thin">
      <table className={`w-full ${minWidth} text-left border-collapse`}>
        <thead>
          <tr className="bg-slate-50/80 border-b border-slate-200/80">
            {headers.map((header, i) => (
              <th key={i} className="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/60 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className="py-3.5 px-4 text-sm font-medium text-slate-700 whitespace-nowrap">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}