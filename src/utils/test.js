// src/utils/test.js
import { db } from '@/services/firebase';

export const createDummyAppointments = async () => {
  const appointments = [
    {
      barberId: 'testBarberId',
      customerId: 'testCustomerId1',
      service: 'Fade Cut',
      date: '2025-06-15',
      time: '10:00',
      status: 'booked',
    },
    {
      barberId: 'testBarberId',
      customerId: 'testCustomerId2',
      service: 'Shape Up',
      date: '2025-06-15',
      time: '11:00',
      status: 'booked',
    },
  ];

  for (const appt of appointments) {
    await db.collection('appointments').add(appt);
  }

  console.log('✅ Dummy appointments added.');
};
