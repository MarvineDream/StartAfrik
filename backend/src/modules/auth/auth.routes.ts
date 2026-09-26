import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../config/prisma'
import { env } from '../../config/env'
import { authenticate } from '../../middleware/authenticate'
import { getAuthUser, hashToken, issueSession, refreshCookie, revokeFamily, verifyPassword } from './auth.service'

const router = Router()
const credentials = z.object({ email: z.string().email(), password: z.string().min(8).max(128) })
const cookieOptions = { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax' as const, maxAge: 7 * 24 * 60 * 60 * 1000 }
router.post('/login', async (req, res, next) => { try {
  const input = credentials.parse(req.body); const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } }); const valid = user ? await verifyPassword(input.password, user.passwordHash) : false
  if (!user || !valid || user.status !== 'ACTIVE') { if (user) await prisma.auditLog.create({ data: { userId: user.id, agencyId: user.agencyId, branchId: user.branchId, action: 'LOGIN_FAILED', entity: 'User', entityId: user.id, ipAddress: req.ip, userAgent: req.get('user-agent') } }); return res.status(401).json({ error: 'INVALID_CREDENTIALS' }) }
  const session = await issueSession(user.id); await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }); await prisma.auditLog.create({ data: { userId: user.id, agencyId: user.agencyId, branchId: user.branchId, action: 'LOGIN', entity: 'User', entityId: user.id, ipAddress: req.ip, userAgent: req.get('user-agent') } }); res.cookie(refreshCookie, session.refreshToken, cookieOptions); res.json({ user: session.identity, accessToken: session.accessToken })
} catch (error) { next(error) } })
router.post('/refresh', async (req, res) => { const raw = req.cookies[refreshCookie]; if (!raw) return res.status(401).json({ error: 'REFRESH_TOKEN_REQUIRED' }); const record = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(raw) } }); if (!record || record.expiresAt <= new Date()) return res.status(401).json({ error: 'REFRESH_TOKEN_INVALID' }); if (record.revokedAt) { await revokeFamily(record.familyId); return res.status(401).json({ error: 'REFRESH_TOKEN_INVALID' }) }; await prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } }); const session = await issueSession(record.userId, record.familyId); res.cookie(refreshCookie, session.refreshToken, cookieOptions); res.json({ user: session.identity, accessToken: session.accessToken }) })
router.post('/logout', async (req, res, next) => { try { const raw = req.cookies[refreshCookie]; if (raw) { const record = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(raw) } }); if (record) await revokeFamily(record.familyId) }; res.clearCookie(refreshCookie); if (req.identity) await prisma.auditLog.create({ data: { userId: req.identity.userId, agencyId: req.identity.agencyId, branchId: req.identity.branchId, action: 'LOGOUT', entity: 'User', entityId: req.identity.userId, ipAddress: req.ip, userAgent: req.get('user-agent') } }); res.status(204).send() } catch (error) { next(error) } })
router.get('/me', authenticate, async (req, res, next) => { try { res.json({ user: await getAuthUser(req.identity!.userId) }) } catch (error) { next(error) } })
export { router as authRouter }
