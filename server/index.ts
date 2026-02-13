import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { validateEnv } from './lib/env'
import { transcribeRoute } from './routes/transcribe'
import { chatRoute } from './routes/chat'
import { speakRoute } from './routes/speak'
import { conversationsRoute } from './routes/conversations'
import { settingsRoute } from './routes/settings'

// Validate environment variables before starting
validateEnv()

const app = new Hono()

// Enable CORS for development
app.use('/*', cors())

// API routes
app.route('/api/transcribe', transcribeRoute)
app.route('/api/chat', chatRoute)
app.route('/api/speak', speakRoute)
app.route('/api/conversations', conversationsRoute)
app.route('/api/settings', settingsRoute)

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok' }))

const port = 3001
console.log(`Server running on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port,
})
