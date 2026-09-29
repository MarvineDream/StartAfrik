import { PrismaClient, SystemRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const permissions = ['agency:read','agency:create','agency:update','agency:delete','branch:read','branch:create','branch:update','branch:delete','user:read','user:create','user:update','user:delete','role:read','permission:read','audit:read','vehicle:read','vehicle:create','vehicle:update','vehicle:delete','dashboard:platform','dashboard:agency','dashboard:branch']
const rolePermissions: Record<SystemRole, string[]> = {
  SUPER_ADMIN: permissions,
  AGENCY_ADMIN: ['agency:read','agency:update','branch:create','branch:read','branch:update','branch:delete','user:create','user:read','user:update','user:delete','role:read','permission:read','audit:read','vehicle:read','vehicle:create','vehicle:update','vehicle:delete','dashboard:agency'],
  BRANCH_ADMIN: ['branch:read','branch:update','user:create','user:read','user:update','vehicle:read','vehicle:create','vehicle:update','vehicle:delete','dashboard:branch'],
  BRANCH_AGENT: ['branch:read','user:read','vehicle:read','dashboard:branch'],
  DRIVER: ['branch:read','vehicle:read','dashboard:branch'],
}
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email) throw new Error('SEED_ADMIN_EMAIL is required')
  if (!password) throw new Error('SEED_ADMIN_PASSWORD is required')
  const rows = await Promise.all(permissions.map((code) => prisma.permission.upsert({ where: { code }, update: {}, create: { code } })))
  const byCode = new Map(rows.map((row) => [row.code, row.id]))
  for (const [systemRole, codes] of Object.entries(rolePermissions) as [SystemRole, string[]][]) {
    const role = await prisma.role.upsert({ where: { name: systemRole }, update: { systemRole }, create: { name: systemRole, systemRole } })
    for (const code of codes) await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: byCode.get(code)! } }, update: {}, create: { roleId: role.id, permissionId: byCode.get(code)! } })
  }
  const role = await prisma.role.findUniqueOrThrow({ where: { name: 'SUPER_ADMIN' } })
  await prisma.user.upsert({ where: { email: email.toLowerCase() }, update: {}, create: { firstName: 'Admin', lastName: 'StartAfrik', email: email.toLowerCase(), passwordHash: await bcrypt.hash(password, 12), roleId: role.id } })
}
main().finally(() => prisma.$disconnect())
