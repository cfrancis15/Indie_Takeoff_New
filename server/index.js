import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { clerkMiddleware } from '@clerk/express'
import socialRoutes from './features/social/routes.js'

const app = express()

app.use(cors())
app.use(express.json())
app.use(clerkMiddleware())

app.get('/api/health', function (req, res) {
  res.json({ status: 'ok', service: 'indie-takeoff-api' })
})

app.use('/api/social', socialRoutes)

const PORT = process.env.PORT || 3001

app.listen(PORT, function () {
  console.log('API running on http://localhost:' + PORT)
})
