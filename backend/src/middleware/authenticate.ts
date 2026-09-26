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
    const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET) as jwt.JwtPayload & { userId: string }
    const user = await prisma.user.findUnique({ where: { id: payload.userId }, include: { role: { include: { permissions: { include: { permission: true } } } } } })
    if (!user || user.status !== 'ACTIVE') return res.status(401).json({ error: 'ACCOUNT_INACTIVE' })
    req.identity = { userId: user.id, role: user.role.systemRole ?? user.role.name, agencyId: user.agencyId, branchId: user.branchId, permissions: user.role.permissions.map((item) => item.permission.code) }
    next()
  } catch { return res.status(401).json({ error: 'INVALID_ACCESS_TOKEN' }) }
}
