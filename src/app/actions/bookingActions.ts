import prisma from '@/lib/prisma'
import { AssetStatus, BookingStatus, AssetType } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export async function getAssets() {
  return await prisma.asset.findMany({
    orderBy: { type: 'asc' },
    include: {
      bookings: {
        where: {
          status: { in: ['APPROVED', 'ONGOING'] },
          endDate: { gte: new Date() }
        }
      }
    }
  })
}

export async function createBooking(formData: {
  assetId: string;
  userName: string;
  userDivision: string;
  startDate: Date;
  endDate: Date;
  purpose: string;
}) {
  // 1. Check for conflicts
  const conflicts = await prisma.booking.findFirst({
    where: {
      assetId: formData.assetId,
      status: { in: ['APPROVED', 'ONGOING', 'PENDING'] },
      OR: [
        {
          startDate: { lte: formData.endDate },
          endDate: { gte: formData.startDate }
        }
      ]
    }
  })

  if (conflicts) {
    throw new Error('Jadwal bentrok dengan peminjaman lain.')
  }

  // 2. Create booking
  const booking = await prisma.booking.create({
    data: {
      assetId: formData.assetId,
      userName: formData.userName,
      userDivision: formData.userDivision,
      startDate: formData.startDate,
      endDate: formData.endDate,
      purpose: formData.purpose,
      status: 'PENDING'
    }
  })

  revalidatePath('/booking')
  return booking
}

export async function getMyBookings(userName: string) {
  return await prisma.booking.findMany({
    where: { userName },
    include: { asset: true },
    orderBy: { createdAt: 'desc' }
  })
}

export async function updateBookingStatus(id: string, status: BookingStatus) {
  const booking = await prisma.booking.update({
    where: { id },
    data: { status },
    include: { asset: true }
  })

  // Update asset status if needed
  if (status === 'ONGOING') {
    await prisma.asset.update({
      where: { id: booking.assetId },
      data: { status: 'BOOKED' }
    })
  } else if (status === 'COMPLETED' || status === 'CANCELLED') {
    await prisma.asset.update({
      where: { id: booking.assetId },
      data: { status: 'AVAILABLE' }
    })
  }

  revalidatePath('/booking')
  return booking
}

export async function logHandover(data: {
  bookingId: string;
  type: 'PICKUP' | 'RETURN';
  condition: string;
  notes?: string;
  staffName: string;
}) {
  const handover = await prisma.handover.create({
    data: {
      bookingId: data.bookingId,
      type: data.type,
      condition: data.condition,
      notes: data.notes,
      staffName: data.staffName
    }
  })

  // Auto-update booking status
  if (data.type === 'PICKUP') {
    await updateBookingStatus(data.bookingId, 'ONGOING')
  } else {
    await updateBookingStatus(data.bookingId, 'COMPLETED')
  }

  return handover
}

// Seed function for demo
export async function seedDemoAssets() {
  const count = await prisma.asset.count()
  if (count > 0) return

  await prisma.asset.createMany({
    data: [
      {
        type: 'VEHICLE',
        name: 'Toyota Innova Zenix',
        brand: 'Toyota',
        model: 'Innova Zenix 2024',
        licensePlate: 'B 1234 PJP',
        description: 'Kendaraan operasional utama, kapasitas 7 orang. Kondisi sangat baik.',
        imageUrl: '/assets/mobil_dinas.png'
      },
      {
        type: 'VEHICLE',
        name: 'Mitsubishi Pajero Sport',
        brand: 'Mitsubishi',
        model: 'Pajero Sport 2023',
        licensePlate: 'B 9999 KDS',
        description: 'Kendaraan dinas pimpinan, All-wheel drive.',
        imageUrl: '/assets/mobil_pimpinan.png'
      },
      {
        type: 'PROJECTOR',
        name: 'Epson EB-X400',
        brand: 'Epson',
        model: 'EB-X400',
        serialNumber: 'PJ-001-EPS',
        description: 'Proyektor ruang rapat utama, 3300 lumens.',
        imageUrl: '/assets/proyektor.png'
      },
      {
        type: 'LAPTOP',
        name: 'MacBook Air M2',
        brand: 'Apple',
        model: 'Air M2 13-inch',
        serialNumber: 'LP-001-MAC',
        description: 'Laptop portable untuk presentasi luar kantor.',
        imageUrl: '/assets/laptop.png'
      }
    ]
  })
}
