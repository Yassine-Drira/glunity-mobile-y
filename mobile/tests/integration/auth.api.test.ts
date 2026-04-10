import authApi from '@/modules/auth/api/auth.api';

const mockPost = jest.fn();
const mockGet = jest.fn();
const mockPatch = jest.fn();
const mockSetTokens = jest.fn();
const mockClearTokens = jest.fn();

jest.mock('@/core/network/http.client', () => ({
  __esModule: true,
  default: {
    post: (...args: any[]) => mockPost(...args),
    get: (...args: any[]) => mockGet(...args),
    patch: (...args: any[]) => mockPatch(...args),
  },
}));

jest.mock('@/core/storage/secure-store', () => ({
  TokenStore: {
    setTokens: (...args: any[]) => mockSetTokens(...args),
    clearTokens: (...args: any[]) => mockClearTokens(...args),
  },
}));

describe('authApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('login stores tokens from server response', async () => {
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: {
          user: { _id: 'u1', fullName: 'User', email: 'u@x.com' },
          accessToken: 'access',
          refreshToken: 'refresh',
          expiresIn: 900,
        },
      },
    });

    const result = await authApi.login({ email: 'u@x.com', password: 'Password1' });

    expect(mockPost).toHaveBeenCalledWith('/auth/login', { email: 'u@x.com', password: 'Password1' });
    expect(mockSetTokens).toHaveBeenCalledWith('access', 'refresh');
    expect(result.success).toBe(true);
  });

  it('register stores tokens from server response', async () => {
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: {
          user: { _id: 'u2', fullName: 'New', email: 'new@x.com' },
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
          expiresIn: 900,
        },
      },
    });

    await authApi.register({ fullName: 'New', email: 'new@x.com', password: 'Password1' });

    expect(mockPost).toHaveBeenCalledWith('/auth/register', {
      fullName: 'New',
      email: 'new@x.com',
      password: 'Password1',
    });
    expect(mockSetTokens).toHaveBeenCalledWith('new-access', 'new-refresh');
  });

  it('logout clears tokens', async () => {
    mockPost.mockResolvedValue({ data: { success: true } });

    await authApi.logout();

    expect(mockPost).toHaveBeenCalledWith('/auth/logout');
    expect(mockClearTokens).toHaveBeenCalled();
  });
});
