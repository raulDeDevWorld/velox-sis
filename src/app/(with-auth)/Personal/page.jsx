'use client'

import Button from '@/components/Button'
import Subtitle from '@/components/Subtitle'
import Modal from '@/components/Modal'
import Select from '@/components/Select'
import { useUser } from '@/context/'
import Tag from '@/components/Tag'
import { WithAuth } from '@/HOCs/WithAuth'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'
import ExportExcelButton from '@/components/ExportExcelButton'
import { useEffect, useState, useRef } from 'react'
import { branchesRepository, customersRepository } from '@/features'
import { roles } from '@/constants'

function Home() {
    const { user, setUserUuid, userDB, msg, setMsg, modal, setModal, temporal, setTemporal, distributorPDB, setUserDistributorPDB, item, setUserItem, setUserData, setUserSuccess, sucursales, setSucursales, setClientes, clientes } = useUser()

    const [state, setState] = useState({})
    const [filter, setFilter] = useState('')
    const [actionError, setActionError] = useState('')
    const [showInactive, setShowInactive] = useState(false)
    const [inactivePeople, setInactivePeople] = useState([])
    const refFirst = useRef(null);
    const branchList = Object.values(sucursales || {})


    function onChangeHandler(e) {
        setFilter(e.target.value.toLowerCase())
    }
    const onClickHandlerSelect = (name, value, uuid) => {
        setState(current => ({ ...current, [uuid]: { ...current[uuid], [name]: value } }))
    }  
    const onClickHandlerSelect2 = (name, value, uuid) => {
        const branch = branchList.find(item => item.nombre === value)
        setState(current => ({
            ...current,
            [uuid]: {
                ...current[uuid],
                [name]: value,
                'sucursal uuid': branch?.uuid || null
            }
        }))
    }  
    async function save(i) {
        try {
            await customersRepository.save(i.uuid, state[i.uuid])
            const obj = { ...state }
            delete obj[i.uuid]
            setState(obj)
            await customersRepository.getAll(setClientes)
        } catch (error) {
            setActionError(error?.message || 'No se pudo actualizar el colaborador.')
            setModal('Person Error')
        }
    }
    function delet(i) {
        setUserItem(i)
        setMsg(i.nombre || '')
        setModal('Delete')
    }
    async function deletConfirm() {
        if (!item?.uuid) return setModal('')
        try {
            await customersRepository.remove(item.uuid)
            await customersRepository.getAll(setClientes)
            if (showInactive) setInactivePeople(await customersRepository.getInactive('profiles'))
            setModal('')
        } catch (error) {
            setActionError(error?.message || 'No se pudo desactivar el colaborador.')
            setModal('Person Error')
        }
    }
    async function toggleInactive() {
        const nextValue = !showInactive
        setShowInactive(nextValue)
        if (nextValue) {
            try {
                setInactivePeople(await customersRepository.getInactive('profiles'))
            } catch (error) {
                setActionError(error?.message || 'No se pudo cargar el personal inactivo.')
                setModal('Person Error')
            }
        }
    }
    async function reactivate(i) {
        try {
            await customersRepository.reactivate('profiles', i.uuid)
            await customersRepository.getAll(setClientes)
            setInactivePeople(await customersRepository.getInactive('profiles'))
        } catch (error) {
            setActionError(error?.message || 'No se pudo reactivar el colaborador.')
            setModal('Person Error')
        }
    }
    const prev = () => {
        requestAnimationFrame(() => {
            const scrollLeft = refFirst.current.scrollLeft;
            const itemWidth = screen.width - 50
            refFirst.current.scrollLeft = scrollLeft - itemWidth;
        });
    };
    const next = () => {
        requestAnimationFrame(() => {
            const scrollLeft = refFirst.current.scrollLeft;
            const itemWidth = screen.width - 50
            refFirst.current.scrollLeft = scrollLeft + itemWidth;
        });
    };
    function sortArray(x, y) {
        if (x['nombre'].toLowerCase() < y['nombre'].toLowerCase()) { return -1 }
        if (x['nombre'].toLowerCase() > y['nombre'].toLowerCase()) { return 1 }
        return 0
    }

    useEffect(() => {
        const cleanups = [
            customersRepository.subscribeAll(setClientes),
            branchesRepository.subscribeAll(setSucursales)
        ]
        return () => cleanups.forEach(cleanup => cleanup?.())
    }, [])

    const filteredStaff = clientes
        ? Object.values(clientes).sort(sortArray).filter(i =>
            ['Personal', 'Admin'].includes(i.rol) &&
            [i.nombre, i.email, i.CI, i.whatsapp].some(value => String(value || '').toLowerCase().includes(filter))
        )
        : []
    const pagination = usePagination(filteredStaff, 10, filter)

    return (

        <div className='h-full'>
            <button className='fixed text-[20px] text-gray-500 h-[50px] w-[50px] rounded-full inline-block left-[0px] top-0 bottom-0 my-auto bg-[#00000010] z-20 lg:left-[20px]' onClick={prev}>{'<'}</button>
            <button className='fixed text-[20px] text-gray-500 h-[50px] w-[50px] rounded-full inline-block right-[0px] top-0 bottom-0 my-auto bg-[#00000010] z-20 lg:right-[20px]' onClick={next}>{'>'}</button>

            <div className="admin-panel w-full" ref={refFirst}>
                {modal === 'Delete' && <Modal funcion={deletConfirm}>¿Estás seguro de desactivar al siguiente colaborador?</Modal>}
                {modal === 'Person Error' && <Modal funcion={() => setModal('')} alert={true}>{actionError}</Modal>}
                <div className="sticky left-0 mb-4 flex flex-col gap-3 bg-white sm:flex-row sm:items-center sm:justify-between">
                    <h3 className='admin-title'>Personal</h3>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <button type="button" className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={toggleInactive}>
                            {showInactive ? 'Ocultar inactivos' : 'Ver inactivos'}
                        </button>
                        <ExportExcelButton tableId="personal-table" filename="personal" sheetName="Personal" />
                    </div>
                </div>
                <div className='flex justify-center w-full'>
                    <input type="text" className='admin-search' onChange={onChangeHandler} placeholder='Buscar nombre, correo, CI o WhatsApp' />
                </div>
                <br />
                <table id="personal-table" className="admin-table w-full min-w-[1650px]">
                    <thead className="text-[14px] text-gray-700 uppercase bg-gray-50  ">
                        <tr>
                            <th scope="col" className="min-w-[50px] px-3 py-3">
                                #
                            </th>
                             <th scope="col" className="px-3 py-3">
                                 Nombre
                             </th>
                             <th scope="col" className="px-3 py-3">
                                 Correo
                             </th>
                            <th scope="col" className="px-3 py-3">
                                CI
                            </th>
                            <th scope="col" className="px-3 py-3">
                                Dirección
                            </th>
                            
                            <th scope="col" className="px-3 py-3">
                                Whatsapp
                            </th>
                            <th scope="col" className="text-center px-3 py-3">
                                Rol
                            </th>
                            <th scope="col" className="text-center px-3 py-3">
                                Sucursal
                            </th>  
                            <th scope="col" className="text-center px-3 py-3">
                                Guardar
                            </th>
                            <th scope="col" className="text-center px-3 py-3">
                                Desactivar
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sucursales !== undefined && pagination.pageItems.map((i, index) => {
                            return <tr className="bg-white text-[14px] border-b hover:bg-gray-50" key={i.uuid}>
                                <td className="min-w-[50px] h-full px-3 py-4 text-gray-900 align-middle">
                                    {(pagination.page - 1) * pagination.pageSize + index + 1}
                                </td>
                                 <td className="min-w-[250px] px-3 py-4 text-gray-900">
                                    {/* <textarea id="message" rows="1" onChange={(e) => onChangeHandler(e, i)} cols="6" name='nombre de producto 1' defaultValue={i['nombre de producto 1']} className="block p-1.5  w-full h-full text-sm text-gray-900 bg-white rounded-lg  focus:ring-gray-100 focus:border-gray-100 focus:outline-none resize-x-none" placeholder="Escribe aqui..."></textarea> */}
                                     {i['nombre']}
                                 </td>
                                 <td className="min-w-[240px] px-3 py-4 text-gray-900">
                                     {i.email || 'Sin correo'}
                                 </td>
                                <td className="min-w-[150px] px-3 py-4 text-gray-900">
                                    {/* <textarea id="message" rows="1" onChange={(e) => onChangeHandler(e, i)} cols="6" name='nombre de producto 1' defaultValue={i['nombre de producto 1']} className="block p-1.5  w-full h-full text-sm text-gray-900 bg-white rounded-lg  focus:ring-gray-100 focus:border-gray-100 focus:outline-none resize-x-none" placeholder="Escribe aqui..."></textarea> */}
                                    {i['CI']}
                                </td>
                                <td className="min-w-[250px] px-3 py-4 text-gray-900">
                                    {/* <textarea id="message" rows="1" onChange={(e) => onChangeHandler(e, i)} cols="6" name='nombre de producto 1' defaultValue={i['nombre de producto 1']} className="block p-1.5  w-full h-full text-sm text-gray-900 bg-white rounded-lg  focus:ring-gray-100 focus:border-gray-100 focus:outline-none resize-x-none" placeholder="Escribe aqui..."></textarea> */}
                                    {i['direccion']}
                                </td>
                                <td className="min-w-[150px] px-3 py-4  text-gray-900 ">
                                    {/* <textarea id="message" rows="1" onChange={(e) => onChangeHandler(e, i)} name='costo' cols="4" defaultValue={i['costo']} className="block p-1.5 h-full text-sm text-gray-900 bg-white rounded-lg  focus:ring-gray-100 focus:border-gray-100 focus:outline-none resize-x-none" placeholder="Escribe aqui..."></textarea> */}
                                    {i['whatsapp']}
                                </td>
                                <td className="min-w-[200px] px-3 py-4  text-gray-900 " >
                                    <Select arr={roles} name='rol' uuid={i.uuid} defaultValue={i.rol} click={onClickHandlerSelect} />
                                    {state[i.uuid]?.rol && state[i.uuid].rol !== i.rol && <p className="mt-1.5 text-xs font-medium text-amber-700">
                                        {state[i.uuid].rol === 'Cliente'
                                            ? 'Se reactivará su ficha de cliente y este perfil quedará inactivo.'
                                            : `Cambiará su nivel de acceso a ${state[i.uuid].rol}.`}
                                    </p>}
                                </td>
                                <td className="min-w-[200px] px-3 py-4  text-gray-900 " >
                                    <Select arr={branchList.map((branch) => branch.nombre)} name='sucursal' uuid={i.uuid} defaultValue={i.sucursal ? i.sucursal : 'No asignado'} click={onClickHandlerSelect2} />
                                </td>
                                <td className="min-w-[150px] px-3 py-4">
                                    <Button theme={state[i.uuid] ? 'Primary' : 'Disable'} disabled={!state[i.uuid]} click={() => save(i)}>Guardar</Button>
                                </td>
                                <td className="min-w-[150px] px-3 py-4">
                                    <Button theme="Danger" click={() => delet(i)}>Desactivar</Button>
                                </td>
                            </tr>
                        })
                        }
                    </tbody>
                </table>
                <Pagination {...pagination} />
                {showInactive && <div className="sticky left-0 mt-8">
                    <h4 className="mb-3 text-lg font-semibold text-slate-900">Personal inactivo</h4>
                    <table className="admin-table w-full min-w-[900px]">
                        <thead className="bg-gray-50 text-[14px] uppercase text-gray-700">
                            <tr>
                                <th className="px-3 py-3">Nombre</th>
                                <th className="px-3 py-3">Correo</th>
                                <th className="px-3 py-3">CI</th>
                                <th className="px-3 py-3">Rol</th>
                                <th className="px-3 py-3">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inactivePeople.map(i => <tr className="border-b bg-white text-[14px]" key={i.uuid}>
                                <td className="px-3 py-4">{i.nombre}</td>
                                <td className="px-3 py-4">{i.email || 'Sin correo'}</td>
                                <td className="px-3 py-4">{i.CI || 'Sin CI'}</td>
                                <td className="px-3 py-4">{i.rol}</td>
                                <td className="min-w-[150px] px-3 py-4"><Button theme="Success" click={() => reactivate(i)}>Reactivar</Button></td>
                            </tr>)}
                            {!inactivePeople.length && <tr><td className="px-3 py-5 text-center text-slate-500" colSpan={5}>No hay personal inactivo.</td></tr>}
                        </tbody>
                    </table>
                </div>}
{/* 
                <div className='lg:flex hidden lg:fixed top-[100px] right-[65px] '>
                    <div className='flex justify-center items-center h-[50px] text-white text-[14px] font-bold bg-[#00E2FF] border border-gray-200 rounded-[10px] px-10 cursor-pointer mr-2' onClick={redirect}>Agregar Sucursal</div>
                    <div className='flex justify-center items-center bg-[#00E2FF] h-[50px] w-[50px]  rounded-full text-white cursor-pointer' onClick={redirect}> <span className='text-white text-[30px]'>+</span> </div>
                </div> */}
            </div>
        </div>

    )
}


export default Home





