'use client';

export default function Button({ styled, name, change, check}) {
    return (
        <input
            id={name}
            type="checkbox"
            name={name}
            onChange={change}
            checked={check}
            className="min-w-4 h-4 border border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-blue-300    " 
            />
    )
}