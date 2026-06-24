// Production seed — creates admin user if not exists
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: 'admin@assurpilot.fr' } })
  if (existing) {
    console.log('Admin already exists, skipping seed.')
    return
  }
  const hash = await bcrypt.hash('admin123', 10)
  await prisma.user.create({
    data: { email: 'admin@assurpilot.fr', password: hash, name: 'Administrateur' },
  })
  console.log('Admin created: admin@assurpilot.fr / admin123')
}

main().catch(console.error).finally(() => prisma.$disconnect())
