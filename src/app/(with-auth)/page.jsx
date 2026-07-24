'use client'
import { useUser } from '@/context'
import Button from '@/components/Button'
import Subtitle from '@/components/Subtitle'
import Card from '@/components/Card'
// import QRreader from '@/components/QRreader'
import Tag from '@/components/Tag'
import Msg from '@/components/Msg'
import Modal from '@/components/Modal'
// import QRscanner from '@/components/QRscanner'
import { useRouter } from 'next/navigation';
import { WithAuth } from '@/HOCs/WithAuth'
import { useEffect } from 'react'
// import QrcodeDecoder from 'qrcode-decoder';
import { QRreaderUtils } from '@/utils/QRreader'
import { useState } from 'react'
import Input from '@/components/Input'
import Label from '@/components/Label'
import MiniCard from '@/components/MiniCard'
import { getCurrentHash } from '@/shared'
import { customersRepository, ordersRepository, servicesRepository } from '@/features'
import { useReactPath } from '@/HOCs/useReactPath'
import { useMask } from '@react-input/mask';
import { getDayMonthYearHour, getMonthYear, formatDayMonthYear, formatDayMonthYearInput, getDayMonthYearHourPluss3, isBusinessDateToday } from '@/utils/getDate'
import { generateUUID } from '@/utils/UIDgenerator'
import Link from 'next/link'
import dynamic from "next/dynamic";
import { assignedBranchId, normalizeRole } from '@/utils/roleAccess'
const InvoicePDF = dynamic(() => import("@/components/pdfDoc"), {
    ssr: false,
});

const toAmount = value => {
    const amount = Number(String(value ?? 0).replace(',', '.'))
    return Number.isFinite(amount) ? amount : 0
}

const getServicePrice = (service, prefix, branchId) => {
    const prices = service?.['costos y entregas'] || {}
    const branchPrice = prices[`${prefix} ${branchId}`]
    if (branchPrice !== undefined && branchPrice !== null && branchPrice !== '') return toAmount(branchPrice)
    const fallback = Object.entries(prices).find(([key]) => key.startsWith(prefix))
    return toAmount(fallback?.[1])
}

const calculateCartTotal = cart => Object.values(cart).reduce((total, item) => {
    const quantity = Math.max(0, toAmount(item.cantidad))
    return total + quantity * toAmount(item.costo)
}, 0)

const getErrorMessage = error => {
    if (!error) return 'No se pudo registrar la orden.'
    if (typeof error === 'string') return error
    const technicalMessage = [error.message, error.details, error.hint].filter(Boolean).join(' · ')
    if (technicalMessage.includes('SERVICE_PRICE_CHANGED')) return `El precio de ${error.details || 'uno de los servicios'} cambió. Los precios fueron actualizados; revisa el nuevo total antes de volver a registrar.`
    if (technicalMessage.includes('SERVICE_PRICE_MISSING')) return `El servicio ${error.details || 'seleccionado'} no tiene precio configurado para esta sucursal.`
    if (technicalMessage.includes('SERVICE_NOT_AVAILABLE')) return `El servicio ${error.details || 'seleccionado'} ya no está disponible. Retíralo de la orden para continuar.`
    if (technicalMessage.includes('INVALID_ORDER_ITEM')) return 'Hay un servicio con cantidad inválida. La cantidad debe ser mayor que cero.'
    if (technicalMessage.includes('ORDER_ITEMS_REQUIRED')) return 'La orden debe contener al menos un servicio.'
    if (technicalMessage.includes('PAYMENT_EXCEEDS_TOTAL')) return 'El pago y el descuento superan el total confirmado por Supabase. Revisa los importes.'
    if (technicalMessage.includes('BRANCH_UNAUTHORIZED') || technicalMessage.includes('No autorizado')) return 'No tienes permisos para registrar órdenes en esta sucursal.'
    if (technicalMessage.includes('ORDER_CONFIRMATION_NOT_FOUND')) return 'La orden fue procesada, pero no se pudo confirmar su lectura. Revisa Pendientes antes de volver a intentarlo.'
    if (/fetch|network|Failed to fetch/i.test(technicalMessage)) return 'No se pudo conectar con Supabase. La orden no fue registrada; verifica tu conexión e inténtalo nuevamente.'
    return error.message || error.details || error.hint || error.error_description || JSON.stringify(error)
}

const buildPickupAt = (dateValue, timeValue = '19:00') => {
    try {
        const date = dateValue
            ? (String(dateValue).slice(0, 4).match(/^\d{4}$/) ? dateValue : formatDayMonthYearInput(dateValue))
            : getDayMonthYearHourPluss3()
        return `${date}T${timeValue || '19:00'}:00-04:00`
    } catch {
        return null
    }
}

