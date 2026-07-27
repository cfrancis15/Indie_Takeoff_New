import express from 'express'
import cors from 'cors'
import 'dotenv/config'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', function (req, res) {
  res.json({ status: 'ok', service: 'indie-takeoff-api' })
})

const PORT = process.env.PORT || 3001

app.listen(PORT, function () {
  console.log('API running on http://localhost:' + PORT)
})
