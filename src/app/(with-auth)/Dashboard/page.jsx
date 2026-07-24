'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useUser } from '@/context'
import ExportExcelButton from '@/components/ExportExcelButton'
import { ordersRepository } from '@/features'
import { assignedBranchId, canViewAllBranchReports } from '@/utils/roleAccess'

const values = (data) => data && typeof data === 'object' ? Object.values(data) : []
const amount = (value) => Number.isFinite(Number(value)) ? Number(value) : 0
const money = (value) => new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(amount(value))
const padDate = (value) => String(value).padStart(2, '0')
const dateInputValue = (date) => `${date.getFullYear()}-${padDate(date.getMonth() + 1)}-${padDate(date.getDate())}`
const todayValue = () => dateInputValue(new Date())

const flattenTasks = (data) => Object.entries(data || {}).flatMap(([branchId, group]) => {
    if (!group || typeof group !== 'object') return []
    if (group.uuid || group.estado) return [{ ...group, _branchId: group['sucursal uuid'] || branchId }]
    return values(group).map((task) => ({ ...task, _branchId: task?.['sucursal uuid'] || branchId }))
})

const parseDate = (value) => {
    if (!value) return null
    if (Number.isFinite(Number(value))) {
        const date = new Date(Number(value))
        return Number.isNaN(date.getTime()) ? null : date
    }
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
}

const startOfDay = (dateValue) => {
    if (!dateValue) return null
    const date = new Date(`${dateValue}T00:00:00`)
    return Number.isNaN(date.getTime()) ? null : date
}

const endOfDay = (dateValue) => {
    if (!dateValue) return null
    const date = new Date(`${dateValue}T23:59:59.999`)
    return Number.isNaN(date.getTime()) ? null : date
}

const isDateInRange = (value, dateFrom, dateTo) => {
    const date = parseDate(value)
    if (!date) return false
    const from = startOfDay(dateFrom)
    const to = endOfDay(dateTo)
    if (from && date < from) return false
    if (to && date > to) return false
    return true
}

const taskCreatedInRange = (task, dateFrom, dateTo) => isDateInRange(task?.fecha || task?.date, dateFrom, dateTo)

const paymentLabel = (value) => {
    const normalized = String(value || '').trim().toLowerCase()
    if (normalized === 'qr') return 'QR'
    if (normalized === 'efectivo') return 'Efectivo'
    return 'Otro'
}

const emptyMoneySummary = () => ({ Efectivo: 0, QR: 0, Otro: 0 })

const paymentMovementsFromOrder = (task) => {
    const createdAt = task.fecha || task.date
    const deliveredAt = task.delivered_at || task['fecha entrega']
    const receptionAmount = amount(task.reception_payment_amount)
    const deliveryAmount = amount(task.delivery_payment_amount)
    const movements = []

    if (receptionAmount > 0) {
        movements.push({
            branchId: task._branchId,
            orderId: task.uuid,
            orderCode: task.code,
            stage: 'Recepción',
            method: paymentLabel(task.reception_payment_method || task['metodo pago recepcion'] || task.payment_method),
            amount: receptionAmount,
            paidAt: task.reception_paid_at || createdAt
        })
    }

    if (deliveryAmount > 0) {
        movements.push({
            branchId: task._branchId,
            orderId: task.uuid,
            orderCode: task.code,
            stage: 'Entrega',
            method: paymentLabel(task.delivery_payment_method || task['metodo pago entrega']),
            amount: deliveryAmount,
            paidAt: task.delivery_paid_at || deliveredAt
        })
    }

    return movements
}

const summarizeByMethod = (movements) => movements.reduce((acc, movement) => {
    acc[movement.method] = amount(acc[movement.method]) + amount(movement.amount)
    return acc
}, emptyMoneySummary())

function MetricCard({ label, value, tone }) {
    const tones = {
        cyan: 'from-cyan-500 to-sky-500',
        blue: 'from-blue-500 to-indigo-500',
        violet: 'from-violet-500 to-purple-500',
        emerald: 'from-emerald-500 to-teal-500',
        amber: 'from-amber-400 to-orange-500'
    }

    return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_35px_-24px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5 hover:shadow-lg">
        <div className={`mb-5 h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} shadow-lg`} />
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
    </article>
}