const values = data => data && typeof data === 'object' ? Object.values(data) : []
const normalizeDocument = value => String(value || '').trim().toLowerCase().replace(/[\s.-]/g, '')
const normalizePhone = value => String(value || '').replace(/\D/g, '')
const localPhone = value => normalizePhone(value).slice(-8)

const flattenTasks = data => Object.entries(data || {}).flatMap(([branchId, group]) => {
    if (!group || typeof group !== 'object') return []
    if (group.uuid || group.estado) return [{ ...group, _branchId: group['sucursal uuid'] || branchId }]
    return values(group).map(task => ({ ...task, _branchId: task?.['sucursal uuid'] || branchId }))
})

const clientMatchesLookup = (client, lookup) => {
    const document = normalizeDocument(lookup)
    const phone = normalizePhone(lookup)
    const clientDocument = normalizeDocument(client?.CI)
    const clientPhone = normalizePhone(client?.whatsapp)

    return Boolean(
        document && clientDocument && clientDocument === document ||
        phone && clientPhone && (clientPhone === phone || localPhone(clientPhone) === localPhone(phone))
    )
}

const clientMatchScore = (client, lookup) => {
    const document = normalizeDocument(lookup)
    const phone = normalizePhone(lookup)
    const clientDocument = normalizeDocument(client?.CI)
    const clientPhone = normalizePhone(client?.whatsapp)

    if (phone && clientPhone === phone) return 4
    if (phone && localPhone(clientPhone) === localPhone(phone)) return 3
    if (document && clientDocument === document) return 2
    return 1
}

const clientCandidateKey = client => [
    normalizeDocument(client.CI),
    localPhone(client.whatsapp),
    String(client.nombre || '').trim().toLowerCase(),
    String(client.direccion || '').trim().toLowerCase()
].join('|')

const buildClientCandidates = (clientes, tareas) => {
    const candidates = [
        ...values(clientes).map(client => ({ ...client, source: 'Cliente guardado', sourceDate: 0 })),
        ...flattenTasks(tareas).map(order => ({
            uuid: order.uuid,
            nombre: order.nombre,
            CI: order.CI,
            direccion: order.direccion,
            whatsapp: order.whatsapp,
            source: `Orden ${order.code || ''}`.trim(),
            sourceDate: Number(order.date || 0)
        }))
    ].filter(client => client.nombre || client.CI || client.whatsapp)

    return values(candidates.reduce((acc, client) => {
        const key = clientCandidateKey(client)
        const current = acc[key]
        const isSavedClient = client.source === 'Cliente guardado'
        const currentIsSavedClient = current?.source === 'Cliente guardado'
        if (!current || isSavedClient || (!currentIsSavedClient && Number(client.sourceDate || 0) > Number(current.sourceDate || 0))) {
            acc[key] = client
        }
        return acc
    }, {}))
}

