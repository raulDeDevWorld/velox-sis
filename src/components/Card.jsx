'use client';

import Button from '@/components/Button'
import { useState } from 'react'

import { useUser } from '@/context'
import { useRouter } from 'next/navigation';

export default function Card({ nombre1, nombre2, nombre3, costo, url, empresa, descripcion, i, recetado, detalle, inmediato }) {

    const { setFilterDis, user, userDB, distributorPDB, setUserDistributorPDB, setUserItem, item, setUserData, setUserSuccess, cart, setUserCart, modal, setModal, setFilter, success, perfil } = useUser()
    const router = useRouter()
    const [showAlternativeNames, setShowAlternativeNames] = useState(false)
    const safeCost = Number.isFinite(Number(costo)) ? Number(costo) : 0
    const userRole = userDB?.rol
    const alternativeNames = [i['nombre 2'], i['nombre 3']].filter(Boolean)
    function seeMore(e) {
        setUserItem(i)
        router.push('/Producto')
    }

    const addCart = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setUserCart({ ...cart, [i.uuid]: { ...i, costo: safeCost, cantidad: detalle !== undefined ? detalle.cantidad : 1 } })
    }

    const addPlussCart = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setUserCart({ ...cart, [i.uuid]: { ...i, costo: safeCost, cantidad: detalle !== undefined ? detalle.cantidad : cart[i.uuid].cantidad + 1 } })
    }

    const addLessCart = (e) => {
        e.preventDefault()
        e.stopPropagation()
        const obj = { ...cart }
        delete obj[i.uuid]

        cart[i.uuid].cantidad - 1 == 0
            ? setUserCart(obj)
            : setUserCart({ ...cart, [i.uuid]: { ...i, costo: safeCost, cantidad: detalle !== undefined ? 0 : cart[i.uuid].cantidad - 1 } })
    }

    const consultService = (e) => {
        e.preventDefault()
        e.stopPropagation()

        const phone = String(perfil?.whatsapp || '').replace(/\D/g, '')
        if (!phone) {
            window.alert('El negocio todavía no configuró su WhatsApp de atención.')
            return
        }

        const serviceName = i['nombre 1'] || 'este servicio'
        const message = window.encodeURIComponent(`Hola, quisiera consultar por el servicio: ${serviceName}.`)
        window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${message}`, '_blank', 'noopener,noreferrer')
    }

    return (
        <div className="relative mt-4 grid w-full max-w-[500px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_-32px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_22px_55px_-34px_rgba(15,23,42,0.65)]" style={{ gridTemplateColumns: 'minmax(0,1fr) 140px', gridAutoFlow: 'dense' }}>
            <div className="flex min-w-0 flex-col justify-start p-4 leading-normal">
                <div className="flex w-full flex-col justify-between text-slate-950">
                    {i.categoria && <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-700">{i.categoria}</p>}
                    {alternativeNames.length > 0
                        ? <button
                            type="button"
                            className="w-fit text-left text-sm font-semibold uppercase tracking-wide text-slate-950 transition hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                            onClick={() => setShowAlternativeNames(visible => !visible)}
                            aria-expanded={showAlternativeNames}
                            aria-label={`${showAlternativeNames ? 'Ocultar' : 'Mostrar'} nombres alternativos de ${i['nombre 1']}`}
                        >
                            {i['nombre 1']}
                        </button>
                        : <div className="text-sm font-semibold uppercase tracking-wide text-slate-950">{i['nombre 1']}</div>}
                    {showAlternativeNames && alternativeNames.length > 0 && <div className="mt-2 space-y-1 border-l-2 border-cyan-100 pl-2.5">
                        {alternativeNames.map((name, index) => <div key={`${name}-${index}`} className="text-xs font-medium uppercase text-slate-500">{name}</div>)}
                    </div>}
                </div>
                <div className="mt-3">
                    <p className="line-clamp-3 text-sm leading-5 text-slate-500">{i['descripcion basica']}</p>
                </div>
            </div>

            <div>
                <div className="relative h-full min-h-[145px] w-[140px] bg-slate-50 text-center" >
                    <img src={i.url} className='h-full w-full object-cover' alt="" />
                </div>
            </div>
            <div className='flex w-full items-center justify-start border-t border-slate-100 px-4 py-3'>
                {userRole !== 'Cliente'
                    ? <>
                        <div className="flex items-baseline rounded-full bg-slate-50 px-3 py-1">
                            <span className="text-xl font-semibold text-slate-950">{safeCost}</span>
                            <span className="ml-1 text-xs font-bold uppercase text-slate-500">BS</span>
                        </div>
                        {/* <div className="flex items-baseline text-gray-900 bg-white rounded-full px-0 py-2">
                            <span className="text-[18px]  text-gray-400">{inmediato}</span>
                            <span className="text-[18px] text-gray-400">BS</span>
                        </div> */}
                    </>
                    : <span className="text-sm font-semibold text-slate-600">{i['recepcion por'] || 'Servicio'}</span>
                }
            </div>
            <div className='flex items-center justify-end border-t border-slate-100 py-3 pr-4'>
                {userRole === 'Cliente'
                    ? <button
                        type="button"
                        onClick={consultService}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1fbd5a] hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 active:translate-y-0"
                        aria-label={`Consultar por WhatsApp sobre ${i['nombre 1'] || 'este servicio'}`}
                    >
                        <svg
                            aria-hidden="true"
                            viewBox="0 0 32 32"
                            className="h-[19px] w-[19px] fill-current"
                        >
                            <path d="M16.04 3C8.85 3 3 8.73 3 15.78c0 2.25.6 4.45 1.74 6.38L3 28.5l6.55-1.68a13.2 13.2 0 0 0 6.48 1.67h.01C23.22 28.49 29 22.76 29 15.7 29 8.67 23.22 3 16.04 3Zm0 23.33a11 11 0 0 1-5.61-1.51l-.4-.23-3.88 1 1.04-3.7-.26-.38a10.43 10.43 0 0 1-1.72-5.73c0-5.85 4.86-10.61 10.84-10.61 5.97 0 10.79 4.71 10.79 10.54 0 5.85-4.81 10.62-10.76 10.62Zm5.94-7.95c-.33-.16-1.92-.93-2.22-1.04-.3-.1-.52-.16-.74.16-.22.32-.85 1.04-1.04 1.25-.19.22-.38.24-.71.08-.33-.16-1.38-.5-2.63-1.58a9.82 9.82 0 0 1-1.82-2.22c-.19-.32-.02-.5.14-.66.15-.14.33-.38.49-.57.16-.19.22-.32.33-.54.11-.21.05-.4-.03-.56-.08-.16-.74-1.74-1.01-2.38-.27-.64-.54-.55-.74-.56h-.63c-.22 0-.57.08-.87.4-.3.33-1.15 1.1-1.15 2.68 0 1.58 1.18 3.11 1.34 3.32.16.21 2.31 3.46 5.6 4.85.78.33 1.39.53 1.87.68.79.24 1.5.21 2.06.13.63-.09 1.92-.77 2.2-1.5.27-.72.27-1.34.19-1.47-.08-.13-.3-.21-.63-.37Z" />
                        </svg>
                        Consultar
                    </button>
                    : cart && cart[i.uuid] && cart[i.uuid].cantidad !== undefined && cart[i.uuid].cantidad !== 0
                    ? <div className='flex w-full items-center justify-end gap-2'>
                        <Button theme='MiniSecondary' click={(e) => addLessCart(e, i)}>-</Button>
                        {cart && cart[i.uuid] && cart[i.uuid].cantidad !== undefined && cart[i.uuid].cantidad !== 0 && <span className='flex h-9 min-w-9 items-center justify-center rounded-xl bg-slate-50 px-3 text-sm font-semibold text-slate-950'> {cart[i.uuid].cantidad} </span>}
                        <Button theme='MiniPrimary' click={(e) => addPlussCart(e, i)}>+</Button>
                    </div>
                    : <Button theme='MiniPrimaryComprar' click={(e) => addCart(e, i)}>Añadir</Button>}
            </div>
        </div>
    )
}




