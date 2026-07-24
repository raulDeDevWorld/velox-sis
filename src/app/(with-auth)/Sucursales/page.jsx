'use client'

import Button from '@/components/Button'
import Subtitle from '@/components/Subtitle'
import Modal from '@/components/Modal'
import Loader from '@/components/Loader'

import Select from '@/components/Select'
import { useUser } from '@/context/'
import Tag from '@/components/Tag'
import { useRouter } from 'next/navigation';
import { WithAuth } from '@/HOCs/WithAuth'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'
import ExportExcelButton from '@/components/ExportExcelButton'
import { useEffect, useState, useRef } from 'react'
import { branchesRepository } from '@/features'

function Home() {
    const { user, setUserUuid, userDB, msg, setMsg, modal, setModal, temporal, setTemporal, distributorPDB, setUserDistributorPDB, setUserItem, setUserData, setUserSuccess, sucursales, setSucursales, setServicios, item } = useUser()

    const router = useRouter()
    const [state, setState] = useState({})
    const [tag, setTag] = useState('')
    const [filter, setFilter] = useState('')
    const refFirst = useRef(null);


    function onChangeHandler(e, i) {
        setState({ ...state, [i.uuid]: { ...state[i.uuid], uuid: i.uuid, [e.target.name]: e.target.value } })
    }
    async function save(i) {
        const callback = () => {
            const obj = { ...state }
            delete obj[i.uuid]
            setState(obj)
            branchesRepository.getAll(setSucursales)
        }

        await branchesRepository.save(i.uuid, {...state[i.uuid]}, callback)
    }
    
    function deletConfirm() {
        const callback2 = () => {
            setModal('')
        }
        const callback = () => {
            branchesRepository.getAll(setSucursales).then(callback2)
        }
        branchesRepository.remove(item.uuid, callback)
    }
    function delet(i) {
        setUserItem(i)
        setModal('Delete')
    }
    function redirect(id) {
        setUserUuid(id)
        return router.push('Sucursales/Agregar/')
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
        if (sucursales !== undefined) return
        return branchesRepository.subscribeAll(setSucursales)
    }, [sucursales])

    const filteredBranches = sucursales
        ? Object.values(sucursales).sort(sortArray).filter(i => i.nombre?.toLowerCase().includes(filter))
        : []
    const pagination = usePagination(filteredBranches, 10, filter)

    return (

        <div className='h-full'>
                 <button className='fixed text-[20px] text-gray-500 h-[50px] w-[50px] rounded-full inline-block left-[0px] top-0 bottom-0 my-auto bg-[#00000010] z-20 lg:left-[20px]' onClick={prev}>{'<'}</button>
            <button className='fixed text-[20px] text-gray-500 h-[50px] w-[50px] rounded-full inline-block right-[0px] top-0 bottom-0 my-auto bg-[#00000010] z-20 lg:right-[20px]' onClick={next}>{'>'}</button>

            <div className="admin-panel" ref={refFirst}>
                {modal === 'Delete' && <Modal funcion={deletConfirm}>Estas seguro de eliminar a la siguiente sucursal {msg}</Modal>}
                <div className="sticky left-0 mb-4 flex flex-col gap-3 bg-white sm:flex-row sm:items-center sm:justify-between">
                    <h3 className='admin-title'>Sucursales</h3>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <button type="button" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-cyan-400 bg-cyan-400 px-4 text-sm font-semibold text-slate-950 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-100" onClick={() => redirect()}>
                            <span className="text-xl leading-none" aria-hidden="true">+</span>
                            Agregar sucursal
                        </button>
                        <ExportExcelButton tableId="sucursales-table" filename="sucursales" sheetName="Sucursales" />
                    </div>
                </div>
                <div className='flex justify-center w-full'>
                    <input type="text" className='admin-search' onChange={onChangeHandler} placeholder='Filtrar por nombre' />
                </div>
                <br />
                <table id="sucursales-table" className="admin-table w-full min-w-[1150px]">
                    <thead className="text-[14px] text-gray-700 uppercase bg-gray-50  ">
                        <tr>
                            <th scope="col" className="min-w-[50px] px-3 py-3">
                                #
                            </th>
                            <th scope="col" className="px-3 py-3">
                                Nombre de sucursal
                            </th>
                            <th scope="col" className="px-3 py-3">
                                Dirección
                            </th>

                            <th scope="col" className="px-3 py-3">
                                Whatsapp
                            </th>

                            <th scope="col" className="text-center px-3 py-3">
                                Editar
                            </th>
                            <th scope="col" className="text-center px-3 py-3">
                                Eliminar
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {pagination.pageItems.map((i, index) => {
                            return <tr className="bg-white text-[14px] border-b hover:bg-gray-50" key={i.uuid}>
                                <td className="min-w-[50px] px-3 py-4  text-gray-900 align-middle">
                                    {(pagination.page - 1) * pagination.pageSize + index + 1}
                                </td>
                                <td className="min-w-[250px] px-3 py-4  text-gray-900 ">
                                    {/* <textarea id="message" rows="1" onChange={(e) => onChangeHandler(e, i)} cols="6" name='nombre de producto 1' defaultValue={i['nombre de producto 1']} className="block p-1.5  w-full h-full text-sm text-gray-900 bg-white rounded-lg  focus:ring-gray-100 focus:border-gray-100 focus:outline-none resize-x-none" placeholder="Escribe aqui..."></textarea> */}
                                    {i['nombre']}
                                </td>
                                <td className="min-w-[250px] px-3 py-4  text-gray-900 ">
                                    <textarea id={`direccion-${i.uuid}`} rows="1" onChange={(e) => onChangeHandler(e, i)} cols="6" name='direccion' defaultValue={i['direccion']} className="block p-1.5  w-full h-full text-sm text-gray-900 bg-white rounded-lg  focus:ring-gray-100 focus:border-gray-100 focus:outline-none resize-x-none" placeholder="Escribe aquí..."></textarea>
                                    {/* {i['direccion']} */}
                                </td>
                                <td className="min-w-[200px] px-3 py-4  text-gray-900 ">
                                    <textarea id={`whatsapp-${i.uuid}`} rows="1" onChange={(e) => onChangeHandler(e, i)} name='whatsapp' cols="4" defaultValue={i['whatsapp']} className="block p-1.5  w-full h-full text-sm text-gray-900 bg-white rounded-lg  focus:ring-gray-100 focus:border-gray-100 focus:outline-none resize-x-none" placeholder="Escribe aquí..."></textarea>
                                    {/* {i['whatsapp']} */}
                                </td>

                                <td className="min-w-[150px] px-3 py-4">
                                    <Button theme={state[i.uuid] ? 'Primary' : 'Disable'} disabled={!state[i.uuid]} click={() => save(i)}>Guardar</Button>
                                </td>
                                <td className="min-w-[150px] px-3 py-4">
                                    <Button theme="Danger" click={() => delet(i)}>Eliminar</Button>
                                </td>
                            </tr>
                        })
                        }
                    </tbody>
                </table>
                <Pagination {...pagination} />

            </div>
        </div>
    )
}


export default Home





