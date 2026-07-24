'use client'
import { branchesRepository } from '@/features'
import { useState, useRef } from 'react'
import { useUser } from '@/context/'
import Input from '@/components/Input'
import Select from '@/components/Select'
import Label from '@/components/Label'
import LoaderBlack from '@/components/LoaderBlack'
import Loader from '@/components/Loader'

import Success from '@/components/Success'
import Checkbox from '@/components/Checkbox'
import Modal from '@/components/Modal'

import Button from '@/components/Button'
import { useMask } from '@react-input/mask';
import { useRouter } from 'next/navigation';
import { WithAuth } from '@/HOCs/WithAuth'
import { generateUUID } from '@/utils/UIDgenerator'
// import { disponibilidad } from '@/constants'


function Home() {
    const router = useRouter()

    const { user, userDB, setUserData, setUserSuccess, success, setModal, modal, sucursales, setSucursales } = useUser()
    const [state, setState] = useState({})
    const [errorMessage, setErrorMessage] = useState('')
    const [saved, setSaved] = useState(false)

    const inputRefWhatsApp = useMask({ mask: '+ 591 __ ___ ___', replacement: { _: /\d/ } });

    const inputRef1 = useRef(null)
    const inputRef2 = useRef(null)
    const inputRef3 = useRef(null)

    function onChangeHandler(e) {
        setState({ ...state, [e.target.name]: e.target.value })
    }
    function handlerReset() {
        inputRef1.current && (inputRef1.current.value = '')
        inputRef2.current && (inputRef2.current.value = '')
        inputRef3.current && (inputRef3.current.value = '')
        setState({})
    }
    function setWhatsappRef(element) {
        inputRef3.current = element
        if (typeof inputRefWhatsApp === 'function') {
            inputRefWhatsApp(element)
            return
        }
        if (inputRefWhatsApp) inputRefWhatsApp.current = element
    }
    const getErrorMessage = error => {
        if (!error) return 'No se pudo guardar la sucursal.'
        if (typeof error === 'string') return error
        if (error.code === '42501') return 'No tienes permisos para crear sucursales. Esta acción requiere rol Admin.'
        return error.message || error.details || error.hint || 'No se pudo guardar la sucursal.'
    }
    async function save(e) {
        e.preventDefault()
        const payload = {
            nombre: state.nombre?.trim(),
            direccion: state.direccion?.trim(),
            whatsapp: state.whatsapp?.trim()
        }

        if (!payload.nombre || !payload.direccion || !payload.whatsapp) {
            setErrorMessage('Completa nombre, dirección y WhatsApp para guardar la sucursal.')
            setModal('Sucursal Error')
            return
        }

        try {
            setSaved(false)
            setErrorMessage('')
            setModal('Guardando')
            const uuid = generateUUID()
            await branchesRepository.save(uuid, { ...payload, uuid })
            await branchesRepository.getAll(setSucursales)
            handlerReset()
            setModal('')
            setSaved(true)
        } catch (error) {
            console.error('Error guardando sucursal:', error)
            setModal('Sucursal Error')
            setErrorMessage(getErrorMessage(error))
        }
    }

    return (
        <div className='min-h-full p-5 pb-[30px] lg:pb-5'>
          {modal === "Guardando" && <LoaderBlack>{modal}</LoaderBlack>}
            <form className='p-10 min-w-screen  lg:min-w-auto bg-white shadow-2xl min-h-[80vh]' onSubmit={save}>
                <h3 className='text-center text-[16px] pb-3'>Agregar Sucursal</h3>
                {saved && <Success>Guardado correctamente</Success>}
                <br />
                <div className="flex flex-col md:grid md:gap-6 mb-6 md:grid-cols-2">
                    <div>
                        <Label htmlFor="">Nombre de Sucursal</Label>
                        <Input type="text" name="nombre" reference={inputRef1} onChange={onChangeHandler} require />
                    </div>
                    <div>
                        <Label htmlFor="">Dirección</Label>
                        <Input type="text" name="direccion" reference={inputRef2} onChange={onChangeHandler} require />
                    </div>
                    <div>
                        <Label htmlFor="">Whatsapp</Label>
                        <Input type="text" name="whatsapp" reference={setWhatsappRef} onChange={onChangeHandler} require />
                    </div>
                </div>
                <div className='flex w-full justify-around'>
                    {/* <Button theme='Success' >Ver Vista Cliente</Button> */}
                    <Button type="submit" theme='Primary'>Guardar</Button>
                </div>
                {modal == 'Seleccione una categoria.' && <Modal funcion={() => setUserSuccess('')} alert={true}>{modal}</Modal>}
                {modal == 'Sucursal Error' && <Modal funcion={() => setModal('')} alert={true}>{errorMessage}</Modal>}

            </form>
        </div>
    )
}


export default Home
