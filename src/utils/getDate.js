const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const BUSINESS_TIME_ZONE = 'America/La_Paz'
const pad = value => String(value).padStart(2, '0')

function getDayMonthYearHour(date = new Date()) {
  const hours = date.getHours()
  return `${pad(hours)}:${pad(date.getMinutes())} ${hours >= 12 ? 'pm' : 'am'} ${date.getDate()}-${MONTH_NAMES[date.getMonth()]}-${date.getFullYear()}`
}

function getDayMonthYearHourPluss3(date = new Date()) {
  const deliveryDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 3)
  return `${deliveryDate.getFullYear()}-${pad(deliveryDate.getMonth() + 1)}-${pad(deliveryDate.getDate())}`
}

function getDayMonthYear(date = new Date()) {
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`
}

function getBusinessDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function isBusinessDateToday(value, date = new Date()) {
  return String(value || '').slice(0, 10) === getBusinessDate(date)
}

function getMonthYear(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

function formatDayMonthYear(inputDate) {
  const [year, month, day] = inputDate.split('-')
  return `${day}-${MONTH_NAMES[Number(month) - 1]}-${year}`
}

function formatDayMonthYearInput(inputDate) {
  const [day, monthName, year] = inputDate.split('-')
  const month = MONTH_NAMES.indexOf(monthName) + 1
  if (!month) throw new Error(`Mes invalido: ${monthName}`)
  return `${year}-${pad(month)}-${pad(day)}`
}

export {
  BUSINESS_TIME_ZONE,
  getBusinessDate,
  getDayMonthYearHour,
  getDayMonthYear,
  getMonthYear,
  formatDayMonthYear,
  formatDayMonthYearInput,
  getDayMonthYearHourPluss3,
  isBusinessDateToday
}
