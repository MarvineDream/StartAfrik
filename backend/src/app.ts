import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { env } from './config/env'
import { authRouter } from './modules/auth/auth.routes'
import { foundationRouter } from './routes/foundation.routes'

export const app = express()
app.use(helmet())
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true }))
app.use('/api/auth', authRouter)
app.use('/api', foundationRouter)

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'startafrik-api' }))

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof SyntaxError) return res.status(400).json({ error: 'INVALID_JSON' })
  if (error && typeof error === 'object' && 'issues' in error) return res.status(422).json({ error: 'VALIDATION_ERROR' })
  if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002') return res.status(409).json({ error: 'CONFLICT' })
  if (env.NODE_ENV !== 'production') console.error('[v0] API error', error)
  res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'Une erreur interne est survenue.' })
})
