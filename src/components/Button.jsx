'use client'

const base = 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-sm transition duration-200 focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-55'

const variants = {
    Primary: 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-200',
    PrimaryPrint: 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-200',
    Secondary: 'border-cyan-400 bg-cyan-400 text-slate-950 hover:border-cyan-300 hover:bg-cyan-300 focus-visible:ring-cyan-100',
    Transparent: 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-100',
    Success: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-100',
    SuccessBuy: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-100',
    SuccessReceta: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 focus-visible:ring-emerald-100',
    MiniSuccessRecetar: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-100',
    Danger: 'border-rose-600 bg-rose-600 text-white hover:bg-rose-500 focus-visible:ring-rose-100',
    Disable: 'border-slate-200 bg-slate-100 text-slate-400 shadow-none',
    MiniPrimary: 'mx-auto h-11 min-h-11 w-11 rounded-xl border-slate-900 bg-slate-900 p-0 text-lg text-white hover:bg-slate-800 focus-visible:ring-slate-200',
    MiniPrimaryComprar: 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-200',
    MiniPrimaryInfo: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-500 focus-visible:ring-blue-100',
    MiniSecondary: 'mx-auto h-11 min-h-11 w-11 rounded-xl border-cyan-400 bg-cyan-400 p-0 text-lg text-slate-950 hover:bg-cyan-300 focus-visible:ring-cyan-100',
    MiniSuccess: 'mx-auto h-11 min-h-11 w-11 rounded-xl border-emerald-600 bg-emerald-600 p-0 text-lg text-white hover:bg-emerald-500 focus-visible:ring-emerald-100',
}

function Spinner() {
    return <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3"/><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
}

export default function Button({ theme = 'Primary', styled = '', click, children, type = 'button', disabled, ...props }) {
    const loading = theme === 'Loading'
    const variant = loading ? 'border-slate-700 bg-slate-700 text-white focus-visible:ring-slate-200' : (variants[theme] || variants.Primary)

    return <button {...props} type={type} className={`${base} ${variant} ${styled}`} onClick={click} disabled={disabled || loading} aria-busy={loading || undefined}>
        {loading && <Spinner />}
        {loading ? 'Procesando…' : children}
    </button>
}
