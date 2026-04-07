const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Clear existing data
  await prisma.handoverLog.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.asset.deleteMany()
  await prisma.user.deleteMany()

  // Create Users
  const admin = await prisma.user.create({
    data: {
      name: 'Admin Utama',
      nip: '198701012010011001',
      role: 'ADMIN',
    },
  })

  const user1 = await prisma.user.create({
    data: {
      name: 'Budi Santoso',
      nip: '199002022015031002',
      role: 'USER',
    },
  })

  // Create Assets
  await prisma.asset.createMany({
    data: [
      { name: 'Toyota Innova', brand: 'Toyota', model: 'Innova', licensePlate: 'B 1234 XY', type: 'KENDARAAN_DINAS', status: 'AVAILABLE' },
      { name: 'Toyota Avanza', brand: 'Toyota', model: 'Avanza', licensePlate: 'B 5678 ZT', type: 'KENDARAAN_DINAS', status: 'AVAILABLE' },
      { name: 'Proyektor Epson EB-X05', brand: 'Epson', model: 'EB-X05', serialNumber: 'SN12345', type: 'PERALATAN_KOMPUTER', status: 'AVAILABLE' },
      { name: 'Proyektor Sony VPL-DX221', brand: 'Sony', model: 'VPL-DX221', serialNumber: 'SN67890', type: 'PERALATAN_KOMPUTER', status: 'AVAILABLE' },
      { name: 'MacBook Pro M2', brand: 'Apple', model: 'M2', serialNumber: 'APL999', type: 'PERLENGKAPAN_KOMPUTER', status: 'AVAILABLE' },
      { name: 'Dell Latitude 7420', brand: 'Dell', model: '7420', serialNumber: 'DEL888', type: 'PERLENGKAPAN_KOMPUTER', status: 'AVAILABLE' },
    ],
  })

  console.log('Seed completed successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
