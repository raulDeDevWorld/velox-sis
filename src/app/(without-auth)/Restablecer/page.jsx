'use client'
import { useUser } from '@/context'
import { onAuth, sendPasswordReset } from '@/supabase/auth'
import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Msg from '@/components/Msg'
import LoaderWithLogo from '@/components/LoaderWithLogo'


export default function Home() {
    const { user, introVideo, setSound, setIntroVideo, userDB, setUserProfile, setUserSuccess, success, setUserData, postsIMG, setUserPostsIMG, sound1, sound2, setSound1, setSound2, } = useUser()
    const [isDisable, setIsDisable] = useState(false)


    const handlerResset = (e) => {
        e.preventDefault()
        let email = e.target[0].value
        let email2 = e.target[1].value

        if (email.length == 0 || email2.length == 0) {
            return setUserSuccess('Complete')
        }
        if (email !== email2) {
            return setUserSuccess('Repeat')
        }
        setModal('Te enviamos un correo...')
        const callback = () => { setModal('') }
        sendPasswordReset(email, callback)
    }

    return (
        <div className='w-screen flex flex-col justify-center items-center p-5 '>
            <form className={`w-full max-w-[450px] space-y-4 shadow-2xl bg-white rounded-[20px] px-5 py-10 `} onSubmit={handlerResset}>
                <h5 className="text-[18px] text-center text-gray-800">Restablecer</h5>
                <div>
                    <label htmlFor="email" className="block mb-2 text-[16px] text-left font-medium text-gray-800">Email</label>
                    <Input type="email" name="email" id="email" className="bg-gray-50 border border-gray-300 text-gray-900 text-[16px] rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5    " placeholder="name@company.com" require />
                </div>
                <div>
                    <label htmlFor="email" className="block mb-2 text-[16px] text-left font-medium text-gray-800">Escribe: Restablecer</label>
                    <Input type="email" name="text" id="email" className="bg-gray-50 border border-gray-300 text-gray-900 text-[16px] rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5    " placeholder="Restablecer" require />
                </div>
                <Button type="submit" theme="Primary">Restablecer</Button>
                <div className="text-[14px] text-center font-medium text-gray-800">Ya tienes una cuenta? <Link href="/Login" className="text-gray-400 underline">Inicia Sesión</Link ></div>
            </form>

        </div>
    )
}