function Home() {
    const { filterDis, setFilterDis, Perfil,
        user, userDB, cart, setUserCart,
        modal, setUserData,
        setModal, servicios, setServicios,
        setUserProduct, setUserPedidos, setUserItem, item, filter, setFilter, filterQR, setTienda, setFilterQR,
        pendienteDB, setPendienteDB, tienda, setIntroClientVideo, search, setSearch, distributorPDB, setUserDistributorPDB, webScann, setWebScann,
        qrBCP, setQrBCP,
        ultimoPedido, setUltimoPedido, success, perfil, clientes, sucursales, setSucursales, tareas, setTareas } = useUser()
    const [disponibilidad, setDisponibilidad] = useState('')
    const [categoria, setCategoria] = useState('')
    const router = useRouter()
    const [filterNav, setFilterNav] = useState(false)
    const inputRefWhatsApp = useMask({ mask: '+ 591 __ ___ ___', replacement: { _: /\d/ } });
    const [state, setState] = useState({})
    const [pdfDB, setPdfDB] = useState(null)
    const [autocompleteMatches, setAutocompleteMatches] = useState([])
    const [selectedClient, setSelectedClient] = useState(null)
    const [velox, setVelox] = useState(false);
    const [isQrPreviewOpen, setIsQrPreviewOpen] = useState(false)
    const [orderError, setOrderError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const branchId = assignedBranchId(userDB)
    const selectedPickupDate = state['fecha para recojo']
        ? formatDayMonthYearInput(state['fecha para recojo'])
        : getDayMonthYearHourPluss3()
    const automaticVelox = isBusinessDateToday(selectedPickupDate)
    const isVelox = automaticVelox || velox
    const pricedCart = Object.fromEntries(Object.entries(cart).map(([itemId, cartItem]) => {
        const currentService = servicios?.[itemId] || cartItem
        return [itemId, {
            ...currentService,
            cantidad: cartItem.cantidad,
            observacion: cartItem.observacion,
            costo: getServicePrice(currentService, 'costo 24 hrs', branchId),
            adicional: isVelox ? toAmount(perfil?.adicional) : 0
        }]
    }))
    const cartTotal = calculateCartTotal(pricedCart)
    const veloxSurcharge = Object.values(pricedCart).reduce((total, item) => {
        const quantity = Math.max(0, toAmount(item.cantidad))
        return total + quantity * toAmount(item.adicional)
    }, 0)
    const orderTotal = cartTotal + veloxSurcharge
    const amountPaid = toAmount(state.ac)
    const discountAmount = toAmount(state.descuento)
    const paymentTotal = amountPaid + discountAmount
    const overpaidAmount = Math.max(0, paymentTotal - orderTotal)
    const hasInvalidPaymentAmount = overpaidAmount > 0
    const balance = Math.max(0, orderTotal - paymentTotal)

    const [mode, setMode] = useState('Services')
    const [pdf, setPDF] = useState(false)
    const [lateElement, setLateElement] = useState(undefined)
    const [nextNum, setNextNum] = useState(undefined)
    const path = useReactPath();
    const currentHash = getCurrentHash()
    const userRole = userDB?.rol || userDB?.role
    const normalizedUserRole = normalizeRole(userRole)
    const isCustomer = normalizedUserRole === 'cliente'
    const isServicesStep = currentHash === '' || currentHash === '#' || currentHash === '#Services'
    const isClientStep = currentHash === '#Client'
    const isPaymentStep = currentHash === '#Payment' || currentHash === '#QR' || currentHash === '#Saldo'
    const isWorkflowOpen = isServicesStep || isClientStep || isPaymentStep
    const hasClientData = Boolean(state.nombre && state.whatsapp && state.nombre !== '' && state.whatsapp !== '')
    const receptionPaymentMethod = state['metodo pago recepcion'] || 'Efectivo'
    const stepLinkClass = active => `inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition ${active ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`

    function onChangeHandler(e) {
        if (e.target.name === 'autocomplete') setAutocompleteMatches([])
        setState({ ...state, [e.target.name]: e.target.value })
    }
    function onChangeHandlerDate(e) {
        setState({ ...state, [e.target.name]: formatDayMonthYear(e.target.value) })
    }

    useEffect(() => {
        if (normalizedUserRole === 'personal' && branchId) {
            return ordersRepository.subscribeByBranch(branchId, setTareas)
        }
        return ordersRepository.subscribeAll(setTareas)
    }, [branchId, normalizedUserRole, setTareas])

    function HandlerOnChange(e) {
        QRreaderUtils(e, setFilterQR, setFilter, setPendienteDB)
    }

    function storeConfirm() {
        setTienda(modal)
        setUserCart({})
        setModal('')
    }

    function sortArray(x, y) {
        if (x['nombre 1'].toLowerCase() < y['nombre 1'].toLowerCase()) { return -1 }
        if (x['nombre 1'].toLowerCase() > y['nombre 1'].toLowerCase()) { return 1 }
        return 0
    }
    function handlerSearchFilter(data) {

        setFilter(data)
        setSearch(false)
    }

    function handlerWebScann(e) {
        e.stopPropagation()
        e.preventDefault()
        router.push('/Cliente/Scaner')
    }
    function searchQR(data) {
        filter === data
            ? setFilter('')
            : setFilter(data)
    }
    const handlerPlussVelox = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setVelox(true)
    }
    const handlerLessVelox = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setVelox(false)
    }
    const handlerSubmit = async (e) => {
        e.preventDefault()

        const missingFields = []
        if (!branchId) missingFields.push('sucursal asignada al usuario')
        if (!Object.keys(cart).length) missingFields.push('al menos un servicio')
        if (!String(state.nombre || '').trim()) missingFields.push('nombre del cliente')
        if (!String(state.whatsapp || '').trim()) missingFields.push('WhatsApp del cliente')

        if (missingFields.length) {
            const branchMessage = !branchId
                ? 'Falta asignación de sucursal para generar la orden. Asigna una sucursal a tu usuario desde la sección Personal.'
                : ''
            const remainingFields = missingFields.filter(field => field !== 'sucursal asignada al usuario')
            const fieldsMessage = remainingFields.length
                ? ` Completa: ${remainingFields.join(', ')}.`
                : ''
            setOrderError(`${branchMessage || 'No se puede registrar la orden.'}${fieldsMessage}`)
            setModal('Order Error')
            return
        }

        if (hasInvalidPaymentAmount) {
                setOrderError(`El pago no puede superar el total de la orden. Total: ${orderTotal} Bs. · A cuenta + descuento: ${paymentTotal} Bs. · Exceso: ${overpaidAmount} Bs.`)
                setModal('Order Error')
                return
        }

        try {
                if (isSubmitting) return
                setIsSubmitting(true)
                setOrderError('')
                if (!selectedClient) {
                    const identity = await customersRepository.validateIdentity(state.CI, state.whatsapp)
                    if (!['new_allowed', 'exact_match', 'allowed'].includes(identity?.status)) {
                        setOrderError(identity?.message || 'Los datos del cliente no son consistentes. Corrige CI y WhatsApp antes de continuar.')
                        setModal('Order Error')
                        return
                    }
                }
                setPDF(true)

                const uuid = generateUUID()
                const data = {
                    ['fecha para recojo']: getDayMonthYearHourPluss3(),
                    ['hora para recojo']: '19:00',
                    ac: 0,
                    ...state,
                    reception_payment_amount: amountPaid,
                    reception_payment_method: amountPaid > 0 ? receptionPaymentMethod : null,
                    reception_paid_at: amountPaid > 0 ? new Date().toISOString() : null,
                    ['metodo pago recepcion']: amountPaid > 0 ? receptionPaymentMethod : null,
                    pickup_at: buildPickupAt(state['fecha para recojo'], state['hora para recojo']),
                    fechaDeEntrega: (Object.values(cart).filter(i => i.adicional && i.adicional !== null && i.adicional !== undefined) === undefined || Object.values(cart).filter(i => i.adicional && i.adicional !== null && i.adicional !== undefined).length !== Object.values(cart).length)
                        ? getDayMonthYearHourPluss3() : 'Velox',
                    servicios: pricedCart,
                    date: new Date().getTime(),
                    fecha: getDayMonthYearHour(),
                    mes: getMonthYear(),
                    sucursal: userDB?.sucursal,
                    direccionSucursal: sucursales?.[branchId]?.direccion,
                    uuid,
                    estado: 'Pendiente',
                    ['sucursal uuid']: branchId,
                    velox: isVelox,
                    adicional: veloxSurcharge,
                    total: orderTotal,
                    saldo: balance

                }
                if (selectedClient?.uuid) {
                    data.selected_customer_id = selectedClient.uuid
                    data.selected_customer_document = selectedClient.CI || null
                    data.selected_customer_whatsapp = selectedClient.whatsapp || null
                }

                const order = await ordersRepository.save(branchId, uuid, data)
                setModal('')
                setPdfDB(order)
        } catch (error) {
                console.error('Error registrando la orden:', error)
                setPDF(false)
                setPdfDB(null)
                const technicalMessage = [error?.message, error?.details, error?.hint].filter(Boolean).join(' · ')
                if (technicalMessage.includes('SERVICE_PRICE_CHANGED')) {
                    try {
                        const refreshedServices = await servicesRepository.getAll(setServicios)
                        const refreshedCart = Object.fromEntries(Object.entries(cart).map(([serviceId, cartItem]) => {
                            const refreshedService = refreshedServices?.[serviceId]
                            if (!refreshedService) return [serviceId, cartItem]
                            return [serviceId, {
                                ...refreshedService,
                                cantidad: cartItem.cantidad,
                                observacion: cartItem.observacion,
                                costo: getServicePrice(refreshedService, 'costo 24 hrs', branchId)
                            }]
                        }))
                        setUserCart(refreshedCart)
                    } catch (refreshError) {
                        console.error('Error actualizando precios después del rechazo:', refreshError)
                    }
                }
                setOrderError(getErrorMessage(error))
                setModal('Order Error')
        } finally {
                setIsSubmitting(false)
        }
    }

    function finish() {
        setState({})
        setUserCart({})
        setPdfDB(null)
        setPDF(false)
        setVelox(false)
        setAutocompleteMatches([])
        setSelectedClient(null)
        setIsQrPreviewOpen(false)
        setModal('')

        if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', `${window.location.pathname}#Services`)
            window.dispatchEvent(new PopStateEvent('popstate'))
            window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
        }
    }
    function applyClient(client) {
        const data = {
            nombre: client.nombre || '',
            CI: client.CI || '',
            direccion: client.direccion || '',
            whatsapp: client.whatsapp || ''
        }
        setSelectedClient(client.source === 'Cliente guardado' ? {
            uuid: client.uuid,
            CI: client.CI || null,
            whatsapp: client.whatsapp || null
        } : null)
        setAutocompleteMatches([])
        setState({ ...state, ...data })
    }
    function autocompletar() {
        const lookup = state.autocomplete
        const matches = buildClientCandidates(clientes, tareas)
            .filter((client) => clientMatchesLookup(client, lookup))
            .sort((a, b) => {
                const scoreDiff = clientMatchScore(b, lookup) - clientMatchScore(a, lookup)
                if (scoreDiff !== 0) return scoreDiff
                return Number(b.sourceDate || 0) - Number(a.sourceDate || 0)
            })

        if (matches.length === 1) {
            applyClient(matches[0])
            return
        }
        if (matches.length > 1) {
            const topScore = clientMatchScore(matches[0], lookup)
            const sameScoreMatches = matches.filter((client) => clientMatchScore(client, lookup) === topScore)
            if (sameScoreMatches.length === 1) {
                applyClient(sameScoreMatches[0])
                return
            }
            setAutocompleteMatches(matches)
            return
        }

        setAutocompleteMatches([])
        setModal('user non exit')
    }
    function handlerNext() {
        setModal('Complete Cliente')
    }

    return (
        sucursales && sucursales !== undefined && <main className="">
            {(modal == 'Recetar' || modal == 'Comprar') && <Modal funcion={storeConfirm}>Estas seguro de cambiar a {modal}. <br /> {Object.keys(cart).length > 0 && 'Tus datos se borraran'}</Modal>}
            {modal == 'Auth' && <Modal funcion={() => setModal('')}>Tu perfil esta en espera de ser autorizado</Modal>}
            {modal == 'Observacion' && <Modal funcion={() => setModal('')}>Tu perfil esta en espera de ser autorizado</Modal>}
            {modal == 'user non exit' && <Modal funcion={() => setModal('')} alert={true}>El usuario no existe</Modal>}
            {modal === 'Complete' && <Modal alert={true}>Complete los campos requeridos </Modal>}
            {modal === 'Complete Cliente' && <Modal alert={true}>Complete los campos requeridos de Cliente para continuar</Modal>}
            {modal === 'Order Error' && <Modal funcion={() => setModal('')} alert={true}>{orderError || 'No se pudo registrar la orden.'}</Modal>}
            {isQrPreviewOpen && <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
                role="dialog"
                aria-modal="true"
                aria-label="QR de pago ampliado"
                onClick={() => setIsQrPreviewOpen(false)}
            >
                <div className="relative w-full max-w-[520px] rounded-3xl border border-white/10 bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                    <button
                        type="button"
                        onClick={() => setIsQrPreviewOpen(false)}
                        className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xl font-semibold text-slate-600 transition hover:bg-slate-200 hover:text-slate-900"
                        aria-label="Cerrar QR ampliado"
                    >
                        ×
                    </button>
                    <div className="pr-10">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-600">Pago QR</p>
                        <h2 className="mt-1 text-lg font-semibold text-slate-950">Escanea para pagar</h2>
                    </div>
                    <div className="mt-5 flex justify-center rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <img src={perfil.url} className="max-h-[72vh] w-full max-w-[440px] rounded-2xl bg-white object-contain p-3 shadow-sm" alt="QR de pago ampliado" />
                    </div>
                </div>
            </div>}

            <div className={`h-[85vh] w-screen lg:w-full relative z-10 flex flex-col items-center lg:grid ${isCustomer ? 'lg:h-auto' : 'overflow-hidden'} `} style={{ gridTemplateColumns: !isCustomer && '500px auto', gridAutoFlow: 'dense' }}>
                {<div className={`relative lg:bg-transparent overflow-y-scroll px-4 pb-[90px] sm:px-5  
                ${isCustomer ? 'py-10 w-full' : 'w-full h-full'} 
                ${isWorkflowOpen ? (isCustomer
                        ? 'flex flex-col  items-center' : 'hidden lg:flex flex-col  items-center')
                        : (isCustomer
                            ? 'flex flex-col  items-center'
                            : 'flex flex-col  items-center'
                        )}`} >
                    {filter.length == 0 &&
                        servicios !== null && servicios !== undefined &&
                        Object.values(servicios).sort(sortArray).map((i, index) => {
                            return i.categoria.includes(categoria) &&
                                <Card
                                    i={i}
                                    costo={getServicePrice(i, 'costo 24 hrs', userDB?.['sucursal uuid'])}
                                    inmediato={getServicePrice(i, 'costo inmediato', userDB?.['sucursal uuid'])}
                                    key={index} />
                        })
                    }
                    {filter.length > 0 && filterQR.length === 0 && servicios !== null && servicios !== undefined &&
                        Object.values(servicios).sort(sortArray).map((i, index) => {
                            return (i['nombre 1'].toLowerCase().includes(filter.toLowerCase()) ||
                                (i['nombre 2'] && i['nombre 2'].toLowerCase().includes(filter.toLowerCase())) ||
                                (i['nombre 3'] && i['nombre 3'].toLowerCase().includes(filter.toLowerCase()))) &&
                                i.categoria.includes(categoria) &&
                                <Card
                                    i={i}
                                    costo={getServicePrice(i, 'costo 24 hrs', userDB?.['sucursal uuid'])}
                                    inmediato={getServicePrice(i, 'costo inmediato', userDB?.['sucursal uuid'])}
                                    key={index} />
                        })
                    }
                </div>}
                {userDB !== undefined && !isCustomer && <div className={`relative z-0 flex-col items-center w-full max-w-screen h-[80vh] overflow-y-scroll bg-transparent transition-all px-4 sm:px-5 lg:flex ${isWorkflowOpen ? 'flex' : 'hidden'} `} >
                    <div className='sticky top-0 z-30 w-full border-b border-slate-200 bg-white/90 py-3 backdrop-blur'>
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h1 className="text-lg font-semibold tracking-tight text-slate-950">Nueva orden</h1>
                                <p className="text-xs font-medium text-slate-500">Selecciona servicios, registra cliente y confirma el pago.</p>
                            </div>
                            <div className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 sm:block">
                                {Object.values(cart).length} items
                            </div>
                        </div>
                        <ul className="mt-4 flex gap-2 overflow-x-auto rounded-2xl bg-slate-50 p-1">
                            <li className="shrink-0">
                                <a href='#Services' className={stepLinkClass(isServicesStep)} >Servicios</a>
                            </li>
                            <li className="shrink-0">
                                <a href='#Client' className={stepLinkClass(isClientStep)} >Cliente</a>
                            </li>
                            <li className="shrink-0">
                                {hasClientData
                                    ? <a href='#Payment'
                                        className={stepLinkClass(isPaymentStep)} >Pago y saldo</a>
                                    : <a href='#Client'
                                        className={stepLinkClass(isPaymentStep)}
                                        onClick={handlerNext}>Pago y saldo</a>
                                }
                            </li>
                        </ul>
                    </div>
                    <div className={`relative w-full overflow-auto rounded-b-2xl bg-white/70 pt-4 ${isServicesStep ? '' : 'hidden'} `}>
                        {Object.values(cart).length > 0
                            ? <>
                            <table id="nueva-orden-table" className="admin-table min-w-[700px] overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                <thead>
                                    <tr>
                                        <th scope="col" className="w-[200px]">
                                            Prenda
                                        </th>
                                        {/* <th scope="col" className="px-2 py-1 text-center font-bold">
                                            Velox
                                        </th> */}
                                        <th scope="col" className="w-[100px] text-center">
                                            Observación
                                        </th>
                                        <th scope="col" className="text-center">
                                            Cantidad
                                        </th>
                                        <th scope="col" className="text-center">
                                            Costo total
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.values(pricedCart).map((i) => <MiniCard
                                        i={i}
                                        inmediato={i.adicional}
                                        isVelox={isVelox}
                                        key={i.uuid}
                                    />)}
                                    <tr>
                                        <td className="font-semibold text-slate-950" colSpan={3}>
                                            SUBTOTAL:
                                        </td>
                                        <td className="text-center font-semibold text-slate-950">
                                            {cartTotal} Bs.
                                        </td>
                                    </tr>
                                    {isVelox && <tr>
                                        <td className="font-semibold text-emerald-700" colSpan={3}>
                                            ADICIONAL VELOX:
                                        </td>
                                        <td className="text-center font-semibold text-emerald-700">
                                            {veloxSurcharge} Bs.
                                        </td>
                                    </tr>}
                                    <tr>
                                        <td className="font-bold text-slate-950" colSpan={3}>
                                            TOTAL:
                                        </td>
                                        <td className="text-center font-bold text-slate-950">
                                            {orderTotal} Bs.
                                        </td>
                                    </tr>

                                </tbody>
                            </table>
                            </>
                            : <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-medium text-slate-500">No tiene servicios asignados</div>}
                        {Object.values(cart).length > 0 ? <div className='fixed left-0 md:relative w-full p-5 md:px-0'>
                            <a href='#Client'><Button type="button" theme="Primary">Continuar</Button></a>
                        </div>
                            : <Button type="button" theme="Primary" styled="md:hidden" click={() => router.replace('/')}>Atras</Button>}
                    </div>

                    {
                        isClientStep &&
                        <form className={`w-full max-w-[720px] mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.45)] md:grid md:grid-cols-2 md:gap-4 md:p-6`}>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 md:col-span-2 md:grid md:grid-cols-[1fr_auto] md:gap-3">
                                <Input type="text" name="autocomplete" id="autocomplete" onChange={onChangeHandler} valu={state.autocomplete || ''} className="bg-gray-50 border border-gray-300 text-gray-900 text-[16px] rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5    " placeholder="Introduce el CI/DNI o WhatsApp" />
                                <Button type="button" theme="Primary" click={autocompletar}>Autocompletar</Button>
                            </div>
                            {autocompleteMatches.length > 1 && <div className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                                <div className="mb-2 flex items-center justify-between gap-3">
                                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-700">Se encontraron varios clientes</p>
                                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">{autocompleteMatches.length} opciones</span>
                                </div>
                                <div className="grid max-h-[260px] gap-2 overflow-y-auto pr-1 overscroll-contain">
                                    {autocompleteMatches.map((client) => <button
                                        key={`${client.uuid || client.source || 'client'}-${clientCandidateKey(client)}`}
                                        type="button"
                                        onClick={() => applyClient(client)}
                                        className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-left text-sm transition hover:border-amber-300 hover:bg-amber-100"
                                    >
                                        <span className="flex items-center justify-between gap-2 font-semibold text-slate-900">
                                            <span>{client.nombre || 'Sin nombre'}</span>
                                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-700">{client.source || 'Coincidencia'}</span>
                                        </span>
                                        <span className="block text-xs text-slate-500">CI: {client.CI || 'Sin CI'} · WhatsApp: {client.whatsapp || 'Sin WhatsApp'} · Dirección: {client.direccion || 'Sin dirección'}</span>
                                    </button>)}
                                </div>
                            </div>}
                            <h5 className="text-base font-semibold text-slate-950 md:col-span-2" >Datos de cliente</h5>

                            <div>
                                <Label htmlFor="nombre" required>Nombre</Label>
                                <Input type="text" name="nombre" id="nombre" onChange={onChangeHandler} valu={state.nombre || ''} className="bg-gray-50 border border-gray-300 text-gray-900 text-[16px] rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5    " placeholder="" require />
                            </div>
                            <div>
                                <Label htmlFor="CI">CI</Label>
                                <Input type="text" name="CI" id="CI" onChange={onChangeHandler} valu={state.CI || ''} className="bg-gray-50 border border-gray-300 text-gray-900 text-[16px] rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5    " placeholder="" />
                            </div>
                            <div>
                                <Label htmlFor="direccion">Dirección</Label>
                                <Input type="text" name="direccion" id="direccion" onChange={onChangeHandler} valu={state.direccion || ''} className="bg-gray-50 border border-gray-300 text-gray-900 text-[16px] rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5    " placeholder="" />
                            </div>
                            <div>
                                <Label htmlFor="whatsapp" required>WhatsApp</Label>
                                <Input type="text" name="whatsapp" id="whatsapp" onChange={onChangeHandler} valu={state.whatsapp || ''} className="bg-gray-50 border border-gray-300 text-gray-900 text-[16px] rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5    " reference={inputRefWhatsApp} placeholder="" require />
                            </div>

                            <a href='#Services' className="hidden md:block"><Button type="button" theme="Transparent" >Atras</Button></a>
                            
                            
                            {hasClientData
                                    ? <a href='#Payment' className="block" ><Button type="button" theme="Primary">Continuar</Button></a>

                                    : <a href='#Client'
                                        className={`block`}
                                        onClick={handlerNext}><Button type="button" theme="Primary">Continuar</Button></a>
                                }
                            
                        </form>
                    }
                    {
                        isPaymentStep &&
                        <form className={`w-full max-w-[720px] mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.45)] md:grid md:grid-cols-2 md:gap-4 md:p-6`} onSubmit={handlerSubmit}>
                    
                            <div className="md:col-span-2">
                                <Label htmlFor="metodo pago recepcion" required>Método de pago en recepción</Label>
                                <select
                                    id="metodo pago recepcion"
                                    name="metodo pago recepcion"
                                    value={receptionPaymentMethod}
                                    onChange={onChangeHandler}
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100"
                                    required
                                >
                                    <option value="Efectivo">Efectivo</option>
                                    <option value="QR">QR</option>
                                </select>
                            </div>
                            {receptionPaymentMethod === 'QR' && <div className='flex justify-center rounded-2xl border border-slate-200 bg-slate-50 p-5 md:col-span-2 '>
                                <button
                                    type="button"
                                    onClick={() => setIsQrPreviewOpen(true)}
                                    className="group rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-cyan-100"
                                    title="Ver QR en grande"
                                    aria-label="Ver QR de pago en grande"
                                >
                                    <img src={perfil.url} className='w-[220px] max-w-full rounded-xl bg-white p-2 shadow-sm transition group-hover:scale-[1.02] group-hover:shadow-md' alt="QR de pago" />
                                    <span className="mt-2 block text-center text-xs font-semibold text-cyan-700">Click para ampliar</span>
                                </button>
                            </div>}
                            <div>
                                <Label htmlFor="fecha para recojo" required>Fecha para entrega</Label>
                                <Input type="date" name="fecha para recojo" id="email" onChange={onChangeHandlerDate} defValue={state['fecha para recojo'] && state['fecha para recojo'] !== undefined ? formatDayMonthYearInput(state['fecha para recojo']) : getDayMonthYearHourPluss3()} className="bg-gray-50 border border-gray-300 text-gray-900 text-[16px] rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5    " placeholder="" require />
                            </div>
                            <div>
                                <Label htmlFor="hora para recojo" required>Hora para prenda</Label>
                                <Input type="time" name="hora para recojo" id="email" onChange={onChangeHandler} defValue={state['hora para recojo'] && state['hora para recojo'] !== undefined ? state['hora para recojo'] : '19:00'} className="bg-gray-50 border border-gray-300 text-gray-900 text-[16px] rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5    " placeholder="" require />
                            </div>
                            <div>
                                <Label htmlFor="ac" required>A cuenta</Label>
                                <Input type="text" name="ac" id="email" onChange={onChangeHandler} defValue={state.ac && state.ac !== undefined ? state.ac : 0} className="bg-gray-50 border border-gray-300 text-gray-900 text-[16px] rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5    " placeholder="" require />
                            </div>
                            <div>
                                <Label htmlFor="descuento">Descuento</Label>
                                <Input type="text" name="descuento" id="email" onChange={onChangeHandler} defValue={state.descuento && state.descuento !== undefined ? state.descuento : 0} className="bg-gray-50 border border-gray-300 text-gray-900 text-[16px] rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5    " placeholder="" />
                            </div>

                            <div>
                                <Label htmlFor="saldo">Saldo</Label>
                                <span className={`block h-11 w-full rounded-xl border px-3.5 py-2.5 text-sm font-semibold ${hasInvalidPaymentAmount ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-slate-50 text-slate-950'}`} >
                                    {balance} Bs.
                                </span>
                                {hasInvalidPaymentAmount && <p className="mt-1.5 text-xs font-medium leading-snug text-rose-600">
                                    El pago excede el total por {overpaidAmount} Bs.
                                </p>}
                            </div>
                            <div className=''>
                                <Label htmlFor="velox">Velox</Label>
                                <div className='flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50'>
                                    {isVelox ? <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg" onClick={automaticVelox ? undefined : handlerLessVelox}>
                                        <circle cx="12.5" cy="12.5" r="12.5" fill="#32CD32" />
                                        <path fillRule="evenodd" clipRule="evenodd" d="M4 13.5L6.16667 11.3333L10.5 15.6667L19.1667 7L21.3333 9.16667L10.5 20L4 13.5Z" fill="white" />
                                    </svg>
                                        : <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg" onClick={handlerPlussVelox}>
                                            <circle cx="12.5" cy="12.5" r="12.5" fill="#9ca3af" />
                                            <path fillRule="evenodd" clipRule="evenodd" d="M4 13.5L6.16667 11.3333L10.5 15.6667L19.1667 7L21.3333 9.16667L10.5 20L4 13.5Z" fill="white" />
                                        </svg>}
                                    <span className={`text-sm font-bold ${isVelox ? 'text-emerald-700' : 'text-slate-400'}`}>
                                        {isVelox ? `+ ${veloxSurcharge} Bs.` : 'Sin adicional'}
                                    </span>
                                </div>
                                {isVelox && <p className="mt-1.5 text-xs font-medium text-slate-500">{toAmount(perfil?.adicional)} Bs. por cada unidad seleccionada.</p>}

                            </div>
                            {pdf === false && <a href='#Client' className="hidden md:block"><Button type="button" theme="Transparent">Atras</Button></a>}
                            {pdf === false && <Button type="submit" theme={isSubmitting ? 'Loading' : 'Primary'} disabled={hasInvalidPaymentAmount || isSubmitting}>Registrar</Button>}
                            {pdf && <div>
                                <Button type="button" theme="Danger" click={finish}>Finalizar</Button>
                            </div>
                            }
                            {pdf && pdfDB && <InvoicePDF i={{ ...pdfDB }} />}
                        </form>
                    }
                </div >}
            </div >


            {Object.entries(cart).length !== 0 && !isCustomer && isServicesStep
                ? <div className="fixed lg:hidden w-screen sm:w-[500px] px-5 lg:px-0 lg:pr-[14px] bottom-[70px] lg:bottom-5 left-0 right-0 mx-auto z-20">
                    <a href="#Services"><Button theme="SuccessBuy">Asignar Servicio</Button></a>
                </div>
                : null
            }
        </main>
    )
}

export default Home
