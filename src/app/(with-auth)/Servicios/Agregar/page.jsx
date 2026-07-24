'use client'
import { uploadStorage } from '@/supabase/storage'
import { useState, useRef, useEffect } from 'react'
import { useUser } from '@/context'
import { branchesRepository, servicesRepository } from '@/features'
import Input from '@/components/Input'
import Select from '@/components/Select'
import Label from '@/components/Label'
import LoaderBlack from '@/components/LoaderBlack'
import Success from '@/components/Success'
import Modal from '@/components/Modal'

import Button from '@/components/Button'
import { generateUUID } from '@/utils/UIDgenerator'


function Home() {
    const { user, userDB, setUserData, setUserSuccess, success, setModal, modal, sucursales, setSucursales, setServicios, perfil } = useUser()
    const [state, setState] = useState({})
    const [costos, setCostos] = useState({})
    const [errorMessage, setErrorMessage] = useState('')

    const [postImage, setPostImage] = useState(null)
    const [urlPostImage, setUrlPostImage] = useState(null)
    const [disable, setDisable] = useState(false)

    const inputRef1 = useRef(null)
    const inputRef2 = useRef(null)
    const inputRef3 = useRef(null)
    const inputRef4 = useRef(null)
    const onClickHandlerSelect = (name, value) => {
        setState({ ...state, [name]: value })
    }

    function manageInputIMG(e) {
        const file = e.target.files[0]
        if (!file) return
        setPostImage(file)
        setUrlPostImage(URL.createObjectURL(file))
    }

    function onChangeHandler(e) {
        setState({ ...state, [e.target.name]: e.target.value })
    }
    function onChangeHandlerDynimic(e) {
        setCostos(current => ({ ...current, [e.target.name]: e.target.value }))
    }
    function callback() {

        if (inputRef1.current) inputRef1.current.value = ''
        if (inputRef2.current) inputRef2.current.value = ''
        if (inputRef3.current) inputRef3.current.value = ''
        if (inputRef4.current) inputRef4.current.value = ''
        setState({})
        setCostos({})
        setPostImage(null)
        setUrlPostImage(null)
        setUserSuccess('Se ha guardado correctamente')
        setDisable(false)
        setModal('')
    }

    const getErrorMessage = (error) => {
        if (!error) return 'No se pudo guardar el servicio.'
        if (error.statusCode === '404' || error.message?.includes('Bucket not found')) {
            return 'No existe el bucket public-assets en Supabase Storage. Crea el bucket o guarda el servicio sin imagen.'
        }
        if (error.code === '42501') return 'No tienes permisos para guardar servicios. Esta acción requiere rol Admin.'
        return error.message || error.details || error.hint || 'No se pudo guardar el servicio.'
    }

    const validateService = () => {
        if (!state['nombre 1']?.trim()) return 'El nombre principal del servicio es requerido.'
        if (!state['descripcion basica']?.trim()) return 'La descripción básica es requerida.'
        if (!(state['recepcion por'] || perfil?.['recepcion por']?.[0])) return 'Selecciona el método de recepción.'
        if (!(state.categoria || perfil?.categoria?.[0])) return 'Selecciona la categoría.'
        if (!Object.values(costos).some((value) => Number(value) > 0)) return 'Agrega al menos un costo de entrega en 24 hrs.'
        if (postImage && postImage.size > 10 * 1024 * 1024) return 'La imagen no puede superar 10MB.'
        return ''
    }

    async function save(e) {
        e.preventDefault()
        if (disable) return
        if (!perfil?.categoria?.length || !perfil?.['recepcion por']?.length) {
            setErrorMessage('Configura primero las categorías y los métodos de recepción en Datos de la App.')
            setModal('Servicio Error')
            return
        }
        const validationError = validateService()
        if (validationError) {
            setErrorMessage(validationError)
            setModal('Servicio Error')
            return
        }
        const uuid = generateUUID()
        const payload = {
            ...state,
            categoria: state.categoria || perfil.categoria[0],
            ['recepcion por']: state['recepcion por'] || perfil['recepcion por'][0],
            uuid,
            activo: true,
            ['costos y entregas']: costos
        }

        try {
            setDisable(true)
            setModal('Guardando')
            if (postImage) {
                await uploadStorage(`servicios/${uuid}`, postImage, payload)
            } else {
                await servicesRepository.save(uuid, payload)
            }
            await servicesRepository.getAll(setServicios)
            callback()
        } catch (error) {
            console.error('Error guardando servicio:', error)
            setErrorMessage(getErrorMessage(error))
            setDisable(false)
            setModal('Servicio Error')
        }
    }


    useEffect(() => {
        if (sucursales !== undefined) return

        return branchesRepository.subscribeAll(setSucursales)
    }, [sucursales, setSucursales])


    return (
        <div className='min-h-full p-5 pb-[30px] lg:pb-5'>
            {modal === "Guardando" && <LoaderBlack>{modal}</LoaderBlack>}

            <form className='p-10 min-w-screen  lg:min-w-auto bg-white shadow-2xl min-h-[80vh]' onSubmit={save}>
                <h3 className='text-center text-[16px] pb-3'>AGREGAR SERVICIO</h3>

                <div className="min-w-full flex justify-center ">
                    <label htmlFor="fileUpload" className="mt-2 flex justify-center items-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10 md:w-[250px] md:h-[200px]" style={{ backgroundImage: `url(${urlPostImage})`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }}>
                        <div className="text-center">
                            <svg className="mx-auto h-12 w-12 text-gray-300" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
                            </svg>
                            <div className="mt-4 flex text-sm leading-6 text-gray-600">
                                <label htmlFor="fileUpload" className="relative cursor-pointer rounded-md bg-white font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500">
                                    <span>Cargar Imagen</span>
                                    <input id="fileUpload" name="frontPage" onChange={manageInputIMG} type="file" className="sr-only" accept="image/png,image/jpeg,image/gif,image/webp" />
                                </label>
                                <p className="pl-1">{' '} puede ser GIF</p>
                            </div>
                            <p className="text-xs leading-5 text-gray-600">PNG, JPG, GIF max 10MB</p>
                        </div>
                    </label>
                </div>
                <br />
                <div className="md:grid gap-6 mb-6 md:grid-cols-2">
                    <div>
                        <Label htmlFor="">Nombre 1</Label>
                        <Input type="text" name="nombre 1" reference={inputRef1} onChange={onChangeHandler} require />
                    </div>
                    <div>
                        <Label htmlFor="">Nombre 2</Label>
                        <Input type="text" name="nombre 2" reference={inputRef2} onChange={onChangeHandler} />
                    </div>
                    <div>
                        <Label htmlFor="">Nombre 3</Label>
                        <Input type="text" name="nombre 3" reference={inputRef3} onChange={onChangeHandler} />
                    </div>

                    <div>
                        <Label htmlFor="">Descripción básica</Label>
                        <Input type="text" name="descripcion basica" reference={inputRef4} onChange={onChangeHandler} require />
                    </div>
                    <div>
                        <Label htmlFor="">Recepción por</Label>
                        <Select arr={perfil?.['recepcion por']} name='recepcion por' click={onClickHandlerSelect} />
                    </div>
                    <div>
                        <Label htmlFor="">Categoria</Label>
                        <Select arr={perfil?.categoria} name='categoria' click={onClickHandlerSelect} />
                    </div>
                    <h4 className='text-center col-span-2 text-[16px] pt-10'>AGREGA LOS COSTOS POR SUCURSAL</h4>
                    {
                        sucursales && sucursales !== undefined && Object.values(sucursales).map((i) => {
                            const priceField = `costo 24 hrs ${i.uuid}`
                            return <div key={i.uuid}>
                                <h5 className='text-center col-span-2 text-[16px] p-5'>{i.nombre}</h5>
                                <div>
                                    <Label htmlFor="">Costo entrega en 24 hrs</Label>
                                    <Input type="text" name={priceField} valu={costos[priceField] || ''} onChange={onChangeHandlerDynimic} />
                                </div>
                            </div>
                        })
                    }
                </div>
                <div className='flex w-full justify-around'>
                    <Button type="submit" theme={disable ? 'Loading' : 'Primary'} disabled={disable}>Guardar</Button>
                </div>
                {success == 'Se ha guardado correctamente' && <LoaderBlack />}
                {modal == 'Servicio Error' && <Modal funcion={() => setModal('')} alert={true}>{errorMessage}</Modal>}
                {success == 'Se ha guardado correctamente' && <Success>Guardado correctamente</Success>}

            </form>

        </div>
    )
}


export default Home
