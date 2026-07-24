'use client';

import { useUser } from '@/context/Context.js'
// import { useEffect, useState, useRef } from 'react'


export default function VideoClient({ theme, click, children }) {

  const { videoClientRef, introClientVideo, setIntroClientVideo, soundClient, setSoundClient } = useUser()


  const handlerPlay = () => {
    if (introClientVideo === true) {
      videoClientRef.current.pause()
      videoClientRef.current.currentTime = 0
      setIntroClientVideo(false)
    } else {
      setIntroClientVideo(true)

      videoClientRef.current.play()
      videoClientRef.current.currentTime = 0

      setSoundClient(true)

    }
    videoClientRef.current.muted = false
  };

  const handlerSound = () => {
    videoClientRef.current.play()
    setSoundClient(true)
    videoClientRef.current.muted = false
  };
  const handlerRepeat = () => {
    setIntroClientVideo(true)
    videoClientRef.current.currentTime = 0
    videoClientRef.current.play()
    // setPlay(true)
    // setSound(true)
    videoClientRef.current.muted = false
  };



  return (
    <div className={`fixed  w-[75%] lg:w-full z-40   right-0 transition transition-all lg:hidden ${introClientVideo ? 'bottom-[65px] ' : 'bottom-[-100vh]'}`}>
      <div className='z-30 absolute px-5 top-[-50px] h-[20px]  w-full'>
        {introClientVideo && <div className='flex'>
          <span className='z-50 absolute flex justify-center items-center top-[0px] right-[15px] bg-gray-800 border-[2px] border-gray-50 w-[150px] text-[white] text-center text-[16px] py-3 rounded-full' onClick={handlerPlay}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.4531 2.72656L12.7266 0H10.4531L13.1797 2.72656H15.4531ZM0.910156 0H0V2.72656H3.63672L0.910156 0ZM9.54687 2.72656L6.81641 0H4.54297L7.26953 2.72656H9.54687ZM16.3633 6.36328H12.7266L15.4531 3.63672H13.1797L10.4531 6.36328H6.81641L9.54297 3.63672H7.26953L4.54297 6.36328H0.910156L3.63672 3.63672H0V18.1836C0 19.1836 0.816406 20 1.81641 20H18.1797C19.1836 20 19.9961 19.1836 19.9961 18.1836V3.63672H19.0859L16.3633 6.36328ZM7.27344 17.2734V9.08984L14.5469 13.1797L7.27344 17.2734ZM16.3633 0L19.0898 2.72656H20V0H16.3633Z" fill="white" />
            </svg>
            <span className='pl-5 text-medium'>{introClientVideo ? 'Cerrar' : 'Ver video'}</span>
          </span>


          {soundClient == false
            ? <span className='relative flex  items-center justify-center z-50 bg-gray-800 w-[50px] text-[white] border-[2px] border-gray-50  text-center text-[16px] py-3 rounded-full' onClick={handlerSound}>
              <svg width="30" height="30" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.2734 10C15.2734 8.61328 14.4258 7.42578 13.2227 6.92578L12.582 8.46484C13.1836 8.71484 13.6055 9.30859 13.6055 10.0039C13.6055 10.6953 13.1836 11.2891 12.582 11.543L13.2227 13.082C14.4258 12.5742 15.2734 11.3867 15.2734 10ZM14.5039 3.84766L13.8633 5.38672C15.6719 6.14062 16.9414 7.92187 16.9414 10C16.9414 12.082 15.6719 13.8594 13.8633 14.6133L14.5039 16.1523C16.9141 15.1484 18.6055 12.7734 18.6055 10C18.6055 7.22656 16.9141 4.85156 14.5039 3.84766ZM1.94141 5.83203V14.1641H5.27344L11.1055 20V0L5.27344 5.83203H1.94141Z" fill="white" />
              </svg>
              <span className='absolute bg-gray-50 border-x-[1px] border-gray-800 transform rotate-45 w-[4px] h-full'></span>
            </span>
            : <span className='relative flex  items-center justify-center z-50 bg-gray-800 w-[50px] text-[white] border-[2px] border-gray-50  text-center text-[16px] py-3 rounded-full' onClick={handlerRepeat}>
              <svg width="25" height="25" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <mask id="mask0_512_475" style={{maskType:'luminance'}} maskUnits="userSpaceOnUse" x="0" y="0" width="40" height="40">
                  <path d="M17 20V14L22 17L27 20L22 23L17 26V20Z" fill="white" stroke="white" strokeWidth="4" strokeLinejoin="round" />
                  <path d="M7.272 32.728C8.9416 34.402 10.9256 35.7295 13.1099 36.6342C15.2942 37.539 17.6357 38.0031 20 38C29.941 38 38 29.941 38 20C38 10.059 29.941 2 20 2C15.03 2 10.53 4.015 7.272 7.272C5.614 8.93 2 13 2 13" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 5V13H10" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                </mask>
                <g mask="url(#mask0_512_475)">
                  <path d="M-4 -4H44V44H-4V-4Z" fill="white" />
                </g>
              </svg>
            </span>
          }

        </div>}

      </div>

      <div className={`video-player lg:bg-transparent w-full lg:w-[300px] rounded-[20px] ${introClientVideo === true ? 'left-0 right-0 mx-auto' : 'left-[-200vw]'}`} >
        <video ref={videoClientRef} className='rounded-[20px]' autoPlay muted>
          <source src="/introClient.mp4" type="video/mp4" />
        </video>
      </div>

    </div>
  )
}



