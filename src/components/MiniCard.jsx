'use client';

import Button from '@/components/Button'
import { useUser } from '@/context'

export default function Card({ i, inmediato, isVelox = false, mobile = false }) {

    const { cart, setUserCart } = useUser()
    const quantity = Number.isFinite(Number(cart?.[i.uuid]?.cantidad)) ? Number(cart[i.uuid].cantidad) : 0
    const cost = Number.isFinite(Number(i.costo)) ? Number(i.costo) : 0
    const surcharge = isVelox && Number.isFinite(Number(inmediato)) ? Number(inmediato) : 0

    function onChangeHandler(e) {
         setUserCart({ ...cart, [i.uuid]: { ...i, observacion: e.target.value } })
    }
    const addCart = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setUserCart({ ...cart, [i.uuid]: { ...i, cantidad: 1 } })
    }
    const addPlussCart = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setUserCart({ ...cart, [i.uuid]: { ...i, cantidad: cart[i.uuid].cantidad + 1 } })
    }
    const addLessCart = (e) => {
        e.preventDefault()
        e.stopPropagation()
        const obj = { ...cart }
        delete obj[i.uuid]
        cart[i.uuid].cantidad - 1 == 0
            ? setUserCart(obj)
            : setUserCart({ ...cart, [i.uuid]: { ...i, cantidad: cart[i.uuid].cantidad - 1 } })
    }
    if (mobile) return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
                <h3 className="truncate text-sm font-bold uppercase tracking-wide text-slate-950">{i['nombre 1']}</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">{cost} Bs. por unidad</p>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-900">{quantity * (cost + surcharge)} Bs.</span>
        </div>
        <label className="mt-4 block text-xs font-semibold text-slate-600" htmlFor={`observacion-${i.uuid}`}>Observación</label>
        <textarea id={`observacion-${i.uuid}`} rows="2" onChange={onChangeHandler} defaultValue={i.observacion || ''} className="mt-1.5 block min-h-[64px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100" placeholder="Sin observaciones"></textarea>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Cantidad</span>
            <div className="flex items-center gap-2">
                <Button theme='MiniSecondary' click={addLessCart} aria-label={`Quitar una unidad de ${i['nombre 1']}`}>−</Button>
                <span className="flex h-11 min-w-11 items-center justify-center rounded-xl bg-slate-100 px-3 text-sm font-bold text-slate-950">{quantity}</span>
                <Button theme='MiniPrimary' click={addPlussCart} aria-label={`Añadir una unidad de ${i['nombre 1']}`}>+</Button>
            </div>
        </div>
    </article>

    return (

            <tr>
                <td className="min-w-[200px] align-middle">
                    <span className="block font-semibold text-slate-900">{i['nombre 1']}</span>
                    <span className="mt-1 block text-xs font-semibold text-slate-500">{cost} Bs.</span>
                </td>
                {/* <td className="text-center ">
                    <div className='w-full flex justify-center'>
                        {velox ? <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg" onClick={handlerLessVelox}>
                            <circle cx="12.5" cy="12.5" r="12.5" fill="#32CD32" />
                            <path fillRule="evenodd" clipRule="evenodd" d="M4 13.5L6.16667 11.3333L10.5 15.6667L19.1667 7L21.3333 9.16667L10.5 20L4 13.5Z" fill="white" />
                        </svg>
                            : <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg" onClick={handlerPlussVelox}>
                                <circle cx="12.5" cy="12.5" r="12.5" fill="#9ca3af" />
                                <path fillRule="evenodd" clipRule="evenodd" d="M4 13.5L6.16667 11.3333L10.5 15.6667L19.1667 7L21.3333 9.16667L10.5 20L4 13.5Z" fill="white" />
                            </svg>}
                    </div>
                </td> */}
                <td className="min-w-[150px] text-center">
                    <textarea id={`observacion-tabla-${i.uuid}`} rows="1" onChange={onChangeHandler} cols="1" name='observacion' defaultValue={i.observacion || ''} className="block min-h-10 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100" placeholder="Escribe aquí..."></textarea>
                {/* <Button theme='Primary' click={(e) => addObs(e, i)}>Observación</Button> */}
                </td>
                <td className="text-slate-900">
                    <div className="lg:flex lg:w-full lg:justify-center">
                        {cart && cart[i.uuid] && cart[i.uuid].cantidad !== undefined && cart[i.uuid].cantidad !== 0
                            ? <div className='flex w-[80px] items-center flex-col-reverse gap-2 md:w-full md:max-w-[130px] md:flex-row md:justify-between'>
                                <Button theme='MiniSecondary' click={(e) => addLessCart(e, i)}>-</Button>
                                <span className='px-2'>
                                    {cart && cart[i.uuid] && cart[i.uuid].cantidad !== undefined && cart[i.uuid].cantidad !== 0 && <span className='flex h-9 min-w-9 items-center justify-center rounded-xl bg-slate-50 text-sm font-semibold text-slate-950'>{cart[i.uuid].cantidad}</span>}
                                </span>
                                <Button theme='MiniPrimary' click={(e) => addPlussCart(e, i)}>+</Button>
                            </div>
                            : <Button theme='MiniPrimary' click={(e) => addCart(e, i)}>Comprar</Button>
                        }
                    </div>
                </td>
                <td className="font-semibold text-slate-900">
                    <div className="text-center text-sm font-semibold text-slate-900">
                     {cart?.[i.uuid] ? quantity * cost + quantity * surcharge : cost} Bs.
                        
                        {/* <span className="text-[16px]  text-gray-700  font-extrabold">   Bs.</span> */}
                    </div>
                </td>
            </tr>
    )
}




