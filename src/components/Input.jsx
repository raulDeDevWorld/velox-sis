'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'

export default function Input({ type = 'text', name, id, onChange, reference, placeholder, require, defValue, valu, ...props }) {
    const [showPassword, setShowPassword] = useState(false)
    const pathname = usePathname()
    const fieldId = id || name
    const showRequirement = !['/Login', '/SignUp', '/Register', '/Restablecer'].includes(pathname)

    return <span className="relative block w-full">
        <input
            {...props}
            type={type === 'password' && showPassword ? 'text' : type}
            name={name}
            id={fieldId}
            className={`ui-input ${type === 'password' ? 'pr-11' : ''}`}
            onChange={onChange}
            ref={reference}
            placeholder={placeholder}
            required={Boolean(require)}
            defaultValue={defValue}
            value={valu}
            aria-required={Boolean(require)}
        />
        {type === 'password' && <button type="button" className="absolute inset-y-0 right-1 flex w-10 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>{!showPassword && <path d="m4 4 16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>}</svg>
        </button>}
        {showRequirement && <span className={`absolute -top-2 left-3 bg-white px-1.5 text-[10px] font-semibold ${require ? 'text-rose-500' : 'text-slate-400'}`}>{require ? 'Requerido' : 'Opcional'}</span>}
    </span>
}
