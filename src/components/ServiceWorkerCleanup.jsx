'use client'

import { useEffect } from 'react'

export default function ServiceWorkerCleanup() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => registration.unregister())
    })

    if ('caches' in window) {
      caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))))
    }
  }, [])

  return null
}