export default function Dashboard() {
    const { userDB, sucursales, tareas, setTareas } = useUser()
    const [selectedBranch, setSelectedBranch] = useState('all')
    const [dateFrom, setDateFrom] = useState(todayValue)
    const [dateTo, setDateTo] = useState(todayValue)
    const canViewAllBranches = canViewAllBranchReports(userDB?.rol || userDB?.role)
    const userBranchId = assignedBranchId(userDB)

    useEffect(() => {
        if (!canViewAllBranches) {
            if (!userBranchId) {
                setTareas({})
                return undefined
            }
            return ordersRepository.subscribeByBranch(userBranchId, setTareas)
        }
        return ordersRepository.subscribeAll(setTareas)
    }, [canViewAllBranches, setTareas, userBranchId])

    const branchList = values(sucursales)
    const visibleBranchList = canViewAllBranches
        ? branchList
        : branchList.filter((branch) => branch.uuid === userBranchId)
    const allTasks = flattenTasks(tareas)
    const authorizedTasks = canViewAllBranches
        ? allTasks
        : allTasks.filter((task) => task._branchId === userBranchId)
    const effectiveBranch = canViewAllBranches ? selectedBranch : userBranchId
    const scopedTasks = effectiveBranch === 'all'
        ? authorizedTasks
        : authorizedTasks.filter((task) => task._branchId === effectiveBranch)
    const operationalTasks = scopedTasks.filter((task) => taskCreatedInRange(task, dateFrom, dateTo))
    const pending = operationalTasks.filter((task) => task.estado !== 'Entregado')
    const delivered = operationalTasks.filter((task) => task.estado === 'Entregado')
    const pendingBalance = scopedTasks.reduce((total, task) => total + amount(task.saldo), 0)
    const totalBilled = operationalTasks.reduce((total, task) => total + amount(task.total), 0)
    const scopeName = effectiveBranch === 'all' ? 'Todas las sucursales' : branchList.find((branch) => branch.uuid === effectiveBranch)?.nombre || 'Sucursal'
    const dateScope = `${dateFrom || 'Inicio'} - ${dateTo || dateInputValue(new Date())}`

    const financialMovements = useMemo(() => {
        return scopedTasks
            .flatMap(paymentMovementsFromOrder)
            .filter((movement) => isDateInRange(movement.paidAt, dateFrom, dateTo))
    }, [scopedTasks, dateFrom, dateTo])

    const methodSummary = summarizeByMethod(financialMovements)
    const totalCollected = financialMovements.reduce((total, movement) => total + amount(movement.amount), 0)
    const closeDate = endOfDay(dateTo || dateFrom || todayValue())
    const balanceAtClose = scopedTasks
        .filter((task) => {
            const createdAt = parseDate(task.fecha || task.date)
            return amount(task.saldo) > 0 && (!closeDate || !createdAt || createdAt <= closeDate)
        })
        .reduce((total, task) => total + amount(task.saldo), 0)

    const branchRows = visibleBranchList.map((branch) => {
        const branchScopedTasks = authorizedTasks.filter((task) => task._branchId === branch.uuid)
        const branchOperationalTasks = branchScopedTasks.filter((task) => taskCreatedInRange(task, dateFrom, dateTo))
        const branchMovements = branchScopedTasks
            .flatMap(paymentMovementsFromOrder)
            .filter((movement) => isDateInRange(movement.paidAt, dateFrom, dateTo))
        const branchMethods = summarizeByMethod(branchMovements)
        const branchBalance = branchScopedTasks
            .filter((task) => {
                const createdAt = parseDate(task.fecha || task.date)
                return amount(task.saldo) > 0 && (!closeDate || !createdAt || createdAt <= closeDate)
            })
            .reduce((total, task) => total + amount(task.saldo), 0)

        return {
            ...branch,
            totalOrders: branchOperationalTasks.length,
            pendingOrders: branchOperationalTasks.filter((task) => task.estado !== 'Entregado').length,
            deliveredOrders: branchOperationalTasks.filter((task) => task.estado === 'Entregado').length,
            collected: branchMovements.reduce((total, movement) => total + amount(movement.amount), 0),
            cash: branchMethods.Efectivo,
            qr: branchMethods.QR,
            other: branchMethods.Otro,
            balance: branchBalance
        }
    })

    function clearDateRange() {
        const today = todayValue()
        setDateFrom(today)
        setDateTo(today)
    }

    return <section className="min-h-screen bg-slate-50 px-4 pb-10 pt-[94px] sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
            <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Bienvenido, {userDB?.nombre || 'bienvenido'}</h1>
                </div>
                <Link href="/Pendientes" className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800">Ver pendientes</Link>
            </header>

            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className=" flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="block h-full">
                        <p className=" text-lg font-bold text-slate-500">FILTRADOR DE REPORTE</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,260px)_160px_160px_auto] lg:items-end">
                        <label className="block">
                            <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Vista</span>
                            <select
                                value={effectiveBranch}
                                disabled={!canViewAllBranches}
                                onChange={(event) => setSelectedBranch(event.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:text-slate-500"
                            >
                                {canViewAllBranches && <option value="all">Reporte general</option>}
                                {visibleBranchList.map((branch) => <option key={branch.uuid} value={branch.uuid}>{branch.nombre}</option>)}
                                {!canViewAllBranches && !userBranchId && <option value="">Sin sucursal asignada</option>}
                            </select>
                        </label>

                        <label className="block">
                            <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Desde</span>
                            <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" />
                        </label>

                        <label className="block">
                            <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Hasta</span>
                            <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" />
                        </label>

                        <button type="button" onClick={clearDateRange} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
                            Hoy
                        </button>
                    </div>
                </div>

            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Recaudado" value={money(totalCollected)} tone="emerald" />
                <MetricCard label="Efectivo" value={money(methodSummary.Efectivo)} tone="amber" />
                <MetricCard label="QR" value={money(methodSummary.QR)} tone="cyan" />
                <MetricCard label="Saldo a cobrar" value={money(balanceAtClose)} tone="blue" />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Órdenes" value={operationalTasks.length} tone="cyan" />
                <MetricCard label="Pendientes" value={pending.length} tone="violet" />
                <MetricCard label="Entregadas" value={delivered.length} tone="emerald" />
                <MetricCard label="Facturado" value={money(totalBilled)} tone="blue" />
            </div>

            <div className="mt-6">
                <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Estado de órdenes</h2>
                        </div>
                        <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">{operationalTasks.length} total</span>
                    </div>
                    <div className="space-y-5">
                        {[
                            ['Pendientes', pending.length, 'bg-violet-500'],
                            ['Entregadas', delivered.length, 'bg-emerald-500']
                        ].map(([label, count, color]) => {
                            const percentage = operationalTasks.length ? Math.round((count / operationalTasks.length) * 100) : 0
                            return <div key={label}>
                                <div className="mb-2 flex justify-between text-sm">
                                    <span className="font-medium text-slate-600">{label}</span>
                                    <span className="font-bold text-slate-900">{count} · {percentage}%</span>
                                </div>
                                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                                    <div className={`h-full rounded-full ${color}`} style={{ width: `${percentage}%` }} />
                                </div>
                            </div>
                        })}
                    </div>
                </article>

            </div>

            <article className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Cierre por sucursal</h2>
                    </div>
                    <ExportExcelButton tableId="dashboard-sucursales-table" filename="dashboard-cierre-sucursales" sheetName="Cierre" />
                </div>
                <div className="overflow-x-auto">
                    <table id="dashboard-sucursales-table" className="admin-table w-full min-w-[1100px]">
                        <thead>
                            <tr>
                                <th>Sucursal</th>
                                <th className="text-center">Órdenes</th>
                                <th className="text-center">Pendientes</th>
                                <th className="text-center">Entregadas</th>
                                <th className="text-right">Recaudado</th>
                                <th className="text-right">Efectivo</th>
                                <th className="text-right">QR</th>
                                <th className="text-right">Otro</th>
                                <th className="text-right">Saldo a cobrar</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {branchRows.map((branch) => <tr key={branch.uuid}>
                                <td>
                                    <p className="font-semibold text-slate-900">{branch.nombre}</p>
                                    <p className="text-xs text-slate-400">{branch.direccion || 'Sin dirección registrada'}</p>
                                </td>
                                <td className="text-center font-semibold">{branch.totalOrders}</td>
                                <td className="text-center"><span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">{branch.pendingOrders}</span></td>
                                <td className="text-center"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{branch.deliveredOrders}</span></td>
                                <td className="text-right font-semibold text-slate-900">{money(branch.collected)}</td>
                                <td className="text-right">{money(branch.cash)}</td>
                                <td className="text-right">{money(branch.qr)}</td>
                                <td className="text-right">{money(branch.other)}</td>
                                <td className="text-right font-semibold text-slate-900">{money(branch.balance)}</td>
                                <td className="text-right">{canViewAllBranches && <button type="button" onClick={() => setSelectedBranch(branch.uuid)} className="rounded-lg px-3 py-2 text-xs font-bold text-cyan-700 hover:bg-cyan-50">Ver reporte</button>}</td>
                            </tr>)}
                            {!branchRows.length && <tr><td colSpan="10" className="py-10 text-center text-slate-400">No hay sucursales registradas.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </article>
        </div>
    </section>
}
