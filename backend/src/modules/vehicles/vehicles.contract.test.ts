import assert from 'node:assert/strict'
import test, { after, before, describe } from 'node:test'
import bcrypt from 'bcryptjs'
import type { AddressInfo } from 'node:net'
import { app } from '../../app'
import { prisma } from '../../config/prisma'

const hasDatabase = Boolean(process.env.DATABASE_URL)
const password = 'VehicleTestPassword123!'
let server: ReturnType<typeof app.listen>
let baseUrl = ''
const ids: string[] = []
const users = new Map<string, { token: string; id: string }>()
const vehicles = new Map<string, string>()

const request = async (user: string | undefined, path: string, init: RequestInit = {}) => fetch(`${baseUrl}${path}`, {
  ...init,
  headers: { 'content-type': 'application/json', ...(user ? { authorization: `Bearer ${users.get(user)!.token}` } : {}), ...(init.headers ?? {}) },
})
const body = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({ agencyId: ids[0], branchId: ids[2], registrationNumber: `GA-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, brand: 'Toyota', model: 'Coaster', year: 2022, color: 'White', vehicleType: 'BUS', seatCapacity: 30, status: 'ACTIVE', ...overrides })

const suite = hasDatabase ? describe : describe.skip
suite('Vehicle API contract', () => {
  before(async () => { await new Promise<void>((resolve) => { server = app.listen(0, () => { baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`; resolve() }) })
  before(async () => {
    const agencyA = await prisma.agency.create({ data: { name: 'Vehicle Test Agency A', email: `vehicle-a-${Date.now()}@test.local` } }); ids.push(agencyA.id)
    const agencyB = await prisma.agency.create({ data: { name: 'Vehicle Test Agency B', email: `vehicle-b-${Date.now()}@test.local` } }); ids.push(agencyB.id)
    const branchA = await prisma.branch.create({ data: { agencyId: agencyA.id, name: 'Branch A', code: `VA${Date.now()}` } }); ids.push(branchA.id)
    const branchB = await prisma.branch.create({ data: { agencyId: agencyB.id, name: 'Branch B', code: `VB${Date.now()}` } }); ids.push(branchB.id)
    const permissionCodes = ['vehicle:read', 'vehicle:create', 'vehicle:update', 'vehicle:delete']
    const permissions = await Promise.all(permissionCodes.map((code) => prisma.permission.upsert({ where: { code }, update: {}, create: { code } })))
    const roles: Record<string, { id: string; codes: string[] }> = {}
    for (const [name, codes] of Object.entries({ SUPER_ADMIN: permissionCodes, AGENCY_ADMIN: permissionCodes, BRANCH_ADMIN: permissionCodes, BRANCH_AGENT: ['vehicle:read'], DRIVER: ['vehicle:read'] })) {
      const role = await prisma.role.create({ data: { name: `VEHICLE_TEST_${name}`, systemRole: name as never, permissions: { create: codes.map((code) => ({ permission: { connect: { id: permissions.find((p) => p.code === code)!.id } } })) } } })
      roles[name] = { id: role.id, codes }
      ids.push(role.id)
    }
    for (const [name, agencyId, branchId] of [['SUPER_ADMIN', null, null], ['AGENCY_ADMIN', agencyA.id, null], ['BRANCH_ADMIN', agencyA.id, branchA.id], ['BRANCH_AGENT', agencyA.id, branchA.id], ['DRIVER', agencyA.id, branchA.id]] as const) {
      const user = await prisma.user.create({ data: { firstName: name, lastName: 'Tester', email: `vehicle-${name.toLowerCase()}-${Date.now()}@test.local`, passwordHash: await bcrypt.hash(password, 4), roleId: roles[name].id, agencyId, branchId } })
      ids.push(user.id)
      const login = await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: user.email, password }) })
      assert.equal(login.status, 200)
      users.set(name, { id: user.id, token: (await login.json()).accessToken })
    }
    const a = await prisma.vehicle.create({ data: body({ agencyId: agencyA.id, branchId: branchA.id, registrationNumber: 'VEHICLE-TEST-A' }) as never })
    const b = await prisma.vehicle.create({ data: body({ agencyId: agencyB.id, branchId: branchB.id, registrationNumber: 'VEHICLE-TEST-B' }) as never })
    vehicles.set('A', a.id); vehicles.set('B', b.id)
  })
  after(async () => { server?.close(); await prisma.auditLog.deleteMany({ where: { user: { email: { contains: 'vehicle-' } } } }); await prisma.vehicle.deleteMany({ where: { registrationNumber: { in: ['VEHICLE-TEST-A', 'VEHICLE-TEST-B'] } } }); await prisma.user.deleteMany({ where: { id: { in: ids } } }); await prisma.role.deleteMany({ where: { id: { in: ids } } }); await prisma.branch.deleteMany({ where: { id: { in: ids } } }); await prisma.agency.deleteMany({ where: { id: { in: ids } } }); await prisma.$disconnect() })

  test('rejects missing and invalid authentication', async () => { assert.equal((await request(undefined, '/api/vehicles')).status, 401); assert.equal((await request(undefined, '/api/vehicles', { headers: { authorization: 'Bearer invalid' } })).status, 401) })
  test('enforces role permissions', async () => { assert.equal((await request('SUPER_ADMIN', '/api/vehicles')).status, 200); assert.equal((await request('AGENCY_ADMIN', '/api/vehicles', { method: 'POST', body: JSON.stringify(body()) })).status, 201); for (const role of ['BRANCH_AGENT', 'DRIVER']) for (const method of ['POST', 'PATCH', 'DELETE']) assert.equal((await request(role, method === 'POST' ? '/api/vehicles' : `/api/vehicles/${vehicles.get('A')}`, { method, body: JSON.stringify(body()) })).status, 403) })
  test('isolates agencies and branches for reads and filters', async () => { for (const role of ['AGENCY_ADMIN', 'BRANCH_ADMIN', 'BRANCH_AGENT']) { assert.equal((await request(role, `/api/vehicles/${vehicles.get('A')}`)).status, 200); assert.equal((await request(role, `/api/vehicles/${vehicles.get('B')}`)).status, 403); const list = await (await request(role, '/api/vehicles')).json(); assert.equal(list.data.some((v: { id: string }) => v.id === vehicles.get('B')), false); assert.equal((await request(role, `/api/vehicles?branchId=${ids[3]}`)).status, 403) } })
  test('rejects cross-tenant agency/branch combinations', async () => { assert.equal((await request('AGENCY_ADMIN', '/api/vehicles', { method: 'POST', body: JSON.stringify(body({ branchId: ids[3] })) })).status, 403); assert.equal((await request('AGENCY_ADMIN', `/api/vehicles/${vehicles.get('A')}`, { method: 'PATCH', body: JSON.stringify({ agencyId: ids[0], branchId: ids[3] }) })).status, 403) })
  test('performs CRUD and records audit entries', async () => { const created = await request('AGENCY_ADMIN', '/api/vehicles', { method: 'POST', body: JSON.stringify(body()) }); assert.equal(created.status, 201); const item = await created.json(); assert.equal((await request('AGENCY_ADMIN', `/api/vehicles/${item.id}`)).status, 200); const updated = await request('AGENCY_ADMIN', `/api/vehicles/${item.id}`, { method: 'PATCH', body: JSON.stringify({ brand: 'Updated' }) }); assert.equal(updated.status, 200); assert.equal((await updated.json()).brand, 'Updated'); assert.equal((await prisma.auditLog.count({ where: { entity: 'Vehicle', entityId: item.id, action: { in: ['CREATE_VEHICLE', 'UPDATE_VEHICLE'] } } })), 2); assert.equal((await request('AGENCY_ADMIN', `/api/vehicles/${item.id}`, { method: 'DELETE' })).status, 204); assert.equal((await prisma.vehicle.findUnique({ where: { id: item.id } })), null); assert.equal((await prisma.auditLog.count({ where: { entity: 'Vehicle', entityId: item.id, action: 'DELETE_VEHICLE' } })), 1) })
  test('returns validation errors and duplicate conflicts', async () => { for (const value of [{ registrationNumber: 'x' }, { registrationNumber: 'x'.repeat(31) }, { brand: '' }, { model: '' }, { year: 1899 }, { year: new Date().getFullYear() + 2 }, { seatCapacity: 0 }, { seatCapacity: 201 }, { vehicleType: 'INVALID' }, { status: 'INVALID' }, { agencyId: undefined }, { branchId: undefined }, { unknown: true }]) { const payload = body(value); if (value.agencyId === undefined) delete payload.agencyId; if (value.branchId === undefined) delete payload.branchId; assert.equal((await request('AGENCY_ADMIN', '/api/vehicles', { method: 'POST', body: JSON.stringify(payload) })).status, 422) } assert.equal((await request('AGENCY_ADMIN', '/api/vehicles', { method: 'POST', body: JSON.stringify(body({ registrationNumber: 'VEHICLE-TEST-A' })) })).status, 409) })
})

describe('Vehicle API database prerequisite', () => { test('reports the suite is blocked when DATABASE_URL is unavailable', { skip: hasDatabase }, () => { assert.fail('BLOCKED — DATABASE_URL unavailable') }) })
})
