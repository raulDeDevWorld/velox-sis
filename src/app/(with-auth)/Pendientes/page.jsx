'use client'

import Button from '@/components/Button'
import Modal from '@/components/Modal'
import Select from '@/components/Select'
import { useUser } from '@/context/'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'
import ExportExcelButton from '@/components/ExportExcelButton'
import { useEffect, useState, useRef } from 'react'
import { estado } from '@/constants'
import { getDayMonthYearHour } from '@/utils/getDate'
import { branchesRepository, ordersRepository } from '@/features'
import { assignedBranchId, normalizeRole } from '@/utils/roleAccess'
import dynamic from "next/dynamic";

const DeliveryReceiptPDF = dynamic(() => import("@/components/pdf"), {
    ssr: false,
});
const ReceptionReceiptPDF = dynamic(() => import("@/components/pdfDoc"), {
    ssr: false,
});
const editableAreaClass = 'block min-h-10 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100'
const filterChipClass = active => `inline-flex h-9 shrink-0 items-center justify-center rounded-full border px-3.5 text-xs font-semibold transition ${active ? 'border-slate-900 bg-slate-900 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950'}`
const statusBadgeClass = status => `inline-flex min-w-[110px] items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold ${
    status === 'Entregado' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' :
    status === 'Concluido' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-100' :
    'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
}`

const getReceiptOrder = (order, sucursales) => {
    const branch = sucursales?.[order?.['sucursal uuid']]
    return {
        ...order,
        direccionSucursal: order?.direccionSucursal || branch?.direccion || branch?.Direccion || ''
    }
}

const receiptButtonClass = 'min-h-9 h-9 w-full justify-center rounded-lg border-cyan-600 bg-cyan-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:border-cyan-500 hover:bg-cyan-500 focus-visible:ring-cyan-100'
const receiptDisabledClass = 'min-h-9 h-9 w-full justify-center rounded-lg border-slate-300 bg-slate-200 px-3 py-2 text-xs font-bold text-slate-500 shadow-none'
const dateDisplayFormatter = new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
})

const formatTableDate = (value) => {
    if (!value) return 'Sin fecha'

    const raw = String(value).trim()
    const parsed = new Date(raw)
    if (!Number.isNaN(parsed.getTime())) return dateDisplayFormatter.format(parsed).replace(',', '')

    const match = raw.match(/^(\d{1,2}):(\d{2})\s*(am|pm)\s*(\d{1,2})-([A-Za-zÁÉÍÓÚáéíóúñÑ]{3})-(\d{4})$/i)
    if (!match) return raw

    const [, hourText, minute, period, day, monthText, year] = match
    const monthMap = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11 }
    const month = monthMap[monthText.toLowerCase()]
    if (month === undefined) return raw

    let hour = Number(hourText)
    const normalizedPeriod = period.toLowerCase()
    if (normalizedPeriod === 'pm' && hour < 12) hour += 12
    if (normalizedPeriod === 'am' && hour === 12) hour = 0

    const date = new Date(Number(year), month, Number(day), hour, Number(minute))
    return Number.isNaN(date.getTime()) ? raw : dateDisplayFormatter.format(date).replace(',', '')
}

const formatPickupDate = (dateValue, timeValue) => {
    if (!dateValue) return 'Sin fecha'
    const normalizedDate = String(dateValue).includes('-') ? String(dateValue) : ''
    const normalizedTime = timeValue || '00:00'
    const parsed = normalizedDate ? new Date(`${normalizedDate}T${normalizedTime}`) : null
    if (parsed && !Number.isNaN(parsed.getTime())) return dateDisplayFormatter.format(parsed).replace(',', '')
    return `${dateValue}${timeValue ? ` ${timeValue}` : ''}`
}

const toAmount = value => {
    const amount = Number(String(value ?? 0).replace(',', '.'))
    return Number.isFinite(amount) ? amount : 0
}

const whatsappUrl = (value) => {
    const digits = String(value || '').replace(/\D/g, '')
    if (!digits) return null
    const phone = digits.length === 8 ? `591${digits}` : digits
    return `https://api.whatsapp.com/send?phone=${phone}`
}

