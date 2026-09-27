import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../config/prisma'
import { env } from '../config/env'

export type RequestIdentity = { userId: string; role: string; agencyId: string | null; branchId: string | null; permissions: string[] }
declare global { namespace Express { interface Request { identity?: RequestIdentity; scope?: { agencyId?: string; branchId?: string } } } }

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.get('authorization')
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'UNAUTHENTICATED' })
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET) as jwt.JwtPayload & { sub?: string }
    const userId = typeof payload.sub === 'string' ? payload.sub : undefined
    const user = userId ? await prisma.user.findUnique({ where: { id: userId }, include: { role: { include: { permissions: { include: { permission: true } } } } } }) : null
    if (!user || user.status !== 'ACTIVE') return res.status(401).json({ error: 'ACCOUNT_INACTIVE' })
    req.identity = { userId: user.id, role: user.role.systemRole ?? user.role.name, agencyId: user.agencyId, branchId: user.branchId, permissions: user.role.permissions.map((item) => item.permission.code) }
    next()
  } catch { return res.status(401).json({ error: 'INVALID_ACCESS_TOKEN' }) }
}
