'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export default function Select({ arr, name, click, defaultValue, uuid, disabled = false }) {
    const options = Array.isArray(arr) ? arr.filter((option) => option !== undefined && option !== null) : []
    const initialValue = defaultValue ?? options[0] ?? ''
    const [value, setValue] = useState(initialValue)
    const [open, setOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState(0)
    const [position, setPosition] = useState(null)
    const buttonRef = useRef(null)
    const menuRef = useRef(null)
    const listId = useId()
    const isDisabled = disabled || !options.length

    useEffect(() => setValue(initialValue), [initialValue])

    useEffect(() => {
        if (!open) return
        const close = (event) => {
            if (!buttonRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false)
        }
        const reposition = () => setOpen(false)
        document.addEventListener('pointerdown', close)
        window.addEventListener('resize', reposition)
        window.addEventListener('scroll', reposition, true)
        return () => {
            document.removeEventListener('pointerdown', close)
            window.removeEventListener('resize', reposition)
            window.removeEventListener('scroll', reposition, true)
        }
    }, [open])

    const openMenu = () => {
        if (isDisabled) return
        const rect = buttonRef.current.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom
        const menuHeight = Math.min(options.length * 44 + 16, 248)
        setPosition({ left: rect.left, width: rect.width, top: spaceBelow >= menuHeight + 8 ? rect.bottom + 6 : Math.max(8, rect.top - menuHeight - 6) })
        setActiveIndex(Math.max(0, options.findIndex((option) => String(option) === String(value))))
        setOpen(true)
    }

    const selectOption = (option) => {
        setValue(option)
        setOpen(false)
        click?.(name, option, uuid)
        buttonRef.current?.focus()
    }

    const handleKeyDown = (event) => {
        if (isDisabled) return
        if (!open && ['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault(); openMenu(); return
        }
        if (!open) return
        if (event.key === 'Escape') { event.preventDefault(); setOpen(false); return }
        if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((index) => Math.min(options.length - 1, index + 1)); return }
        if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((index) => Math.max(0, index - 1)); return }
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectOption(options[activeIndex]) }
    }

    const menu = open && position && <div ref={menuRef} id={listId} role="listbox" aria-label={name || 'Opciones'} className="fixed z-[9999] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_20px_55px_-18px_rgba(15,23,42,0.35)] animate-[selectIn_.14s_ease-out]" style={position}>
        <div className="max-h-[232px] overflow-y-auto overscroll-contain py-0.5">
            {options.map((option, index) => {
                const selected = String(option) === String(value)
                const active = index === activeIndex
                return <button key={`${String(option)}-${index}`} type="button" role="option" aria-selected={selected} onMouseEnter={() => setActiveIndex(index)} onClick={() => selectOption(option)} className={`flex min-h-10 w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${active ? 'bg-slate-100 text-slate-950' : 'text-slate-600 hover:bg-slate-50'} ${selected ? 'font-semibold' : 'font-medium'}`}>
                    <span>{option}</span>
                    {selected && <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-cyan-600" aria-hidden="true"><path d="m4 10 3.5 3.5L16 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </button>
            })}
        </div>
    </div>

    return <div className="relative w-full">
        <button ref={buttonRef} type="button" disabled={isDisabled} onClick={() => open ? setOpen(false) : openMenu()} onKeyDown={handleKeyDown} className={`ui-select flex items-center text-left ${open ? 'border-cyan-400 bg-white ring-4 ring-cyan-100' : ''}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined}>
            <span className="min-w-0 flex-1 truncate">{value || 'Sin opciones disponibles'}</span>
            <svg className={`ml-2 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        {typeof document !== 'undefined' && createPortal(menu, document.body)}
    </div>
}