function WhatsAppLink({ value }) {
    const url = whatsappUrl(value)
    if (!url) return <span className="text-slate-400">Sin WhatsApp</span>

    return <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-9 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800"
        title="Abrir chat de WhatsApp"
    >
        {value}
    </a>
}

function ClientOrdersView({ orders, pagination, filter, setFilter, entrega, setEntrega, sucursales }) {
    return <div className="mx-auto w-full max-w-6xl px-3 pb-20 sm:px-5">
        <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight text-slate-950">Mis órdenes</h1>
                <p className="text-sm text-slate-500">Consulta el avance y los comprobantes de tus servicios.</p>
            </div>
            <div className="mt-5">
                <input value={filter} type="search" className="admin-search max-w-none" onChange={event => setFilter(event.target.value)} placeholder="Buscar por número de orden" />
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                <button type="button" className={filterChipClass(entrega === '')} onClick={() => setEntrega('')}>Todas</button>
                {['Pendiente', 'Concluido', 'Entregado'].map(status => (
                    <button type="button" key={status} className={filterChipClass(entrega === status)} onClick={() => setEntrega(entrega === status ? '' : status)}>{status}</button>
                ))}
            </div>
        </section>

        {orders.length === 0
            ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                <p className="text-base font-semibold text-slate-800">No encontramos órdenes</p>
                <p className="mt-1 text-sm text-slate-500">Prueba cambiando los filtros de búsqueda.</p>
            </div>
            : <div className="grid gap-4 lg:grid-cols-2">
                {pagination.pageItems.map(order => <article key={order.uuid} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Orden</p>
                            <h2 className="mt-1 text-xl font-bold text-slate-950">{order.code}</h2>
                            <p className="mt-1 text-xs text-slate-500">{order.sucursal || 'Sucursal no especificada'} · {formatTableDate(order.fecha)}</p>
                        </div>
                        <span className={statusBadgeClass(order.estado)}>{order.estado}</span>
                    </header>

                    <div className="p-5">
                        <div className="space-y-2">
                            {Object.values(order.servicios || {}).map((service, index) => <div key={`${service.uuid || service['nombre 1']}-${index}`} className="flex items-start justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                                <div className="min-w-0">
                                    <p className="font-semibold text-slate-800">{service['nombre 1'] || service.nombre}</p>
                                    {service.observacion && <p className="mt-0.5 text-xs text-slate-500">{service.observacion}</p>}
                                </div>
                                <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">× {service.cantidad}</span>
                            </div>)}
                        </div>

                        <dl className="mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-slate-100 p-3 text-center">
                            <div><dt className="text-[11px] font-semibold uppercase text-slate-400">Total</dt><dd className="mt-1 font-bold text-slate-900">Bs {order.total}</dd></div>
                            <div><dt className="text-[11px] font-semibold uppercase text-slate-400">Pagado</dt><dd className="mt-1 font-bold text-emerald-700">Bs {order.ac || 0}</dd></div>
                            <div><dt className="text-[11px] font-semibold uppercase text-slate-400">Saldo</dt><dd className="mt-1 font-bold text-amber-700">Bs {order.saldo || 0}</dd></div>
                        </dl>

                        <div className="mt-4 rounded-2xl bg-cyan-50 px-4 py-3 text-sm text-cyan-950">
                            <span className="font-semibold">Entrega estimada:</span> {order['fecha entrega'] ? formatTableDate(order['fecha entrega']) : formatPickupDate(order['fecha para recojo'], order['hora para recojo'])}
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 [&>div]:min-w-0 [&_a]:block [&_a]:w-full">
                            <ReceptionReceiptPDF i={getReceiptOrder(order, sucursales)} title="Descargar comprobante de recepción" buttonStyled={receiptButtonClass} label="Recepción" />
                            {order.estado === 'Entregado'
                                ? <DeliveryReceiptPDF i={order} title="Descargar comprobante de entrega" buttonStyled={receiptButtonClass} label="Entrega" />
                                : <Button theme="Disable" styled={receiptDisabledClass} title="Disponible al entregar la orden">Entrega</Button>}
                        </div>
                    </div>
                </article>)}
            </div>}

        <Pagination {...pagination} />
    </div>
}

