/// <reference types="jest" />
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app';
import * as dbHandler from '../setup/dbHandler';
import { getAuthToken } from '../helpers/authHelper';
import { createSalon, createService, createStylist, createBooking } from '../helpers/seedHelper';

beforeAll(async () => await dbHandler.connect());
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());

describe('POST /api/bookings', () => {
  let customerToken: string;
  let salon: any;
  let service: any;
  let stylist: any;

  beforeEach(async () => {
    customerToken = await getAuthToken('customer');
    salon = await createSalon();
    service = await createService(salon._id as mongoose.Types.ObjectId, { duration: 30 });
    stylist = await createStylist();
  });

  it('should create a booking successfully with valid data', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        salonId: salon._id.toString(),
        stylistId: stylist._id.toString(),
        serviceId: service._id.toString(),
        slotTime: '10:00',
        date: '2025-12-15',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message', 'Booking created successfully');
    expect(res.body).toHaveProperty('booking');
    expect(res.body.booking).toHaveProperty('startTime', '10:00');
    expect(res.body.booking).toHaveProperty('endTime', '10:30');
    expect(res.body.booking).toHaveProperty('status', 'booked');
  });

  it('should calculate correct endTime based on service duration', async () => {
    // Create a 60-minute service
    const longService = await createService(salon._id as mongoose.Types.ObjectId, {
      name: 'Hair Coloring',
      duration: 60,
      price: 80,
    });

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        salonId: salon._id.toString(),
        stylistId: stylist._id.toString(),
        serviceId: longService._id.toString(),
        slotTime: '14:00',
        date: '2025-12-15',
      });

    expect(res.status).toBe(201);
    expect(res.body.booking).toHaveProperty('startTime', '14:00');
    expect(res.body.booking).toHaveProperty('endTime', '15:00');
  });

  it('should return 401 when no auth token is provided', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({
        salonId: salon._id.toString(),
        stylistId: stylist._id.toString(),
        serviceId: service._id.toString(),
        slotTime: '10:00',
        date: '2025-12-15',
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Authentication required');
  });

  it('should return 401 when auth token is invalid', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', 'Bearer invalid-token-here')
      .send({
        salonId: salon._id.toString(),
        stylistId: stylist._id.toString(),
        serviceId: service._id.toString(),
        slotTime: '10:00',
        date: '2025-12-15',
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Invalid token');
  });

  it('should return 404 when serviceId does not exist', async () => {
    const fakeServiceId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        salonId: salon._id.toString(),
        stylistId: stylist._id.toString(),
        serviceId: fakeServiceId.toString(),
        slotTime: '10:00',
        date: '2025-12-15',
      });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Service not found');
  });

  it('should return 400 when date is missing', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        salonId: salon._id.toString(),
        stylistId: stylist._id.toString(),
        serviceId: service._id.toString(),
        slotTime: '10:00',
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'date is required');
  });

  it('should return 400 when time slot conflicts with existing booking', async () => {
    // First booking at 10:00
    await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        salonId: salon._id.toString(),
        stylistId: stylist._id.toString(),
        serviceId: service._id.toString(),
        slotTime: '10:00',
        date: '2025-12-15',
      });

    // Second booking at the same time and stylist
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        salonId: salon._id.toString(),
        stylistId: stylist._id.toString(),
        serviceId: service._id.toString(),
        slotTime: '10:00',
        date: '2025-12-15',
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Time slot is no longer available');
  });

  it('should allow booking a different stylist at the same time', async () => {
    const stylist2 = await createStylist({ name: 'Another Stylist', email: 'stylist2@test.com' });

    // Book stylist1 at 10:00
    await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        salonId: salon._id.toString(),
        stylistId: stylist._id.toString(),
        serviceId: service._id.toString(),
        slotTime: '10:00',
        date: '2025-12-15',
      });

    // Book stylist2 at the same 10:00 slot
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        salonId: salon._id.toString(),
        stylistId: stylist2._id.toString(),
        serviceId: service._id.toString(),
        slotTime: '10:00',
        date: '2025-12-15',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message', 'Booking created successfully');
  });
});
