// mock-server.js — run with: node mock-server.js
// Bridges React frontend and Python bot via shared JSON file
const express = require('express')
const fs = require('fs')
const cors = require('cors')
const app = express()

app.use(cors())
app.use(express.json())

const DB_FILE = './positions.json'

// Track liquidated position IDs (never return these)
let liquidatedIds = new Set()

// Initialize empty positions file
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([]))
  console.log('Created positions.json')
}

// Frontend calls this to save positions
app.post('/positions', (req, res) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(req.body, null, 2))
  console.log(`📝 Updated positions: ${req.body.length} positions saved`)
  res.json({ success: true })
})

// Bot calls this to read positions (filters out liquidated ones)
app.get('/positions', (req, res) => {
  const data = JSON.parse(fs.readFileSync(DB_FILE))
  const active = data.filter(p => !liquidatedIds.has(p.id))
  console.log(`📖 Positions requested: ${data.length} total, ${active.length} active, ${liquidatedIds.size} liquidated`)
  res.json(active)
})

// Bot calls this to mark a position as liquidated
app.post('/liquidated', (req, res) => {
  const { id } = req.body
  liquidatedIds.add(id)
  console.log(`🔴 Position ${id} marked as LIQUIDATED (total liquidated: ${liquidatedIds.size})`)
  res.json({ success: true, liquidatedCount: liquidatedIds.size })
})

// Get list of liquidated position IDs
app.get('/liquidated', (req, res) => {
  res.json(Array.from(liquidatedIds))
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', file: DB_FILE })
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`🚀 Mock server running on http://localhost:${PORT}`)
  console.log(`   Frontend → POST /positions`)
  console.log(`   Bot     → GET  /positions`)
})
