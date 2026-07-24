'use client'
import { useUser } from '@/context'
import { handleSignOut as signOut } from '@/supabase/auth'
import { supabase } from '@/supabase/client'
import { customersRepository } from '@/features'
import { useRouter } from 'next/navigation';

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Button from '@/components/Button'
import Input from '@/components/Input'
import { useMask } from '@react-input/mask';

export default function Home() {
    const { user, introVideo, setSound, userDB, setUserProfile, setUserSuccess, success, setUserData, postsIMG, setUserPostsIMG, sound1, sound2, setSound1, setSound2, } = useUser()
    const [isDisable, setIsDisable] = useState(false)
    const inputRefWhatsApp = useMask({ mask: '+ 591 __ ___ ___', replacement: { _: /\d/ } });
    const router = useRouter()

    useEffect(() => {
        if (user === null) router.replace('/Login')
    }, [user, router])

    const signInHandler = async (e) => {
        e.preventDefault()
        if (isDisable) return

        const form = new FormData(e.currentTarget)
        const data = {
            nombre: form.get('nombre')?.trim(),
            CI: form.get('ci')?.trim(),
            direccion: form.get('direccion')?.trim(),
            whatsapp: form.get('whatsapp')?.trim(),
            rol: 'Cliente',
            bloqueado: false
        }

        setIsDisable(true)
        try {
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
            if (sessionError) throw new Error(sessionError.message)
            const authenticatedUser = sessionData.session?.user
            if (!authenticatedUser) {
                setUserSuccess('Tu sesión no está activa. Inicia sesión antes de completar tu perfil.')
                router.replace('/Login')
                return
            }
            const userId = authenticatedUser.id
            data.uuid = userId

            const identity = await customersRepository.validateIdentity(data.CI, data.whatsapp)
            if (!['new_allowed', 'exact_match', 'allowed'].includes(identity?.status)) {
                throw new Error(identity?.message || 'Corrige CI y WhatsApp para completar tu registro.')
            }

            await customersRepository.save(userId, data)
            setUserData(data)
            router.replace('/')
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : error?.message || error?.details || error?.hint || JSON.stringify(error) || 'No se pudo completar el registro'
            console.error('Error creando el perfil:', message)
            setUserSuccess(message)
            setIsDisable(false)
        }
    }
    const signOutAndReset = () => {
        setUserProfile(null)
        signOut()
    }

    return (
        <div className='w-screen  flex flex-col justify-center items-center p-5 '>
            <form className={`w-full sm:max-w-[450px] md:max-w-[600px] space-y-4 shadow-2xl bg-white rounded-[20px] px-5 py-10 md:mt-[0px] md:grid md:grid-cols-2 md:gap-[5px]`} onSubmit={signInHandler} >
                <h5 className="text-[18px] text-center text-gray-800 md:col-span-2" >Registrate</h5>
                <div>
                    <label htmlFor="nombre" className="block mb-2 text-[16px] text-left font-medium text-gray-800">Nombre</label>
                    <Input type="text" name="nombre" id="nombre" placeholder="" require />
                </div>
                <div>
                    <label htmlFor="ci" className="block mb-2 text-[16px] text-left font-medium text-gray-800">CI</label>
                    <Input type="text" name="ci" id="ci" placeholder="" require />
                </div>
                <div>
                    <label htmlFor="direccion" className="block mb-2 text-[16px] text-left font-medium text-gray-800">Dirección</label>
                    <Input type="text" name="direccion" id="direccion" placeholder="" require />
                </div>
                <div>
                    <label htmlFor="whatsapp" className="block mb-2 text-[16px] text-left font-medium text-gray-800">WhatsApp</label>
                    <Input type="text" name="whatsapp" id="whatsapp" reference={inputRefWhatsApp} placeholder="" require />
                </div>
                <Button type="submit" theme={isDisable === false ? "Primary" : "Loading"} styled={"md:col-span-2"}>Registrarme</Button>
                <div className="text-[14px] text-center font-medium text-gray-800 md:col-span-2">Ya tienes una cuenta? <Link href="/Login" className="text-gray-400 underline" onClick={signOutAndReset}>Inicia Sesión</Link ></div>
            </form>
        </div>
    )
}
