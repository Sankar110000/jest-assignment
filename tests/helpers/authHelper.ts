import request from 'supertest';
import app from '../../app';
import bcrypt from 'bcryptjs';
import User from '../../models/User';

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export const registerUser = async (payload: RegisterPayload) => {
  return request(app)
    .post('/api/register')
    .send(payload)
    .set('Accept', 'application/json');
};

export const loginUser = async (email: string, password: string) => {
  return request(app)
    .post('/api/login')
    .send({ email, password })
    .set('Accept', 'application/json');
};

export const registerAndLogin = async (payload: RegisterPayload) => {
  await registerUser(payload);
  return loginUser(payload.email, payload.password);
};

export const getAuthToken = async (
  role: 'customer' | 'stylist' | 'admin',
  overrides: Partial<RegisterPayload> = {}
): Promise<string> => {
  const password = overrides.password || 'testpass123';
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new User({
    name: overrides.name || `Test ${role}`,
    email: overrides.email || `test-${role}-${Date.now()}@test.com`,
    password: hashedPassword,
    role,
  });
  await user.save();

  const res = await loginUser(user.email, password);
  return res.body.token;
};
