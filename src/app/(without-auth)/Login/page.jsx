'use client'
import { useUser } from '@/context'
import { signInWithEmail } from '@/supabase/auth'
import { useState } from 'react'
import Link from 'next/link'
import Button from '@/components/Button'
import Input from '@/components/Input'


export default function Home() {
  const { user, userDB, setUserProfile, setUserSuccess, success, setUserData, postsIMG, setUserPostsIMG, sound1, sound2, setSound1, setSound2, } = useUser()
  const [isDisable, setIsDisable] = useState(false)

  const signInHandler = async (e) => {
    e.preventDefault()

    let email = e.target[0].value
    let password = e.target[1].value
    
    if (email.length == 0 || password.length == 0) {
      setUserSuccess('Complete')
      return setTimeout(() => { setIsDisable(false) }, 6000)
    }
    // if (email.length < 10 || password.length < 7) {
    //   setUserSuccess('PasswordMin')
    //   return setTimeout(() => { setIsDisable(false) }, 6000)
    // }
    setIsDisable(true)
    const { error } = await signInWithEmail(email.trim(), password, setUserProfile)
    if (error) {
      setUserSuccess(error.message)
      setIsDisable(false)
    }
  }

  return (
    <div className='w-screen flex flex-col justify-center items-center p-5 '>
      <form className={`w-full max-w-[450px] space-y-4 shadow-2xl bg-white rounded-[20px] px-5 py-10`} onSubmit={!isDisable ? signInHandler : (e) => e.preventDefault()} >
        {/* <form className={`w-full max-w-[450px] space-y-4 border-[1px] border-white shadow-2xl shadow-white px-5 py-10`} onSubmit={!isDisable ? signInHandler : (e) => e.preventDefault()} > */}
        <h5 className="text-[18px] text-center text-gray-800" >Iniciar Sesión</h5>
        <div>
          <label htmlFor="email" className="block mb-2 text-[16px] text-left font-medium text-gray-800">Email</label>
          <Input type="email" name="email" id="email" className="bg-gray-50 border border-gray-300 text-gray-900 text-[16px] rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5    " placeholder="name@company.com" require />
        </div>
        <div>
          <label htmlFor="password" className="block mb-2 text-[16px] text-left  font-medium text-gray-800">Contraseña</label>
          <Input type="password" name="password" id="password" placeholder="••••••••" className="bg-gray-50 border border-gray-300 text-gray-900 text-[16px] rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5    " require />
        </div>
        <div className="flex items-start">
          <Link href='/Restablecer' className="ml-auto  text-[14px] text-gray-400 underline">Olvidaste tu contraseña?</Link>
        </div>
        <Button type="submit" theme="Primary">Iniciar Sesión</Button>
        <div className="text-[14px] text-center font-medium text-gray-800">No tienes una cuenta? <Link href="/SignUp" className="text-gray-400 underline">Registrate</Link ></div>
      </form>
    </div>
  )
}

