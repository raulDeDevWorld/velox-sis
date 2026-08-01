import { getBusinessDate, isBusinessDateToday } from './getDate.js'

function resolveVeloxType(pickupDate, manualVelox, date = new Date()) {
  if (!pickupDate || String(pickupDate).slice(0, 10) < getBusinessDate(date)) return null
  if (isBusinessDateToday(pickupDate, date)) return 'same_day'
  return manualVelox ? 'later' : null
}

export { resolveVeloxType }
