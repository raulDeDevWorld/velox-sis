import { getBusinessDate, isBusinessDateToday } from './getDate.js'

const nextBusinessDate = (date = new Date()) => {
  const [year, month, day] = getBusinessDate(date).split('-').map(Number)
  const tomorrow = new Date(Date.UTC(year, month - 1, day + 1))
  return tomorrow.toISOString().slice(0, 10)
}

function isAutomaticVelox(pickupDate, pickupTime = '19:00', date = new Date()) {
  const normalizedDate = String(pickupDate || '').slice(0, 10)
  if (isBusinessDateToday(normalizedDate, date)) return true
  return normalizedDate === nextBusinessDate(date)
    && String(pickupTime || '19:00').slice(0, 5) <= '12:00'
}

function resolveVeloxType(pickupDate, pickupTime, manualVelox, date = new Date()) {
  if (!pickupDate || String(pickupDate).slice(0, 10) < getBusinessDate(date)) return null
  if (isBusinessDateToday(pickupDate, date)) return 'same_day'
  if (isAutomaticVelox(pickupDate, pickupTime, date)) return 'later'
  return manualVelox ? 'later' : null
}

export { isAutomaticVelox, nextBusinessDate, resolveVeloxType }
