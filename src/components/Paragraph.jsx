'use client';

export default function Button({ styled, children }) {
    return (
        <p className={`block mb-2 text-[16px] text-left font-light text-gray-900 ${styled}`}>{children}</p>
    )
}         