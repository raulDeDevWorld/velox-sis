'use client'

import { useState } from 'react'

function normalizeText(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function getCellValue(cell) {
    const controls = cell.querySelectorAll('input, textarea, select')
    if (controls.length > 0) {
        return Array.from(controls).map(control => normalizeText(control.value || control.getAttribute('placeholder'))).filter(Boolean).join(' | ')
    }

    return normalizeText(cell.innerText || cell.textContent)
}

function getTableData(table) {
    return Array.from(table.querySelectorAll('tr')).map(row =>
        Array.from(row.children)
            .filter(cell => cell.matches('th,td'))
            .map(getCellValue)
    ).filter(row => row.some(Boolean))
}

export default function ExportExcelButton({ tableId, filename = 'export', sheetName = 'Datos', styled = '' }) {
    const [loading, setLoading] = useState(false)

    async function exportTable() {
        const table = document.getElementById(tableId)
        if (!table) return

        const rows = getTableData(table)
        if (!rows.length) return

        setLoading(true)
        try {
            const ExcelJS = await import('exceljs')
            const workbook = new ExcelJS.Workbook()
            const worksheet = workbook.addWorksheet(sheetName.slice(0, 31))

            rows.forEach(row => worksheet.addRow(row))

            worksheet.getRow(1).eachCell(cell => {
                cell.font = { bold: true, color: { argb: 'FF334155' } }
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
                cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } }
                cell.alignment = { vertical: 'middle', wrapText: true }
            })

            worksheet.eachRow((row, rowNumber) => {
                row.height = rowNumber === 1 ? 24 : 22
                row.eachCell(cell => {
                    cell.alignment = { vertical: 'middle', wrapText: true }
                    cell.border = { bottom: { style: 'thin', color: { argb: 'FFF1F5F9' } } }
                })
            })

            worksheet.columns.forEach(column => {
                const maxLength = column.values.reduce((max, value) => Math.max(max, normalizeText(value).length), 10)
                column.width = Math.min(Math.max(maxLength + 2, 12), 42)
            })

            worksheet.views = [{ state: 'frozen', ySplit: 1 }]

            const buffer = await workbook.xlsx.writeBuffer()
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
            const url = URL.createObjectURL(blob)
            const anchor = document.createElement('a')
            anchor.href = url
            anchor.download = `${filename}.xlsx`
            document.body.appendChild(anchor)
            anchor.click()
            anchor.remove()
            URL.revokeObjectURL(url)
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            type="button"
            onClick={exportTable}
            disabled={loading}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 ${styled}`}
        >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 3v11m0 0 4-4m-4 4-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 15v3a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            {loading ? 'Exportando...' : 'Exportar Excel'}
        </button>
    )
}
