'use client'

import { useUser } from '@/context/Context'

function App() {

    const { user, userDB, whatsapp, setWhatsapp, whatsappMSG, setWhatsappMSG } = useUser()

    const whatsappHandler = () => {
        setWhatsapp(!whatsapp)
    }
    const onChangeWhatsapp = (e) => {
        setWhatsappMSG(e.target.value)
    }
    const handlerSendWhatsapp = (e) => {
        const whats = whatsappMSG.replaceAll(' ', '%20')
        window.open(`https://api.whatsapp.com/send?phone=${'+59169941749'}&text=${whats}`, '_blank')
    }
    return (
        <div className={`fixed w-[90%] max-w-[400px] h-[250px] right-[20px] pt-14 pb-[50px] px-2 flex flex-grow flex-col justify-end rounded-[10px] border-gray-200 shadow bg-[#F1E6E0] z-40 transition-all ${whatsapp ? 'bottom-[80px]' : 'bottom-[-100vw]'}`} >
            <div className='absolute top-0 left-0  w-full h-[50px] bg-[#00826A] rounded-t-[10px]'>
                <img src="/logo-circle.png" className='absolute h-[35px] w-[35px] left-[5px] top-[7.5px]  rounded-[35px]' alt="" />
                <div className='absolute flex flex-col left-[50px] top-[12px] text-white text-[14px]'>
                    <span className='block text-[14px] m-0'>Precio Justo</span>
                    <span className='text-[8px] m-0'>en linea</span>
                </div>
                <span className='absolute  right-[10px] top-[12px] px-[7.5px] py-[3px]  border-[1px] text-white text-[14px] rounded-[5px]' onClick={whatsappHandler} >X</span>
            </div>
            <div
                className="ml-auto rounded-lg rounded-tr-none m-1 p-2 text-[14px] bg-[#DEF5D4] flex flex-col relative speech-bubble-right">
                <p className="text-[14px]">Hola...?</p>
                <p className="text-gray-600 text-[10px] text-right leading-none">{new Date().getHours()}:{new Date().getMinutes()}</p>
            </div>
            <div className="mr-auto rounded-lg rounded-tl-none m-1 p-2 text-[14px] bg-white flex flex-col relative speech-bubble-left">
                <p className="text-[14px]">Hola q tal, dinos en q podemos <br /> ayudarte...</p>
                <p className="text-gray-600 text-[10px] text-right leading-none">{new Date().getHours()}:{new Date().getMinutes()}</p>
            </div>
            <div className='grid absolute w-full left-0 bottom-0 p-2 gap-2' style={{ gridTemplateColumns: 'auto 35px' }}>
                <textarea type="text" className=' w-full text-[14px] rounded-[20px] outline-none px-[10px] py-[10px]   resize-none' rows={1} onChange={onChangeWhatsapp} />
                <span className='w-[35px] bg-[#00826A] rounded-[20px] p-[5px]' onClick={handlerSendWhatsapp}>
                    <svg width="28" height="28" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2.72391 2.05294C2.63778 2.0098 2.54103 1.99246 2.44528 2.003C2.34953 2.01355 2.25887 2.05152 2.18419 2.11236C2.10951 2.17321 2.05399 2.25432 2.02432 2.34597C1.99464 2.43761 1.99207 2.53587 2.01691 2.62894L3.51491 8.24694C3.53966 8.33958 3.59053 8.42315 3.66145 8.48769C3.73237 8.55223 3.82035 8.59501 3.91491 8.61094L10.7699 9.75294C11.0489 9.79994 11.0489 10.1999 10.7699 10.2469L3.91591 11.3889C3.82117 11.4047 3.73297 11.4474 3.66186 11.5119C3.59075 11.5765 3.53973 11.6602 3.51491 11.7529L2.01691 17.3709C1.99207 17.464 1.99464 17.5623 2.02432 17.6539C2.05399 17.7456 2.10951 17.8267 2.18419 17.8875C2.25887 17.9484 2.34953 17.9863 2.44528 17.9969C2.54103 18.0074 2.63778 17.9901 2.72391 17.9469L17.7239 10.4469C17.8069 10.4054 17.8766 10.3415 17.9253 10.2626C17.9741 10.1837 17.9999 10.0927 17.9999 9.99994C17.9999 9.90716 17.9741 9.81622 17.9253 9.73728C17.8766 9.65833 17.8069 9.59451 17.7239 9.55294L2.72391 2.05294Z" fill="white" />
                    </svg>

                </span>
            </div>
        </div>
    )
}
export default App;


