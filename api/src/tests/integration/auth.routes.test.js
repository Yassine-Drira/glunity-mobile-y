'use strict';

const request = require('supertest');

jest.mock('../../app/modules/auth/auth.controller', () => ({
  register: jest.fn((req, res) => res.status(201).json({ ok: true, route: 'register' })),
  login: jest.fn((req, res) => res.status(200).json({ ok: true, route: 'login' })),
  refresh: jest.fn((req, res) => res.status(200).json({ ok: true, route: 'refresh' })),
  logout: jest.fn((req, res) => res.status(200).json({ ok: true, route: 'logout' })),
  verifyEmail: jest.fn((req, res) => res.status(302).json({ ok: true, route: 'verify-email' })),
  resendVerification: jest.fn((req, res) => res.status(200).json({ ok: true, route: 'resend-verification' })),
  forgotPassword: jest.fn((req, res) => res.status(200).json({ ok: true, route: 'forgot-password' })),
  resetPassword: jest.fn((req, res) => res.status(200).json({ ok: true, route: 'reset-password' })),
  me: jest.fn((req, res) => res.status(200).json({ ok: true, route: 'me' })),
}));

jest.mock('../../app/common/middleware/auth.middleware', () => jest.fn((req, _res, next) => {
  req.user = { _id: 'u1' };
  next();
}));

const app = require('../../app/app');
const authController = require('../../app/modules/auth/auth.controller');

describe('Auth Routes Validation', () => {
  it('rejects invalid register payload with 422', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'bad-email', password: '123' });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(authController.register).not.toHaveBeenCalled();
  });

  it('accepts valid login payload and reaches controller', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Password1' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(authController.login).toHaveBeenCalled();
  });

  it('rejects reset-password without token', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ password: 'Password1' });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(authController.resetPassword).not.toHaveBeenCalled();
  });

  it('allows /me with auth middleware', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(200);
    expect(authController.me).toHaveBeenCalled();
  });
});
