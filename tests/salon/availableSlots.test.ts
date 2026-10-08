/// <reference types="jest" />
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app';
import * as dbHandler from '../setup/dbHandler';
import { createSalon, createService, createStylist, createBooking } from '../helpers/seedHelper';

beforeAll(async () => await dbHandler.connect());
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());

describe('GET /api/salons/:salonId/available-slots', () => {
  it('should return available slots for a valid salon, date, and serviceId', async () => {
    const salon = await createSalon();
    const service = await createService(salon._id as mongoose.Types.ObjectId);
    await createStylist();

    const res = await request(app)
      .get(`/api/salons/${salon._id}/available-slots`)
      .query({ date: '2025-12-15', serviceId: service._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('date', '2025-12-15');
    expect(res.body).toHaveProperty('service', service.name);
    expect(res.body).toHaveProperty('duration', service.duration);
    expect(res.body).toHaveProperty('availableSlots');
    expect(Array.isArray(res.body.availableSlots)).toBe(true);
    expect(res.body.availableSlots.length).toBeGreaterThan(0);
  });

  it('should return slots with correct structure (time, stylistId, stylistName)', async () => {
    const salon = await createSalon();
    const service = await createService(salon._id as mongoose.Types.ObjectId);
    const stylist = await createStylist();

    const res = await request(app)
      .get(`/api/salons/${salon._id}/available-slots`)
      .query({ date: '2025-12-15', serviceId: service._id.toString() });

    expect(res.status).toBe(200);

    const slot = res.body.availableSlots[0];
    expect(slot).toHaveProperty('time');
    expect(slot).toHaveProperty('stylistId');
    expect(slot).toHaveProperty('stylistName');
    expect(slot.stylistName).toBe(stylist.name);
  });

  it('should respect salon open/close times', async () => {
    const salon = await createSalon({ openTime: '10:00', closeTime: '12:00' });
    const service = await createService(salon._id as mongoose.Types.ObjectId, { duration: 30 });
    await createStylist();

    const res = await request(app)
      .get(`/api/salons/${salon._id}/available-slots`)
      .query({ date: '2025-12-15', serviceId: service._id.toString() });

    expect(res.status).toBe(200);

    // All slot times should be within open/close range
    for (const slot of res.body.availableSlots) {
      const [h, m] = slot.time.split(':').map(Number);
      const slotMins = h * 60 + m;
      expect(slotMins).toBeGreaterThanOrEqual(10 * 60);
      expect(slotMins + service.duration).toBeLessThanOrEqual(12 * 60);
    }
  });

  it('should exclude time slots that are already booked', async () => {
    const salon = await createSalon({ openTime: '09:00', closeTime: '18:00' });
    const service = await createService(salon._id as mongoose.Types.ObjectId, { duration: 30 });
    const stylist = await createStylist();

    // Book the stylist at 10:00-10:30
    await createBooking({
      salonId: salon._id as mongoose.Types.ObjectId,
      stylistId: stylist._id as mongoose.Types.ObjectId,
      serviceId: service._id as mongoose.Types.ObjectId,
      date: '2025-12-15',
      startTime: '10:00',
      endTime: '10:30',
      status: 'booked',
    });

    const res = await request(app)
      .get(`/api/salons/${salon._id}/available-slots`)
      .query({ date: '2025-12-15', serviceId: service._id.toString() });

    expect(res.status).toBe(200);

    const slotsAt10 = res.body.availableSlots.filter(
      (s: any) => s.time === '10:00' && s.stylistId === stylist._id.toString()
    );
    expect(slotsAt10.length).toBe(0);
  });

  it('should return 400 when date query param is missing', async () => {
    const salon = await createSalon();
    const service = await createService(salon._id as mongoose.Types.ObjectId);

    const res = await request(app)
      .get(`/api/salons/${salon._id}/available-slots`)
      .query({ serviceId: service._id.toString() });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'date and serviceId are required');
  });

  it('should return 400 when serviceId query param is missing', async () => {
    const salon = await createSalon();

    const res = await request(app)
      .get(`/api/salons/${salon._id}/available-slots`)
      .query({ date: '2025-12-15' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'date and serviceId are required');
  });

  it('should return 404 when salonId is invalid', async () => {
    const fakeSalonId = new mongoose.Types.ObjectId();
    const salon = await createSalon();
    const service = await createService(salon._id as mongoose.Types.ObjectId);

    const res = await request(app)
      .get(`/api/salons/${fakeSalonId}/available-slots`)
      .query({ date: '2025-12-15', serviceId: service._id.toString() });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Salon or Service not found');
  });

  it('should return 404 when serviceId does not exist', async () => {
    const salon = await createSalon();
    const fakeServiceId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .get(`/api/salons/${salon._id}/available-slots`)
      .query({ date: '2025-12-15', serviceId: fakeServiceId.toString() });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Salon or Service not found');
  });
});
