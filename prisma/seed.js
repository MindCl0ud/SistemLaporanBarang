const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10)

  // Clear existing data
  await prisma.stockLog.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.item.deleteMany()
  await prisma.user.deleteMany()
  await prisma.bidang.deleteMany()

  // Create Bidang
  const bidangUmum = await prisma.bidang.create({
    data: { nama: 'Bagian Umum', kode: 'UMU' },
  })
  
  const bidangKepegawaian = await prisma.bidang.create({
    data: { nama: 'Bidang Kepegawaian', kode: 'KEP' },
  })

  // Create Users
  await prisma.user.create({
    data: {
      name: 'Admin Gudang',
      nip: '198701012010011001',
      password: hashedPassword,
      role: 'ADMIN_GUDANG',
      bidangId: bidangUmum.id,
    },
  })

  await prisma.user.create({
    data: {
      name: 'Budi Santoso',
      nip: '199002022015031002',
      password: hashedPassword,
      role: 'PEGAWAI',
      bidangId: bidangKepegawaian.id,
    },
  })

  await prisma.user.create({
    data: {
      name: 'Kepala Dinas',
      nip: '197503031998031003',
      password: hashedPassword,
      role: 'KEPALA_DINAS',
      bidangId: bidangUmum.id,
    },
  })

  // Create Master Items (MDM)
  await prisma.item.createMany({
    data: [
      { nama: 'Kertas HVS A4 80gr', tipe: 'HABIS_PAKAI', satuan: 'Rim', stokMinimal: 10, currentStok: 50, kodeBarang: '1.2.3.01.01' },
      { nama: 'Toyota Innova', tipe: 'ASET_TETAP', licensePlate: 'B 1234 XY', isAvailable: true, kodeBarang: '1.3.2.01.01' },
    ],
  })

  console.log('Epic Seed completed successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
