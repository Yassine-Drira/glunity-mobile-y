'use strict';

jest.mock('../../app/modules/auth/auth.repository', () => ({
  findByEmail: jest.fn(),
  findById: jest.fn(),
  findByVerificationToken: jest.fn(),
  findByResetToken: jest.fn(),
  create: jest.fn(),
  markEmailVerified: jest.fn(),
  setVerificationToken: jest.fn(),
  setPasswordResetToken: jest.fn(),
  updatePassword: jest.fn(),
}));

jest.mock('../../app/common/utils/password', () => ({
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
}));

jest.mock('../../app/common/utils/token', () => ({
  signAccessToken: jest.fn(() => 'access-token'),
  signRefreshToken: jest.fn(() => 'refresh-token'),
  verifyRefreshToken: jest.fn(),
}));

jest.mock('../../app/common/services/email.service', () => ({
  sendVerificationEmail: jest.fn(() => Promise.resolve()),
  sendPasswordResetEmail: jest.fn(() => Promise.resolve()),
}));

const authService = require('../../app/modules/auth/auth.service');
const authRepository = require('../../app/modules/auth/auth.repository');
const passwordUtils = require('../../app/common/utils/password');
const tokenUtils = require('../../app/common/utils/token');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers a new user and returns user + tokens', async () => {
    authRepository.findByEmail.mockResolvedValue(null);
    passwordUtils.hashPassword.mockResolvedValue('hashed-pass');

    const createdUser = {
      _id: 'u1',
      profileType: 'celiac',
      toPublic: jest.fn(() => ({ _id: 'u1', email: 'new@x.com' })),
    };

    authRepository.create.mockResolvedValue(createdUser);

    const result = await authService.register({
      fullName: 'New User',
      email: 'new@x.com',
      phone: '+21600000000',
      password: 'Password1',
      profileType: 'celiac',
      language: 'fr',
    });

    expect(authRepository.create).toHaveBeenCalled();
    expect(result.user).toEqual({ _id: 'u1', email: 'new@x.com' });
    expect(result.tokens.accessToken).toBe('access-token');
    expect(result.tokens.refreshToken).toBe('refresh-token');
  });

  it('rejects register when email already exists', async () => {
    authRepository.findByEmail.mockResolvedValue({ _id: 'existing' });

    await expect(
      authService.register({
        fullName: 'Taken',
        email: 'taken@x.com',
        password: 'Password1',
      }),
    ).rejects.toMatchObject({ status: 409, code: 'EMAIL_TAKEN' });
  });

  it('rejects login when password is invalid', async () => {
    authRepository.findByEmail.mockResolvedValue({
      _id: 'u1',
      isActive: true,
      passwordHash: 'stored',
      profileType: 'celiac',
      toPublic: jest.fn(() => ({ _id: 'u1' })),
    });
    passwordUtils.verifyPassword.mockResolvedValue(false);

    await expect(authService.login({ email: 'x@x.com', password: 'wrong' })).rejects.toMatchObject({ status: 401 });
  });

  it('refresh rejects missing refresh token', async () => {
    await expect(authService.refresh()).rejects.toMatchObject({ status: 401 });
  });

  it('refresh issues new tokens when refresh token is valid', async () => {
    tokenUtils.verifyRefreshToken.mockReturnValue({ id: 'u1' });
    authRepository.findById.mockResolvedValue({
      _id: 'u1',
      isActive: true,
      profileType: 'celiac',
      toPublic: jest.fn(() => ({ _id: 'u1' })),
    });

    const result = await authService.refresh('valid-refresh');

    expect(result.tokens.accessToken).toBe('access-token');
    expect(result.tokens.refreshToken).toBe('refresh-token');
  });

  it('forgotPassword is enumeration-safe for unknown user', async () => {
    authRepository.findByEmail.mockResolvedValue(null);

    const result = await authService.forgotPassword('ghost@x.com');

    expect(result.message).toMatch(/If that email exists/i);
    expect(authRepository.setPasswordResetToken).not.toHaveBeenCalled();
  });

  it('resetPassword rejects invalid token', async () => {
    authRepository.findByResetToken.mockResolvedValue(null);

    await expect(authService.resetPassword('invalid', 'Password1')).rejects.toMatchObject({
      status: 400,
      code: 'TOKEN_INVALID',
    });
  });
});
