import { app } from './app'
import { env } from './config/env'

app.listen(env.PORT, () => {
  console.log(`StartAfrik API listening on port ${env.PORT}`)
})
