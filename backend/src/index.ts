import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { connectRoute } from './routes/connect'
import { profileRoute } from './routes/profile'
import { recommendRoute } from './routes/recommend'
import { dashboardRoute } from './routes/dashboard'
import { searchRoute } from './routes/search'
import { initDB } from './db'

const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', cors({
  origin: '*',
  credentials: true,
}))

// Health check
app.get('/', (c) => c.json({ status: 'ok', service: 'kalshi-personality-api' }))

// Routes
app.route('/api/connect', connectRoute)
app.route('/api/profile', profileRoute)
app.route('/api/recommend', recommendRoute)
app.route('/api/dashboard', dashboardRoute)
app.route('/api/search', searchRoute)

// Initialize DB and start server
initDB()

export default {
  port: 3003,
  fetch: app.fetch,
}

console.log('🚀 Server running at http://localhost:3003')
