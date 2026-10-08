/// <reference types="jest" />
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app';
import * as dbHandler from '../setup/dbHandler';
import { registerUser, getAuthToken } from '../helpers/authHelper';

beforeAll(async () => await dbHandler.connect());
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());

describe('POST /api/login', () => {
  const userPayload = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: 'password123',
  };

  beforeEach(async () => {
    await registerUser(userPayload);
  });

  it('should login with valid credentials and return token, role, userId', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: userPayload.email, password: userPayload.password })
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('role', 'customer');
    expect(res.body).toHaveProperty('userId');
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.length).toBeGreaterThan(0);

    // Verify JWT token is valid and decodable
    const decoded = jwt.verify(
      res.body.token,
      process.env.JWT_SECRET || 'supersecretjwtkey_12345'
    ) as { userId: string; role: string };
    expect(decoded.userId).toBe(res.body.userId);
    expect(decoded.role).toBe('customer');
  });

  it('should return 400 when password is wrong', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: userPayload.email, password: 'wrongpassword' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid credentials');
  });

  it('should return 400 when email does not exist', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'nonexistent@example.com', password: 'password123' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid credentials');
  });

  it('should return 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ password: 'password123' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid credentials');
  });

  it('should return 500 when password is missing', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: userPayload.email })
      .set('Accept', 'application/json');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'Server error');
  });

  it('should successfully log in admin user and return admin role', async () => {
    const adminToken = await getAuthToken('admin', {
      email: 'admin@example.com',
      password: 'adminpassword123',
    });

    expect(adminToken).toBeDefined();

    const res = await request(app)
      .post('/api/login')
      .send({ email: 'admin@example.com', password: 'adminpassword123' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('role', 'admin');
  });

  it('should successfully log in stylist user and return stylist role', async () => {
    const stylistToken = await getAuthToken('stylist', {
      email: 'stylist@example.com',
      password: 'stylistpassword123',
    });

    expect(stylistToken).toBeDefined();

    const res = await request(app)
      .post('/api/login')
      .send({ email: 'stylist@example.com', password: 'stylistpassword123' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('role', 'stylist');
  });
});
