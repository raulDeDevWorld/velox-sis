'use client'

import { useRouter } from 'next/navigation';



function Home() {
    const router = useRouter()

    return (
        <div className='h-full w-full overflow-y-auto bg-slate-50 px-4 pb-10 pt-[94px] text-slate-700'>
            <nav className="w-screen fixed top-0 left-0 border-b border-gray-200 shadow-sm  flex items-center justify-between bg-[#00E2FF]  p-4 h-[70px] z-30" >

                <div
                    className='absolute top-0 left-0 w-full h-full flex flex-col justify-center items-center'
                    style={{
                        backgroundImage: 'url(/bg.jpeg)',
                        backgroundSize: 'cover',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        //  background: 'linear-gradient(0deg, #ffffff 50%, #00E2FF 50%)' 
                        backgroundColor: '#00E2FF'
                    }}></div>
                <div
                    className='absolute top-0 left-0 w-full h-full flex flex-col justify-center items-center'
                    style={{
                        background: ' #00E2FF80 50%'
                        //  background: 'linear-gradient(0deg, #ffffff80 50%, #00E2FF80 50%)' 
                    }}>
                </div>

                <div className='flex lg:block z-10' onClick={() => router.back()}>
                    <div className='flex '>
                        <button type="button" className="inline-flex items-center p-[2px] text-[14px] text-white rounded-lg  lg:block">
                            <svg width="19" height="34" viewBox="0 0 19 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17 32L2 17L17 2" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>                  </button>
                        <h1 className='ml-5 flex w-[240px] items-center justify-between text-[18px] font-medium text-white'> <img src="/logo.png" className='h-[50px]' alt="Lavavelox" /> </h1>
                    </div>
                </div>





            </nav>
            <article className='mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10'>
                <header className='border-b border-slate-200 pb-7 text-center'>
                    <p className='mb-3 inline-flex rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700'>Vigente desde el 01/01/2024</p>
                    <h1 className='text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl'>Políticas de privacidad y servicio</h1>
                    <p className='mx-auto mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base'>
                        Lavavelox S.A., empresa legalmente establecida y operadora de la aplicación web Lavavelox, informa mediante esta página sus políticas sobre los servicios y la recopilación, uso y divulgación de información personal de los usuarios.
                    </p>
                </header>

                <div className='mt-8 space-y-9 text-sm leading-7 sm:text-base'>
                    <section>
                        <h2 className='text-xl font-semibold text-slate-950'>Información que recopilamos</h2>
                        <p className='mt-2'>Al utilizar nuestra aplicación, podemos recopilar y procesar la siguiente información:</p>
                        <div className='mt-4 grid gap-4 sm:grid-cols-2'>
                            <div className='rounded-2xl bg-slate-50 p-5'>
                                <h3 className='font-semibold text-slate-900'>Identificación personal</h3>
                                <ul className='mt-2 list-disc space-y-1 pl-5'><li>Nombre completo.</li><li>Domicilio.</li><li>Número de Cédula de Identidad.</li></ul>
                            </div>
                            <div className='rounded-2xl bg-slate-50 p-5'>
                                <h3 className='font-semibold text-slate-900'>Información de contacto</h3>
                                <p className='mt-2'>Números de teléfono móvil, incluidos los números de WhatsApp.</p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className='text-xl font-semibold text-slate-950'>Uso de la información</h2>
                        <p className='mt-2'>La información recopilada se utiliza para los siguientes fines:</p>
                        <ul className='mt-3 space-y-3'>
                            <li><strong className='text-slate-900'>Proveer y mantener el servicio:</strong> utilizamos la información para ofrecer y mantener la funcionalidad de la aplicación.</li>
                            <li><strong className='text-slate-900'>Comunicación:</strong> podemos comunicarnos contigo y enviar mensajes relacionados con el servicio y sus actualizaciones.</li>
                            <li><strong className='text-slate-900'>Cumplimiento legal:</strong> podemos procesar la información para cumplir con obligaciones legales.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className='text-xl font-semibold text-slate-950'>Compartir información con terceros</h2>
                        <p className='mt-2'>No compartiremos tu información personal con terceros, excepto con tu consentimiento o con proveedores que trabajen en nuestro nombre y estén sujetos a obligaciones de confidencialidad.</p>
                    </section>

                    <section>
                        <h2 className='text-xl font-semibold text-slate-950'>Seguridad</h2>
                        <p className='mt-2'>Tomamos medidas razonables para proteger la información personal contra pérdidas, uso indebido y acceso no autorizado.</p>
                    </section>

                    <section className='rounded-2xl border border-cyan-100 bg-cyan-50/60 p-5 sm:p-6'>
                        <h2 className='text-xl font-semibold text-slate-950'>Servicios de lavandería</h2>
                        <ul className='mt-3 list-disc space-y-2 pl-5'>
                            <li>La orden de trabajo acredita el derecho del cliente para recoger sus prendas. Estas serán entregadas al portador, sin responsabilidad para la empresa.</li>
                            <li>No nos responsabilizamos por objetos dejados en las prendas de vestir.</li>
                            <li>No nos responsabilizamos por daños ocasionados durante la limpieza debido a la mala calidad de las telas o de la confección.</li>
                            <li>El cliente dispone de 30 días posteriores a la fecha de entrega acordada para recoger sus prendas.</li>
                            <li>Si una prenda no se recoge dentro de los 60 días posteriores a la fecha de entrega, quedará a disposición de la empresa como compensación por los gastos de producción.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className='text-xl font-semibold text-slate-950'>Cambios en la política</h2>
                        <p className='mt-2'>Esta política puede actualizarse ocasionalmente. Cualquier cambio será comunicado mediante la publicación de la nueva versión en esta página.</p>
                    </section>

                    <section className='border-t border-slate-200 pt-7'>
                        <h2 className='text-xl font-semibold text-slate-950'>Contacto</h2>
                        <p className='mt-2'>Si tienes preguntas sobre esta política de privacidad, puedes comunicarte con nosotros:</p>
                        <address className='mt-4 not-italic text-slate-600'>
                            <strong className='text-slate-900'>Lavavelox</strong><br />
                            Satélite, La Paz<br />
                            <a className='font-medium text-cyan-700 hover:underline' href='mailto:velox.lavanderia.2023@gmail.com'>velox.lavanderia.2023@gmail.com</a>
                        </address>
                        <p className='mt-5 text-sm text-slate-500'>Al utilizar la aplicación, aceptas las prácticas descritas en esta política.</p>
                    </section>
                </div>
            </article>
        </div>
    )
}

export default Home
