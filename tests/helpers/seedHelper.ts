import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Salon from '../../models/Salon';
import Service from '../../models/Service';
import User from '../../models/User';
import Booking from '../../models/Booking';

interface SalonOverrides {
  name?: string;
  location?: string;
  openTime?: string;
  closeTime?: string;
}

interface ServiceOverrides {
  name?: string;
  duration?: number;
  price?: number;
}

interface StylistOverrides {
  name?: string;
  email?: string;
  password?: string;
}

interface BookingOverrides {
  salonId?: mongoose.Types.ObjectId;
  stylistId?: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  serviceId?: mongoose.Types.ObjectId;
  date?: string;
  startTime?: string;
  endTime?: string;
  status?: 'booked' | 'cancelled' | 'completed';
}
// Create salon
export const createSalon = async (overrides: SalonOverrides = {}) => {
  const salon = new Salon({
    name: overrides.name || 'Test Salon',
    location: overrides.location || '123 Test Street',
    openTime: overrides.openTime || '09:00',
    closeTime: overrides.closeTime || '18:00',
  });
  return salon.save();
};


// Create service
export const createService = async (
  salonId: mongoose.Types.ObjectId,
  overrides: ServiceOverrides = {}
) => {
  const service = new Service({
    name: overrides.name || 'Test Haircut',
    duration: overrides.duration || 30,
    price: overrides.price || 25,
    salonId,
  });
  return service.save();
};

// create stylist
export const createStylist = async (overrides: StylistOverrides = {}) => {
  const hashedPassword = await bcrypt.hash(overrides.password || 'stylist123', 10);
  const stylist = new User({
    name: overrides.name || 'Test Stylist',
    email: overrides.email || `stylist-${Date.now()}@test.com`,
    password: hashedPassword,
    role: 'stylist',
  });
  return stylist.save();
};

// create customer
export const createCustomer = async (overrides: StylistOverrides = {}) => {
  const hashedPassword = await bcrypt.hash(overrides.password || 'customer123', 10);
  const customer = new User({
    name: overrides.name || 'Test Customer',
    email: overrides.email || `customer-${Date.now()}@test.com`,
    password: hashedPassword,
    role: 'customer',
  });
  return customer.save();
};

// create booking
export const createBooking = async (overrides: BookingOverrides = {}) => {
  const booking = new Booking({
    salonId: overrides.salonId || new mongoose.Types.ObjectId(),
    stylistId: overrides.stylistId || new mongoose.Types.ObjectId(),
    customerId: overrides.customerId || new mongoose.Types.ObjectId(),
    serviceId: overrides.serviceId || new mongoose.Types.ObjectId(),
    date: overrides.date || '2025-12-15',
    startTime: overrides.startTime || '10:00',
    endTime: overrides.endTime || '10:30',
    status: overrides.status || 'booked',
  });
  return booking.save();
};
