'use client'

import Button from '@/components/Button'
import Subtitle from '@/components/Subtitle'
import Modal from '@/components/Modal'
import Select from '@/components/Select'
import { useUser } from '@/context/'
import Tag from '@/components/Tag'
import { useRouter } from 'next/navigation';
import { WithAuth } from '@/HOCs/WithAuth'
import Pagination from '@/components/Pagination'
import { usePagination } from '@/hooks/usePagination'
import ExportExcelButton from '@/components/ExportExcelButton'
import { useEffect, useState, useRef } from 'react'
import { uploadStorage } from '@/supabase/storage'
import { branchesRepository, servicesRepository } from '@/features'
import { categoria, recepcion } from '@/constants'
import LoaderBlack from '@/components/LoaderBlack'

function Home() {
    const { user, setUserUuid, userDB, msg, setMsg, modal, setModal, temporal, setTemporal, distributorPDB, setUserDistributorPDB, setUserItem, item, setUserData, setUserSuccess, servicios, setServicios, sucursales, setSucursales, perfil } = useUser()

    const router = useRouter()
    const [state, setState] = useState({})
    const [stateDynamic, setStateDynamic] = useState({})
    const [postImage, setPostImage] = useState({})
    const [urlPostImage, setUrlPostImage] = useState({})

    const [filter, setFilter] = useState('')
    const refFirst = useRef(null);

    function onChangeHandlerCheck(e) {
        setState({ ...state, ['dias de atencion']: { ...state['dias de atencion'], [e.target.name]: e.target.checked } })
    }

    function onChangeHandler(e, i) {
        setState({ ...state, [i.uuid]: { ...state[i.uuid], uuid: i.uuid, [e.target.name]: e.target.value } })
    }
    function onChangeHandlerDynamic(e, i) {
        setStateDynamic({ ...stateDynamic, [i.uuid]: { ...stateDynamic[i.uuid], [e.target.name]: e.target.value } })
    }
    const onClickHandlerSelect = (name, value, uuid) => {
        setState({ ...state, [uuid]: { ...state[uuid], uuid, [name]: value } })
    }
    function manageInputIMG(e, uuid) {
        const file = e.target.files[0]
        setPostImage({ ...postImage, [uuid]: file })
        setUrlPostImage({ ...urlPostImage, [uuid]: URL.createObjectURL(file) })
        setState({ ...state, [uuid]: { ...state[uuid], uuid } })
    }
    function save(i) {
        setModal('Guardando')
        const data = {
            ...state[i.uuid],
            ['costos y entregas']: {
                ...i['costos y entregas'],
                ...stateDynamic[i.uuid]
            }
        }
        const callback = () => {
            const obj = { ...state }
            delete obj[i.uuid]
            setState(obj)
            const obj2 = { ...stateDynamic }
            delete obj2[i.uuid]
            setStateDynamic(obj2)
            servicesRepository.getAll(setServicios)
            setModal('')
        }

        servicesRepository.save(i.uuid, data, callback)
        // uploadStorage(`servicios/${uuid}`, postImage, { ...state, uuid, ['costos y entregas']: costos }, callback)

        postImage[i.uuid] && uploadStorage(`servicios/${i.uuid}`, postImage[i.uuid], data, callback)
    }
    function delet(i) {
        setUserItem(i)
        setModal('Delete')
    }
    function deletConfirm() {
        const callback = () => {
            servicesRepository.getAll(setServicios)
            setModal('')
        }
        servicesRepository.remove(item.uuid, callback)
    }
    function buttonHandler(i, action) {
        setUserItem(i)
        setModal(action)
    }
    function redirect() {
        router.push('Servicios/Agregar')
    }

    function sortArray(x, y) {
        if (x['nombre 1'].toLowerCase() < y['nombre 1'].toLowerCase()) { return -1 }
        if (x['nombre 1'].toLowerCase() > y['nombre 1'].toLowerCase()) { return 1 }
        return 0
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
    useEffect(() => {
        const cleanups = [
            servicesRepository.subscribeAll(setServicios),
            branchesRepository.subscribeAll(setSucursales)
        ]
        return () => cleanups.forEach(cleanup => cleanup?.())
    }, [])

    const filteredServices = servicios
        ? Object.values(servicios).sort(sortArray).filter(i =>
            [i['nombre 1'], i['nombre 2'], i['nombre 3']].some(name => name?.toLowerCase().includes(filter))
        )
        : []
    const pagination = usePagination(filteredServices, 10, filter)

    return (
        <div className='h-full'>
            {modal === "Guardando" && <LoaderBlack>{modal}</LoaderBlack>}
            {modal === 'Delete' && <Modal funcion={deletConfirm}>Estas seguro de eliminar al siguiente usuario {msg}</Modal>}
            <button className='fixed text-[20px] text-gray-500 h-[50px] w-[50px] rounded-full inline-block left-[0px] top-0 bottom-0 my-auto bg-[#00000010] z-20 lg:left-[20px]' onClick={prev}>{'<'}</button>
            <button className='fixed text-[20px] text-gray-500 h-[50px] w-[50px] rounded-full inline-block right-[0px] top-0 bottom-0 my-auto bg-[#00000010] z-20 lg:right-[20px]' onClick={next}>{'>'}</button>
            <div className="admin-panel" ref={refFirst}>
                <div className="sticky left-0 mb-4 flex flex-col gap-3 bg-white sm:flex-row sm:items-center sm:justify-between">
                    <h3 className='admin-title'>Servicios</h3>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <button type="button" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-cyan-400 bg-cyan-400 px-4 text-sm font-semibold text-slate-950 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-100" onClick={redirect}>
                            <span className="text-xl leading-none" aria-hidden="true">+</span>
                            Agregar servicio
                        </button>
                        <ExportExcelButton tableId="servicios-table" filename="servicios" sheetName="Servicios" />
                    </div>
                </div>
                <div className='flex justify-center w-full'>
                    <input type="text" className='admin-search' onChange={onChangeHandler} placeholder='Filtrar por nombre' />
                </div>
                <br />
                <table id="servicios-table" className={`admin-table w-[3000px] min-w-[${sucursales && sucursales !== undefined ? sucursales.length * 200 + 1500 : 1500}px]`}>
                    <thead className="text-[14px] text-gray-700 uppercase bg-gray-50  ">
                        <tr>
                            <th scope="col" className="min-w-[50px] px-3 py-3">
                                #
                            </th>
                            <th scope="col" className="px-3 py-3">
                                Nombre 1
                            </th>
                            <th scope="col" className="px-3 py-3">
                                Nombre 2
                            </th>
                            <th scope="col" className="px-3 py-3">
                                Nombre 3
                            </th>

                            <th scope="col" className="px-3 py-3">
                                Descripcion basica
                            </th>

                            <th scope="col" className="text-center px-3 py-3">
                                Categoria
                            </th>
                            <th scope="col" className="text-center px-3 py-3">
                                Recepción por
                            </th>
                            {sucursales && sucursales !== undefined && Object.values(sucursales).map((i) => {
                                return <th key={i.uuid} scope="col" className="min-w-[100px] text-center px-3 py-3">
                                        Costo 24 hrs <br />
                                        {i.nombre}
                                    </th>
                            })}
                            <th scope="col" className="px-3 py-3">
                                Imagen
                            </th>
                            <th scope="col" className="text-center px-3 py-3">
                                Editar
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {pagination.pageItems.map((i, index) => {
                            return <tr className="bg-white text-[14px] border-b hover:bg-gray-50" key={i.uuid}>
                                    <td className="min-w-[50px] px-3 py-4 text-gray-900 align-middle">
                                    {(pagination.page - 1) * pagination.pageSize + index + 1}
                                    </td>
                                    <td className="min-w-[200px] px-3 py-4  text-gray-900 " >
                                        <textarea id="message" rows="1" onChange={(e) => onChangeHandler(e, i)} cols="6" name='nombre 1' defaultValue={i['nombre 1']} className="block p-1.5  w-full h-full text-sm text-gray-900 bg-white rounded-lg  focus:ring-gray-100 focus:border-gray-100 focus:outline-none resize-x-none" placeholder="Escribe aqui..."></textarea>
                                        {/* {i['nombre 1']} */}
                                    </td>
                                    <td className="min-w-[200px] px-3 py-4  text-gray-900 " >
                                        <textarea id="message" rows="1" onChange={(e) => onChangeHandler(e, i)} cols="6" name='nombre 2' defaultValue={i['nombre 2']} className="block p-1.5  w-full h-full text-sm text-gray-900 bg-white rounded-lg  focus:ring-gray-100 focus:border-gray-100 focus:outline-none resize-x-none" placeholder="Escribe aqui..."></textarea>
                                        {/* {i['nombre 2']} */}
                                    </td>
                                    <td className="min-w-[200px] px-3 py-4  text-gray-900 " >
                                        <textarea id="message" rows="1" onChange={(e) => onChangeHandler(e, i)} cols="6" name='nombre 3' defaultValue={i['nombre 3']} className="block p-1.5  w-full h-full text-sm text-gray-900 bg-white rounded-lg  focus:ring-gray-100 focus:border-gray-100 focus:outline-none resize-x-none" placeholder="Escribe aqui..."></textarea>
                                        {/* {i['nombre 3']} */}
                                    </td>
                                    <td className="px-3 py-4  text-gray-900 " >
                                        <textarea id="message" rows="1" onChange={(e) => onChangeHandler(e, i)} cols="6" name='descripcion basica' defaultValue={i['descripcion basica']} className="block p-1.5  w-full h-full text-sm text-gray-900 bg-white rounded-lg  focus:ring-gray-100 focus:border-gray-100 focus:outline-none resize-x-none" placeholder="Escribe aqui..."></textarea>
                                    </td>
                                    <td className="min-w-[200px] px-3 py-4  text-gray-900 " >
                                        <Select arr={perfil.categoria} name='categoria' uuid={i.uuid} defaultValue={i.categoria} click={onClickHandlerSelect} />
                                    </td>
                                    <td className="min-w-[200px] px-3 py-4  text-gray-900 " >
                                        <Select arr={perfil['recepcion por']} name='recepcion por' uuid={i.uuid} defaultValue={i['recepcion por']} click={onClickHandlerSelect} />
                                    </td>

                                    {/* {JSON.parse(i['costos y entregas'])[`costo inmediato ${item.uuid}`]}  */}
                                    {sucursales && sucursales !== undefined && Object.values(sucursales).map((item) => {
                                        return <td key={`${i.uuid}-${item.uuid}`}>
                                                <textarea id="message" rows="1" onChange={(e) => onChangeHandlerDynamic(e, i)} cols="6" name={`costo 24 hrs ${item.uuid}`} defaultValue={i['costos y entregas'] !== undefined ? i['costos y entregas'][`costo 24 hrs ${item.uuid}`] : 0} className="block p-1.5  w-full text-center h-full text-sm text-gray-900 bg-white rounded-lg  focus:ring-gray-100 focus:border-gray-100 focus:outline-none resize-x-none" placeholder="Escribe aqui..."></textarea>
                                            </td>
                                    }
                                    )}

                                    {/* {sucursales && sucursales !== undefined && Object.values(sucursales).map((item) => {
                                        return <>
                                            <td scope="col" className="px-3 py-3">
                                                Costo 24 hrs <br />
                                                {item.nombre}

                                            </td>
                                            <td scope="col" className="px-3 py-3">
                                                costo inmediato <br />
                                                {item.nombre}
                                            </td>
                                        </>
                                    })} */}


                                    <td className="w-32 p-4">
                                        <label htmlFor={`img${index}`}>
                                            <img src={urlPostImage[i.uuid] ? urlPostImage[i.uuid] : i.url} alt="Apple Watch" />
                                            <input id={`img${index}`} type="file" onChange={(e) => manageInputIMG(e, i.uuid)} className='hidden' />
                                        </label>
                                    </td>
                                    <td className="min-w-[200px] px-3 py-4">
                                        {state[i.uuid] || stateDynamic[i.uuid]
                                            ? <Button theme={"Primary"} click={() => save(i)}>Guardar</Button>
                                            : <Button theme={"Danger"} click={() => delet(i)}>Eliminar</Button>
                                        }
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