function Home() {
    const { user, setUserProfile, setUserUuid, userDB, msg, setMsg, modal, item, setModal, temporal, setTemporal, distributorPDB, setUserDistributorPDB, setUserItem, setUserData, setUserSuccess, sucursales, setSucursales, pendientes, setPendientes, setTareas, tareas } = useUser()

    const [state, setState] = useState({})
    const [entrega, setEntrega] = useState('')
    const [tag, setTag] = useState('')
    const [filter, setFilter] = useState('')
    const [filterDate, setFilterDate] = useState('')
    const refFirst = useRef(null);
    const userRole = userDB?.rol || userDB?.role
    const normalizedUserRole = normalizeRole(userRole)
    const isCustomer = normalizedUserRole === 'cliente'
    const isAdmin = normalizedUserRole === 'admin'
    const userBranchId = assignedBranchId(userDB)
    const paymentPlaceholder = 'Seleccionar'
    const paymentMethods = [paymentPlaceholder, 'Efectivo', 'QR']
    const isValidDeliveryPaymentMethod = (value) => paymentMethods.includes(value) && value !== paymentPlaceholder

    function onChangeHandler(e, i) {
        setState({ ...state, [i.uuid]: { ...state[i.uuid], [e.target.name]: e.target.value } })
    }
    function onChangeHandlerFilter(e, i) {
        setFilter(e.target.value)
    }
    function onChangeHandlerFilterMonth(e, i) {
        setFilterDate(e.target.value)
    }
    function onChangeHandlerCalc(e, i) {
        const deliveryAmount = toAmount(e.target.value)
        setState({
            ...state,
            [i.uuid]: {
                ...state[i.uuid],
                delivery_payment_amount: deliveryAmount,
                ac: toAmount(i.ac) + deliveryAmount,
                saldo: Math.max(0, toAmount(i.saldo) - deliveryAmount)
            }
        })
    }
    const onClickHandlerSelect = (name, value, uuid) => {
        setState({ ...state, [uuid]: { ...state[uuid], [name]: value } })
    }

    function entregar(i) {
        const deliveryPaymentMethod = state[i.uuid]?.['metodo pago entrega'] || i['metodo pago entrega']
        const deliveryPaymentAmount = toAmount(state[i.uuid]?.delivery_payment_amount ?? i.delivery_payment_amount)
        const pendingBalance = toAmount(i.saldo)

        if (pendingBalance > 0 && deliveryPaymentAmount !== pendingBalance) {
            setModal('Delivery Payment Amount Required')
            return
        }

        if (deliveryPaymentAmount > 0 && !isValidDeliveryPaymentMethod(deliveryPaymentMethod)) {
            setModal('Delivery Payment Required')
            return
        }

        const data = {
            ['nombre receptor']: i['nombre'],
            ['CI receptor']: i['CI'],
            ['whatsapp receptor']: i['whatsapp'],
            ...state[i.uuid],
            ['metodo pago entrega']: deliveryPaymentAmount > 0 ? deliveryPaymentMethod : null,
            delivery_payment_amount: deliveryPaymentAmount,
            delivery_payment_method: deliveryPaymentAmount > 0 ? deliveryPaymentMethod : null,
            delivery_paid_at: deliveryPaymentAmount > 0 ? new Date().toISOString() : null,
            estado: 'Entregado',
            ['fecha entrega']: getDayMonthYearHour()
        }
        function callback () {
           const obj = { ...state }
        delete obj[i.uuid]
        setState(obj)
        ordersRepository.getAll(setTareas) 
        }
        ordersRepository.save(i['sucursal uuid'], i.uuid, data, callback)
        
    }

    function save(i) {
        const currentChanges = state[i.uuid] || {}
        const deliveryPaymentAmount = toAmount(currentChanges.delivery_payment_amount ?? i.delivery_payment_amount)
        if (deliveryPaymentAmount > 0 && 'metodo pago entrega' in currentChanges && !isValidDeliveryPaymentMethod(currentChanges['metodo pago entrega'])) {
            setModal('Delivery Payment Required')
            return
        }
        if (deliveryPaymentAmount <= 0 && 'metodo pago entrega' in currentChanges) {
            delete currentChanges['metodo pago entrega']
            currentChanges.delivery_payment_method = null
        }
        ordersRepository.save(i['sucursal uuid'], i.uuid, state[i.uuid])
        const obj = { ...state }
        delete obj[i.uuid]
        setState(obj)
        ordersRepository.getAll(setTareas)
    }
    function deletConfirm() {
        const callback = () => {
            ordersRepository.getAll(setTareas)
            setModal('')
        }
        ordersRepository.remove(item['sucursal uuid'], item.uuid, callback)
    }
    function delet(i) {
        setUserItem(i)
        setModal('Delete')
    }
    function sortArray(x, y) {
        if (x['nombre'].toLowerCase() < y['nombre'].toLowerCase()) { return -1 }
        if (x['nombre'].toLowerCase() > y['nombre'].toLowerCase()) { return 1 }
        return 0
    }
    useEffect(() => {
        const cleanups = [
            branchesRepository.subscribeAll(setSucursales),
            normalizedUserRole === 'personal' && userBranchId
                ? ordersRepository.subscribeByBranch(userBranchId, setTareas)
                : ordersRepository.subscribeAll(setTareas)
        ]
        return () => cleanups.forEach(cleanup => cleanup?.())
    }, [normalizedUserRole, setSucursales, setTareas, userBranchId])
    const allTasks = tareas
        ? Object.values(Object.values(tareas).reduce((acc, group) => ({ ...acc, ...group }), {}))
        : []
    const filteredTasks = allTasks.filter(i =>
        i.sucursal?.toLowerCase().includes(tag.toLowerCase()) &&
        i.estado?.toLowerCase().includes(entrega.toLowerCase()) &&
        (i.nombre?.toLowerCase().includes(filter.toLowerCase()) || i.code?.toLowerCase().includes(filter.toLowerCase())) &&
        i.mes?.includes(filterDate)
    )
    const pagination = usePagination(filteredTasks, 10, `${tag}|${entrega}|${filter}|${filterDate}`)

    if (isCustomer) {
        return <ClientOrdersView
            orders={filteredTasks}
            pagination={pagination}
            filter={filter}
            setFilter={setFilter}
            entrega={entrega}
            setEntrega={setEntrega}
            sucursales={sucursales}
        />
    }

    return (

        <div className='h-full'>

            <div className="admin-panel w-full" ref={refFirst}>
                {modal === 'Delete' && <Modal funcion={deletConfirm}>Estas seguro de eliminar al siguiente usuario {msg}</Modal>}
                {modal === 'Delivery Payment Required' && <Modal funcion={() => setModal('')} alert={true}>Selecciona el método de pago de entrega antes de guardar.</Modal>}
                {modal === 'Delivery Payment Amount Required' && <Modal funcion={() => setModal('')} alert={true}>Para entregar la orden debes registrar el saldo pendiente exacto como pago de entrega.</Modal>}
                <div className="sticky left-0 z-30 mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <h3 className='admin-title'>Pendientes</h3>
                            <p className="mt-1 text-sm text-slate-500">{filteredTasks.length} órdenes encontradas</p>
                        </div>
                        <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:min-w-[640px] lg:grid-cols-[1fr_1fr_auto]">
                            <input type="text" className='admin-search max-w-none' onChange={onChangeHandlerFilter} placeholder='Buscar por nombre o codigo' />
                            <input type="month" className='admin-search max-w-none' onChange={onChangeHandlerFilterMonth} aria-label='Filtrar por mes' />
                            <ExportExcelButton tableId="pendientes-table" filename="pendientes" sheetName="Pendientes" />
                        </div>
                </div>
                <div className='mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]'>
                    <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Sucursal</p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            <button type="button" className={filterChipClass(tag === '')} onClick={() => setTag('')}>Todas</button>
                            {sucursales && sucursales !== undefined && Object.values(sucursales).map(i => (
                                <button type="button" key={i.uuid} className={filterChipClass(tag === i.nombre)} onClick={() => setTag(tag === i.nombre ? '' : i.nombre)}>{i.nombre}</button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {['Pendiente', 'Concluido', 'Entregado'].map(status => (
                                <button type="button" key={status} className={filterChipClass(entrega === status)} onClick={() => setEntrega(entrega === status ? '' : status)}>{status}</button>
                            ))}
                        </div>
                    </div>
                </div>
                </div>
                <div className="w-max min-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <table id="pendientes-table" className="admin-table min-w-[2500px] bg-white">
                    <thead>
                        <tr>
                            <th scope="col" className="px-3 py-3">
                                #
                            </th>
                            <th scope="col" className="px-3 py-3">
                                Code
                            </th>
                            <th scope="col" className="px-3 py-3">
                                Nombre <br />
                                CI
                            </th>
                            {/* <th scope="col" className="px-3 py-3">
                                CI
                            </th>*/}
                            <th scope="col" className="px-3 py-3">
                                Dirección
                            </th>
                            <th scope="col" className="px-3 py-3">
                                Whatsapp
                            </th>
                            <th scope="col" className="px-3 py-3">
                                Servicios
                            </th>


                            <th scope="col" className="px-3 py-3">
                                A cuenta
                            </th>
                            <th scope="col" className="px-3 py-3">
                                Saldo
                            </th>
                            <th scope="col" className="px-3 py-3">
                                Fecha De Recepción
                            </th>
                            <th scope="col" className="px-3 py-3">
                                Receptor
                            </th>
                            <th scope="col" className="px-3 py-3">
                                CI Receptor
                            </th>
                            <th scope="col" className="px-3 py-3">
                                Whatsapp
                            </th>
                            <th scope="col" className="px-3 py-3">
                                Observaciones <br /> entrega
                            </th>
                            <th scope="col" className="px-3 py-3">
                                Pago <br /> entrega
                            </th>
                            <th scope="col" className="px-3 py-3">
                                Fecha De Entrega
                            </th>
                            <th scope="col" className="text-center px-3 py-3">
                                Avance
                            </th>
                            <th scope="col" className="text-center px-3 py-3">
                                Comprobantes
                            </th>
                            {!isCustomer && <>
                                <th scope="col" className="text-center px-3 py-3">
                                    Entregar
                                </th>
                                <th scope="col" className="text-center px-3 py-3">
                                    Editar
                                </th>
                                {isAdmin && <th scope="col" className="text-center px-3 py-3">
                                    Eliminar
                                </th>}
                            </>}
                        </tr>
                    </thead>
                    <tbody>
                        {pagination.pageItems.map((i, index) => {
                            return <tr key={i.uuid}>
                                    <td className="w-12 text-slate-500">
                                        <span className='flex h-full items-center justify-center'>{(pagination.page - 1) * pagination.pageSize + index + 1}</span>
                                    </td>
                                    <td className="min-w-[130px]" >
                                        <span className={statusBadgeClass(i.estado)}>{i['code']}</span>
                                    </td>
                                    <td className="min-w-[150px] max-w-[170px]" >
                                        <span className="block truncate font-semibold text-slate-900">{i['nombre']}</span>
                                        <span className="mt-1 block text-xs font-medium text-slate-500">{i['CI']}</span>
                                    </td>
                                    {/* <td className="min-w-[100px] px-3 py-4  text-gray-900 " >
                                        {i['CI']}
                                    </td> */}
                                    <td className="min-w-[190px] max-w-[220px]" >
                                        {/* {i['direccion']} */}
                                        {i['nombre receptor']
                                            ? <span className="block truncate" title={i['direccion']}>{i['direccion']}</span>
                                            : !isCustomer
                                                ? <textarea id="message" rows="1" onChange={(e) => onChangeHandler(e, i)} cols="6" name='direccion' defaultValue={i['direccion']} className={editableAreaClass} placeholder="Escribe aqui..."></textarea>
                                                : i['direccion']
                                        }
                                    </td>
                                    <td className="min-w-[145px]">
                                        <WhatsAppLink value={i['whatsapp']} />
                                    </td>
                                    <td className="min-w-[220px] max-w-[250px]">
                                        <ul className="space-y-1.5">
                                            {Object.values(i.servicios).map((el, index) => <li key={index} className="rounded-lg bg-slate-50 px-2.5 py-2 text-xs text-slate-600">
                                                <span className="font-semibold text-slate-800">{el['nombre 1']}</span>
                                                <span className="ml-1 text-slate-500">({el['cantidad']})</span>
                                                {el['observacion'] !== undefined && <span className="mt-1 block text-slate-500">[{el['observacion']}]</span>}
                                            </li>)}
                                        </ul>
                                    </td>
                                    <td className="min-w-[90px] text-center">
                                        {i['nombre receptor']
                                            ? i['ac']
                                            : !isCustomer && <textarea id="message" rows="1" onChange={(e) => onChangeHandlerCalc(e, i)} cols="1" name='ac' className={`${editableAreaClass} text-center`} placeholder={i.ac ? i.ac : 0}></textarea>
                                        }
                                    </td>
                                    <td className="min-w-[90px] text-center font-semibold text-slate-900">
                                        {i['saldo'] - (state[i.uuid] && state[i.uuid].ac && state[i.uuid].ac !== undefined ? state[i.uuid].ac - i.ac : 0)}
                                    </td>
                                    <td className="min-w-[150px] max-w-[170px]" >
                                        {formatTableDate(i['fecha'])}
                                    </td>
                                    <td className="relative min-w-[150px] max-w-[170px]">
                                        {i['nombre receptor']
                                            ? <>
                                                {i['nombre receptor']}
                                                {/* <span className='absolute text-[14px] top-[10px] right-3 text-green-500'>*Entregado</span> */}
                                            </>
                                            : !isCustomer && <>
                                                <textarea id="message" rows="1" onChange={(e) => onChangeHandler(e, i)} cols="6" name='nombre receptor' defaultValue={i['nombre receptor']} className={editableAreaClass} placeholder="Escribe aqui..."></textarea>
                                                {/* <span className='absolute text-[14px] top-[10px] right-3 text-red-500'>*Obligatorio</span> */}
                                            </>}
                                    </td>
                                    <td className="relative min-w-[125px]">
                                        {i['CI receptor']
                                            ? <>
                                                {i['CI receptor']}
                                                {/* <span className='absolute text-[14px] top-[10px] right-3 text-green-500'>*Entregado</span> */}
                                            </>
                                            : !isCustomer && <>
                                                <textarea id="message" rows="1" onChange={(e) => onChangeHandler(e, i)} cols="6" name='CI receptor' defaultValue={i['CI receptor']} className={editableAreaClass} placeholder="Escribe aqui..."></textarea>
                                                {/* <span className='absolute text-[14px] top-[10px] right-3 text-red-500'>*Obligatorio</span> */}
                                            </>}
                                    </td>
                                    <td className="relative min-w-[145px]">
                                        {i['whatsapp receptor']
                                            ? <>
                                                {i['whatsapp receptor']}
                                                {/* <span className='absolute text-[14px] top-[10px] right-3 text-green-500'>*Entregado</span> */}
                                            </>
                                            : !isCustomer && <>
                                                <textarea id="message" rows="1" onChange={(e) => onChangeHandler(e, i)} cols="6" name='whatsapp receptor' className={editableAreaClass} placeholder="Escribe aqui..."></textarea>
                                                {/* <span className='absolute text-[14px] top-[10px] right-3 text-red-500'>*Obligatorio</span> */}
                                            </>}
                                    </td>
                                    <td className="min-w-[180px] max-w-[210px]" >
                                        {i['nombre receptor']
                                            ? <span className="block truncate" title={i['observaciones entrega'] || 'Sin observaciones'}>{i['observaciones entrega'] ? i['observaciones entrega'] : 'Sin observaciones'}</span>
                                            : (!isCustomer
                                                ? <textarea id="message" rows="1" onChange={(e) => onChangeHandler(e, i)} cols="6" name='observaciones entrega' className={editableAreaClass} placeholder="Escribe aqui..."></textarea>
                                                : i['observaciones entrega'] ? i['observaciones entrega'] : 'Sin observaciones')
                                        }
                                    </td>
                                    <td className="min-w-[135px]">
                                        {!isCustomer
                                            ? <Select arr={paymentMethods} name='metodo pago entrega' uuid={i.uuid} defaultValue={state[i.uuid]?.['metodo pago entrega'] || i['metodo pago entrega'] || paymentPlaceholder} click={onClickHandlerSelect} />
                                            : <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                                {i['metodo pago entrega'] || 'Pendiente'}
                                            </span>
                                        }
                                    </td>
                                    <td className="min-w-[160px] max-w-[180px]" >
                                        {i['fecha entrega'] && i['fecha entrega'] !== undefined
                                            ? formatTableDate(i['fecha entrega'])
                                            : formatPickupDate(i['fecha para recojo'], i['hora para recojo'])
                                        }
                                    </td>
                                    <td className="min-w-[135px]">
                                        {!isCustomer && i.estado !== 'Entregado'
                                            ? <Select arr={estado} name='estado' uuid={i.uuid} defaultValue={i.estado ? i.estado : 'Pendiente'} click={onClickHandlerSelect} />
                                            : <div className={statusBadgeClass(i.estado)}>
                                                {i.estado}
                                            </div>}
                                    </td>

                                    <td className="min-w-[220px]">
                                        <div className="grid grid-cols-2 gap-2 [&>div]:!min-w-0 [&>div]:w-full [&_a]:block [&_a]:w-full">
                                            <ReceptionReceiptPDF
                                                i={getReceiptOrder(i, sucursales)}
                                                title="Imprimir comprobante de recepción"
                                                buttonStyled={receiptButtonClass}
                                                label="Recepción"
                                            />
                                            {i['nombre receptor']
                                                ? <DeliveryReceiptPDF
                                                    i={i}
                                                    title="Imprimir comprobante de entrega"
                                                    buttonStyled={receiptButtonClass}
                                                    label="Entrega"
                                                />
                                                : <Button theme={"Disable"} styled={receiptDisabledClass} title="Disponible cuando la orden esté entregada">Entrega</Button>}
                                        </div>
                                    </td>
                                    {!isCustomer && <>
                                        <td className="min-w-[120px]">
                                            {/* {state[i.uuid] && (state[i.uuid]['nombre receptor'] || state[i.uuid]['CI receptor'] || state[i.uuid]['whatsapp receptor'])
                                                ? (state[i.uuid]['nombre receptor'] && state[i.uuid]['CI receptor'] && state[i.uuid]['whatsapp receptor']
                                                    ? <Button theme={"Primary"} click={() => save(i)}>Entregar</Button>
                                                    : <Button theme={"Disable"}>Entregar</Button>)
                                                : <Button theme={"Disable"}>Entregar</Button>
                                            } */}
                                            {
                                                i['nombre receptor']
                                                    ? <Button theme={"Disable"}>Entregar</Button>
                                                    : <Button theme={"Primary"} click={() => entregar(i)}>Entregar</Button>
                                            }
                                        </td>
                                        <td className="min-w-[120px]">
                                            <Button
                                                theme={state[i.uuid] ? 'Primary' : 'Disable'}
                                                disabled={!state[i.uuid]}
                                                click={() => save(i)}
                                            >
                                                Guardar
                                            </Button>
                                        </td>
                                        {isAdmin && <td className="min-w-[120px]">
                                            <Button theme="Danger" click={() => delet(i)}>Eliminar</Button>
                                        </td>}
                                    </>}
                                </tr>
                        })
                        }
                    </tbody>
                </table>
                </div>
                <Pagination {...pagination} />
            </div>
        </div>
    )
}
export default Home



{/* <div className='lg:flex hidden lg:fixed top-[100px] right-[65px] '>
                    <div className='flex justify-center items-center h-[50px] text-white text-[14px] font-normal font-medium bg-[#32CD32] border border-gray-200 rounded-[10px] px-10 cursor-pointer mr-2' onClick={redirect}>Agregar Sucursal</div>
                    <div className='flex justify-center items-center bg-[#0064FA] h-[50px] w-[50px]  rounded-full text-white cursor-pointer' onClick={redirect}> <span className='text-white text-[30px]'>+</span> </div>
                </div> */}

