'use client'
import { useUser } from '@/context/Context'
import Button from '@/components/Button'
import { useRouter } from 'next/navigation';
// import { WithAuth } from '@/HOCs/WithAuth'




function Component({ children, userDB, user }) {

    const router = useRouter()

    const redirectHandler = (ref) => {
        router.push(ref)
    }
    return (
        userDB !== undefined && userDB !== null
            ?
            <div className="min-h-[92vh]  p-5">
               
                <div>hello world</div>
                {children}
                <br />
                <Button theme="Success" click={() => redirectHandler(`/${userDB.rol}`)}>Edita tu Perfil</Button>
            </div>
            : <div className="flex flex-col items-center justify-center p-5 h-[80vh]">
                <img src="/logo-circle.png" className='h-[100px] w-100px' alt="" />
                <br />
                <Button theme="Success" click={() => redirectHandler(`/${userDB.rol}`)}>Completa tu Perfil</Button>
            </div>
    )
}


export default Component


















// 'use client';

// import Button from '@/components/Button'

// import { useUser } from '@/context/Context.js'
// import { useRouter } from 'next/navigation';

// export default function Component({ children }) {

//     const { user, userDB, } = useUser()

//     const redirectHandler = (ref) => {
//         router.push(ref)
//     }

//     return (
        // userDB !== undefined && userDB !== null
        //     ?
            //  <div className="min-h-[92vh] bg-red-500 p-5">
            //     <br />
            //     <div className="flex justify-center">
            //         {/* <img className='h-[100px] w-[100px] rounded-full' src={userDB[0].url} alt="" /> */}
            //     </div>
            //     <br />
            //     <div>hello world</div>
            //     {children}
            //     <br />
            //     <Button theme="Success" click={() => redirectHandler(`/${userDB.rol}`)}>Edita tu Perfil</Button>
            // </div>
            // : <div className="flex flex-col items-center justify-center bg-blue-800 p-5 h-[80vh]">
            //     <img src="/logo-circle.png" alt="" />
            //     <br />
            //     <Button theme="Success" click={() => redirectHandler(`/${userDB.rol}`)}>Completa tu Perfil</Button>
            // </div>
//     )
// }

