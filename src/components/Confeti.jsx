'use client'

import { useEffect, useState } from 'react'
import Confetti from 'react-confetti'

export default function Confeti() {
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updateSize = () => setSize({ width: window.innerWidth, height: window.innerHeight * 3 })
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  if (!size.width) return null
  return <Confetti {...size} numberOfPieces={800} recycle={false} tweenDuration={4000} />
}
