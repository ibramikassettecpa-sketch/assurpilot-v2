import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { email: 'admin@assurpilot.fr' },
    update: {},
    create: {
      email: 'admin@assurpilot.fr',
      password: hash,
      name: 'Administrateur',
    },
  })
  console.log('Seed terminé. Utilisateur: admin@assurpilot.fr / admin123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
