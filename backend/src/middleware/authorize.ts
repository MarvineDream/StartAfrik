import { NextFunction, Request, Response } from 'express'
export const authorize = (...required: string[]) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.identity || !required.every((permission) => req.identity!.permissions.includes(permission))) return res.status(403).json({ error: 'FORBIDDEN' })
  next()
}

export function tenantScope(req: Request, res: Response, next: NextFunction) {
  const identity = req.identity
  if (!identity) return res.status(401).json({ error: 'UNAUTHENTICATED' })
  req.scope = identity.role === 'SUPER_ADMIN' ? {} : identity.branchId ? { agencyId: identity.agencyId!, branchId: identity.branchId } : { agencyId: identity.agencyId! }
  next()
}
export function canAccessAgency(req: Request, agencyId: string) { return req.identity?.role === 'SUPER_ADMIN' || req.identity?.agencyId === agencyId }
export function canAccessBranch(req: Request, branchId: string, agencyId?: string) { return req.identity?.role === 'SUPER_ADMIN' || (req.identity?.branchId ? req.identity.branchId === branchId : req.identity?.agencyId === agencyId) }
