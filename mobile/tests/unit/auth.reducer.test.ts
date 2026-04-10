import { authReducer, initialState } from '@/modules/auth/state/auth.reducer';

describe('authReducer', () => {
  it('sets user as authenticated on SET_USER', () => {
    const next = authReducer(initialState, {
      type: 'SET_USER',
      payload: {
        _id: 'u1',
        fullName: 'User',
        email: 'user@example.com',
        profileType: 'celiac',
        avatarUrl: null,
        emailVerified: false,
        streakDays: 0,
        language: 'fr',
        darkMode: false,
      },
    });

    expect(next.isAuthenticated).toBe(true);
    expect(next.user?.email).toBe('user@example.com');
    expect(next.isLoading).toBe(false);
  });

  it('clears auth state on CLEAR_USER', () => {
    const withUser = {
      ...initialState,
      isAuthenticated: true,
      user: {
        _id: 'u1',
        fullName: 'User',
        email: 'user@example.com',
        profileType: 'celiac',
        avatarUrl: null,
        emailVerified: true,
        streakDays: 4,
        language: 'fr',
        darkMode: false,
      },
    };

    const next = authReducer(withUser, { type: 'CLEAR_USER' });

    expect(next.user).toBeNull();
    expect(next.isAuthenticated).toBe(false);
  });
});
