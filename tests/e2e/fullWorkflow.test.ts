/// <reference types="jest" />
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app';
import * as dbHandler from '../setup/dbHandler';
import { createSalon, createService, createStylist } from '../helpers/seedHelper';

beforeAll(async () => await dbHandler.connect());
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());

describe('E2E Workflow: Register → Login → Get Slots → Book → Cancel', () => {
  let salon: any;
  let service: any;
  let stylist: any;

  beforeEach(async () => {
    salon = await createSalon({ openTime: '09:00', closeTime: '18:00' });
    service = await createService(salon._id as mongoose.Types.ObjectId, {
      name: 'Premium Haircut',
      duration: 30,
      price: 50,
    });
    stylist = await createStylist({ name: 'Alex Barber', email: 'alex@salon.com' });
  });

  it('should complete the full booking lifecycle end-to-end', async () => {
    const registerRes = await request(app)
      .post('/api/register')
      .send({
        name: 'E2E Customer',
        email: 'e2e-customer@example.com',
        password: 'securepass123',
      })
      .set('Accept', 'application/json');

    expect(registerRes.status).toBe(201);
    expect(registerRes.body).toHaveProperty('message', 'User registered successfully');

    const loginRes = await request(app)
      .post('/api/login')
      .send({
        email: 'e2e-customer@example.com',
        password: 'securepass123',
      })
      .set('Accept', 'application/json');

    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty('token');
    expect(loginRes.body).toHaveProperty('role', 'customer');
    expect(loginRes.body).toHaveProperty('userId');

    const token = loginRes.body.token;

    const slotsRes = await request(app)
      .get(`/api/salons/${salon._id}/available-slots`)
      .query({ date: '2025-12-20', serviceId: service._id.toString() });

    expect(slotsRes.status).toBe(200);
    expect(slotsRes.body.availableSlots.length).toBeGreaterThan(0);

    // Pick the first available slot for our stylist
    const availableSlot = slotsRes.body.availableSlots.find(
      (s: any) => s.stylistId === stylist._id.toString()
    );
    expect(availableSlot).toBeDefined();

    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        salonId: salon._id.toString(),
        stylistId: stylist._id.toString(),
        serviceId: service._id.toString(),
        slotTime: availableSlot.time,
        date: '2025-12-20',
      });

    expect(bookingRes.status).toBe(201);
    expect(bookingRes.body).toHaveProperty('message', 'Booking created successfully');
    expect(bookingRes.body.booking).toHaveProperty('status', 'booked');
    expect(bookingRes.body.booking).toHaveProperty('startTime', availableSlot.time);

    const bookingId = bookingRes.body.booking._id;

    const slotsAfterBooking = await request(app)
      .get(`/api/salons/${salon._id}/available-slots`)
      .query({ date: '2025-12-20', serviceId: service._id.toString() });

    const bookedSlot = slotsAfterBooking.body.availableSlots.find(
      (s: any) =>
        s.time === availableSlot.time && s.stylistId === stylist._id.toString()
    );
    expect(bookedSlot).toBeUndefined();

    const cancelRes = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body).toHaveProperty('message', 'Booking cancelled successfully');

    const slotsAfterCancel = await request(app)
      .get(`/api/salons/${salon._id}/available-slots`)
      .query({ date: '2025-12-20', serviceId: service._id.toString() });

    const freedSlot = slotsAfterCancel.body.availableSlots.find(
      (s: any) =>
        s.time === availableSlot.time && s.stylistId === stylist._id.toString()
    );
    expect(freedSlot).toBeDefined();
  });
});
