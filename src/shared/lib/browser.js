'use client'

export const canUseDOM = () => typeof window !== 'undefined' && typeof document !== 'undefined'

export function getCurrentHash() {
  return canUseDOM() ? window.location.hash : ''
}
