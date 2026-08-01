import test from 'node:test'
import assert from 'node:assert/strict'

import { generateUUID } from '../src/utils/UIDgenerator.js'
import { createTicketSize, estimateTextLines, textBlockHeight } from '../src/utils/pdfTicketSize.js'
import { assignedBranchId, canAccessRoute, canViewAllBranchReports, hasCapability, homeRouteForRole } from '../src/utils/roleAccess.js'
import {
  formatDayMonthYear,
  formatDayMonthYearInput,
  getBusinessDate,
  getDayMonthYear,
  getDayMonthYearHourPluss3,
  getMonthYear,
  isBusinessDateToday
} from '../src/utils/getDate.js'
import { resolveVeloxType } from '../src/utils/velox.js'

test('generateUUID returns a valid RFC 4122 v4 UUID', () => {
  assert.match(generateUUID(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
})

test('date helpers format dates without zero-based indexing errors', () => {
  const date = new Date(2026, 10, 9, 8, 5)
  assert.equal(getDayMonthYear(date), '09-11-2026')
  assert.equal(getMonthYear(date), '2026-11')
  assert.equal(formatDayMonthYear('2026-11-09'), '09-Nov-2026')
  assert.equal(formatDayMonthYearInput('09-Nov-2026'), '2026-11-09')
})

test('delivery date adds three calendar days across month boundaries', () => {
  assert.equal(getDayMonthYearHourPluss3(new Date(2026, 0, 30)), '2026-02-02')
})

test('business date comparisons use the Bolivia calendar day', () => {
  const instant = new Date('2026-07-24T02:30:00.000Z')
  assert.equal(getBusinessDate(instant), '2026-07-23')
  assert.equal(isBusinessDateToday('2026-07-23', instant), true)
  assert.equal(isBusinessDateToday('2026-07-24', instant), false)
})

test('Velox type is automatic today, manual later, and unavailable in the past', () => {
  const instant = new Date('2026-07-24T02:30:00.000Z') // 23 de julio en Bolivia
  assert.equal(resolveVeloxType('2026-07-23', false, instant), 'same_day')
  assert.equal(resolveVeloxType('2026-07-24', false, instant), null)
  assert.equal(resolveVeloxType('2026-07-24', true, instant), 'later')
  assert.equal(resolveVeloxType('2026-07-22', true, instant), null)
})

test('PDF ticket sizing grows with wrapped content while preserving 80 mm width', () => {
  const shortLines = estimateTextLines('Camisa', 60, 7)
  const longLines = estimateTextLines('Camisa de vestir con una observación suficientemente extensa', 60, 7)

  assert.equal(shortLines, 1)
  assert.ok(longLines > shortLines)
  assert.ok(textBlockHeight('texto largo '.repeat(10), 60, 7) > textBlockHeight('corto', 60, 7))

  const shortTicket = createTicketSize(250, { minimumHeight: 260 })
  const longTicket = createTicketSize(400, { minimumHeight: 260 })
  assert.equal(shortTicket[0], 227)
  assert.equal(shortTicket[0], longTicket[0])
  assert.ok(longTicket[1] > shortTicket[1])
})

test('customer role only accesses customer-facing routes', () => {
  assert.equal(canAccessRoute('Cliente', '/Pendientes'), true)
  assert.equal(canAccessRoute('Cliente', '/Dashboard'), false)
  assert.equal(canAccessRoute('Cliente', '/Personal'), false)
  assert.equal(canAccessRoute('Admin', '/Dashboard'), true)
  assert.equal(homeRouteForRole('Cliente'), '/Pendientes')
})

test('personal only accesses branch operations', () => {
  assert.equal(canAccessRoute('Personal', '/Dashboard'), true)
  assert.equal(canAccessRoute('Personal', '/Pendientes'), true)
  assert.equal(canAccessRoute('Personal', '/'), true)
  assert.equal(canAccessRoute('Personal', '/Sucursales'), false)
  assert.equal(canAccessRoute('Personal', '/Clientes'), false)
  assert.equal(canAccessRoute('Personal', '/Personal'), false)
  assert.equal(canAccessRoute('Personal', '/Servicios'), false)
  assert.equal(canAccessRoute('Personal', '/DataApp'), false)
  assert.equal(canAccessRoute('Personal', '/Reportes'), false)
})

test('only administrators can view reports from every branch', () => {
  assert.equal(canViewAllBranchReports('Admin'), true)
  assert.equal(canViewAllBranchReports(' admin '), true)
  assert.equal(canViewAllBranchReports('Personal'), false)
  assert.equal(canViewAllBranchReports('Cliente'), false)
  assert.equal(canViewAllBranchReports(undefined), false)
  assert.equal(assignedBranchId({ 'sucursal uuid': 'branch-1' }), 'branch-1')
  assert.equal(assignedBranchId({ primary_branch_id: 'branch-2' }), 'branch-2')
})

test('personal capabilities are restricted to branch operations', () => {
  assert.equal(hasCapability('Personal', 'dashboard:branch'), true)
  assert.equal(hasCapability('Personal', 'orders:manage'), true)
  assert.equal(hasCapability('Personal', 'dashboard:all'), false)
  assert.equal(hasCapability('Personal', 'people:manage'), false)
  assert.equal(hasCapability('Personal', 'catalog:manage'), false)
  assert.equal(hasCapability('Personal', 'settings:manage'), false)
})
