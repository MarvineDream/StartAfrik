import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../../config/prisma'
import { env } from '../../config/env'

export const refreshCookie = 'startafrik_refresh_token'
export const hashPassword = (value: string) => bcrypt.hash(value, 12)
export const verifyPassword = (value: string, hash: string) => bcrypt.compare(value, hash)
export const hashToken = (value: string) => crypto.createHash('sha256').update(value).digest('hex')

export type AuthUser = { id: string; email: string; firstName: string; lastName: string; role: string; agencyId: string | null; branchId: string | null }
const userSelect = { id: true, email: true, firstName: true, lastName: true, agencyId: true, branchId: true, role: { select: { name: true } } } as const
export async function getAuthUser(userId: string): Promise<AuthUser> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: userSelect })
  return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, agencyId: user.agencyId, branchId: user.branchId, role: user.role.name }
}
export function signAccessToken(user: AuthUser) { return jwt.sign({ sub: user.id }, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'] }) }
export async function issueSession(userId: string, familyId: string = crypto.randomUUID()) {
  const identity = await getAuthUser(userId)
  const refreshToken = crypto.randomBytes(48).toString('hex')
  await prisma.refreshToken.create({ data: { userId, tokenHash: hashToken(refreshToken), familyId, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } })
  return { accessToken: signAccessToken(identity), refreshToken, identity, familyId }
}
export async function revokeFamily(familyId: string) { await prisma.refreshToken.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: new Date() } }) }
