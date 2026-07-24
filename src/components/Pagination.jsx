'use client'

export default function Pagination({ page, setPage, totalPages, totalItems, pageSize, setPageSize }) {
  if (!totalItems) return <p className="py-8 text-center text-sm text-slate-400">No hay resultados</p>

  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, totalItems)

  return (
    <nav className="sticky left-0 flex min-w-[300px] flex-col items-center justify-between gap-3 border-t border-slate-100 bg-white px-1 py-4 text-sm text-slate-500 sm:flex-row" aria-label="Paginación">
      <div className="flex items-center gap-3">
        <span className="text-xs">{first}–{last} de {totalItems}</span>
        <label className="flex items-center gap-2">
          <span className="sr-only sm:not-sr-only text-xs">Filas</span>
          <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-700 outline-none focus:border-cyan-400" aria-label="Filas por página">
            <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option>
          </select>
        </label>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Anterior</button>
        <span className="min-w-[80px] text-center text-xs font-medium">{page} de {totalPages}</span>
        <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages} className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Siguiente</button>
      </div>
    </nav>
  )
}
