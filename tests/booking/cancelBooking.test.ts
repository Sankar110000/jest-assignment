/// <reference types="jest" />
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app';
import * as dbHandler from '../setup/dbHandler';
import { getAuthToken } from '../helpers/authHelper';
import {
  createSalon,
  createService,
  createStylist,
  createCustomer,
  createBooking,
} from '../helpers/seedHelper';
import { loginUser } from '../helpers/authHelper';

beforeAll(async () => await dbHandler.connect());
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());

describe('POST /api/bookings/:bookingId/cancel', () => {
  let salon: any;
  let service: any;
  let stylist: any;

  beforeEach(async () => {
    salon = await createSalon();
    service = await createService(salon._id as mongoose.Types.ObjectId);
    stylist = await createStylist();
  });

  it('should allow a customer to cancel their own booking', async () => {
    const customerToken = await getAuthToken('customer');
    // Create a booking 
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        salonId: salon._id.toString(),
        stylistId: stylist._id.toString(),
        serviceId: service._id.toString(),
        slotTime: '10:00',
        date: '2025-12-15',
      });
    const bookingId = bookingRes.body.booking._id;

    // Cancel the booking
    const res = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Booking cancelled successfully');
  });

  it('should allow an admin to cancel any booking', async () => {
    // Create booking as a customer
    const customerToken = await getAuthToken('customer');
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        salonId: salon._id.toString(),
        stylistId: stylist._id.toString(),
        serviceId: service._id.toString(),
        slotTime: '11:00',
        date: '2025-12-15',
      });
    
      
    const bookingId = bookingRes.body.booking._id;

    // Cancel as admin
    const adminToken = await getAuthToken('admin');
    const res = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Booking cancelled successfully');
  });

  it('should return 403 when a customer tries to cancel another users booking', async () => {
    // Create booking as customer1
    const customer1Token = await getAuthToken('customer', {
      email: 'customer1@test.com',
      name: 'Customer 1',
    });
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        salonId: salon._id.toString(),
        stylistId: stylist._id.toString(),
        serviceId: service._id.toString(),
        slotTime: '12:00',
        date: '2025-12-15',
      });

    const bookingId = bookingRes.body.booking._id;

    // Try to cancel as customer2
    const customer2Token = await getAuthToken('customer', {
      email: 'customer2@test.com',
      name: 'Customer 2',
    });
    const res = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${customer2Token}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error', 'Not authorized to cancel this booking');
  });

  it('should return 401 when no auth token is provided', async () => {
    const fakeBookingId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .post(`/api/bookings/${fakeBookingId}/cancel`);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Authentication required');
  });

  it('should return 404 when bookingId does not exist', async () => {
    const customerToken = await getAuthToken('customer');
    const fakeBookingId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .post(`/api/bookings/${fakeBookingId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Booking not found');
  });

  it('should return 400 when booking is already cancelled', async () => {
    const customerToken = await getAuthToken('customer');

    // Create and cancel a booking
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        salonId: salon._id.toString(),
        stylistId: stylist._id.toString(),
        serviceId: service._id.toString(),
        slotTime: '14:00',
        date: '2025-12-15',
      });

    const bookingId = bookingRes.body.booking._id;

    // Cancel once
    await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`);

    // Try to cancel again
    const res = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Booking is already cancelled');
  });

  it('should make the cancelled slot available again', async () => {
    const customerToken = await getAuthToken('customer');

    // Create a booking
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        salonId: salon._id.toString(),
        stylistId: stylist._id.toString(),
        serviceId: service._id.toString(),
        slotTime: '10:00',
        date: '2025-12-15',
      });

    const bookingId = bookingRes.body.booking._id;

    // Verify the slot is NOT available while booked
    const slotsBeforeCancel = await request(app)
      .get(`/api/salons/${salon._id}/available-slots`)
      .query({ date: '2025-12-15', serviceId: service._id.toString() });

    const bookedSlots = slotsBeforeCancel.body.availableSlots.filter(
      (s: any) => s.time === '10:00' && s.stylistId === stylist._id.toString()
    );
    expect(bookedSlots.length).toBe(0);

    // Cancel the booking
    await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`);

    // Verify the slot IS available after cancellation
    const slotsAfterCancel = await request(app)
      .get(`/api/salons/${salon._id}/available-slots`)
      .query({ date: '2025-12-15', serviceId: service._id.toString() });

    const freedSlots = slotsAfterCancel.body.availableSlots.filter(
      (s: any) => s.time === '10:00' && s.stylistId === stylist._id.toString()
    );
    expect(freedSlots.length).toBe(1);
  });
});
