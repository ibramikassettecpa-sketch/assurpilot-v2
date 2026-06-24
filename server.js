const { execSync } = require('child_process')
const path = require('path')

// Run DB migration then start Next.js
try {
  console.log('Running database migrations...')
  execSync('npx prisma migrate deploy', { stdio: 'inherit' })

  console.log('Seeding admin user...')
  execSync('node prisma/seed-prod.js', { stdio: 'inherit' })
} catch (err) {
  console.error('Startup error:', err.message)
  // Don't crash — app can still start even if seed fails
}

console.log('Starting Next.js...')
require('./.next/standalone/server.js')
