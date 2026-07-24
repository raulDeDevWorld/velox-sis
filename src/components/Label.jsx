'use client'

export default function Label({ styled = '', children, htmlFor, required = false }) {
    return <label htmlFor={htmlFor} className={`ui-label ${styled}`}>
        <span>{children}</span>{required && <span className="text-rose-500" aria-hidden="true">*</span>}
    </label>
}
