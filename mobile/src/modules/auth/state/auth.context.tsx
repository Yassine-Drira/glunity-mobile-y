import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { authReducer, initialState, AuthState } from './auth.reducer';
import authApi, { LoginDto, RegisterDto, UpdateProfileDto } from '../api/auth.api';
import { TokenStore } from '../../../core/storage/secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setTextMultiplier, loadTextMultiplier } from '@/shared/utils/text-scaling';
import { ChatCacheService } from '../../community/services/chat-cache.service';

function getAuthErrorMessage(err: any, fallback: string): string {
  if (err?.response?.data?.message) {
    return err.response.data.message;
  }

  // Axios network errors have no response and usually indicate API down or CORS rejection.
  if (err?.code === 'ERR_NETWORK' || /Network Error/i.test(err?.message || '')) {
    return 'Unable to reach the server. Check API URL, backend status, and CORS settings.';
  }

  return fallback;
}

interface AuthContextValue extends AuthState {
  login:         (dto: LoginDto) => Promise<any>;
  register:      (dto: RegisterDto) => Promise<void>;
  logout:        () => Promise<void>;
  updateProfile: (dto: UpdateProfileDto) => Promise<void>;
  checkIn:       () => Promise<number>;
  clearError:    () => void;
  textSize:      'Small' | 'Medium' | 'Large';
  updateTextSize: (size: 'Small' | 'Medium' | 'Large') => Promise<void>;
  verify2Fa:     (userId: string, code: string) => Promise<any>;
  refreshUser:   () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const [textSize, setTextSizeState] = React.useState<'Small' | 'Medium' | 'Large'>('Medium');

  useEffect(() => {
    (async () => {
      try {
        await loadTextMultiplier();
        const saved = await AsyncStorage.getItem('@pref_text_size');
        if (saved === 'Small' || saved === 'Medium' || saved === 'Large') {
          setTextSizeState(saved);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const updateTextSize = useCallback(async (size: 'Small' | 'Medium' | 'Large') => {
    setTextSizeState(size);
    setTextMultiplier(size);
    await AsyncStorage.setItem('@pref_text_size', size);
  }, []);

  // ── Restore session on app launch ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const token = await TokenStore.getAccessToken();
        if (token) {
          const user = await authApi.getMe();
          dispatch({ type: 'SET_USER', payload: user });
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch {
        await TokenStore.clearTokens();
        dispatch({ type: 'SET_LOADING', payload: false });
      } finally {
        dispatch({ type: 'SET_INITIALIZED', payload: true });
      }
    })();
  }, []);

  // ── Register push notifications when user is authenticated ──────────────────
  useEffect(() => {
    if (state.user) {
      const { registerForPushNotificationsAsync } = require('../../../shared/utils/notifications');
      registerForPushNotificationsAsync().catch((err: any) => {
        console.warn('Failed to register push notifications:', err);
      });
    }
  }, [state.user]);

  // ── Handle global token expiration and auto-logout ────────────────────────
  useEffect(() => {
    const { setOnUnauthorized } = require('../../../core/network/http.client');
    setOnUnauthorized(() => {
      TokenStore.clearTokens()
        .catch((err) => console.warn('Failed to clear tokens on auto-logout:', err))
        .finally(() => {
          dispatch({ type: 'CLEAR_USER' });
        });
    });
    return () => {
      setOnUnauthorized(null);
    };
  }, []);

  const login = useCallback(async (dto: LoginDto) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await authApi.login(dto);

      if (res.data.twoFactorRequired) {
        dispatch({ type: 'SET_LOADING', payload: false });
        return res.data;
      }

      if (res.data.user && !res.data.user.emailVerified) {
        await TokenStore.clearTokens();
        dispatch({ type: 'CLEAR_USER' });
        dispatch({ type: 'SET_ERROR', payload: 'Please verify your email before logging in.' });
        throw new Error('EMAIL_NOT_VERIFIED');
      }

      if (res.data.user) {
        dispatch({ type: 'SET_USER', payload: res.data.user });
      }
      return res.data;
    } catch (err: any) {
      if (err?.message === 'EMAIL_NOT_VERIFIED') {
        throw err;
      }
      const message = getAuthErrorMessage(err, 'Login failed. Please try again.');
      dispatch({ type: 'SET_ERROR', payload: message });
      throw err;
    }
  }, []);

  const register = useCallback(async (dto: RegisterDto) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await authApi.register(dto);

      if (!res.data.user || !res.data.user.emailVerified) {
        await TokenStore.clearTokens();
        dispatch({ type: 'CLEAR_USER' });
        dispatch({
          type: 'SET_ERROR',
          payload: 'Account created. Please verify your email before logging in.',
        });
        throw new Error('EMAIL_NOT_VERIFIED');
      }

      dispatch({ type: 'SET_USER', payload: res.data.user });
    } catch (err: any) {
      if (err?.message === 'EMAIL_NOT_VERIFIED') {
        throw err;
      }
      const message = getAuthErrorMessage(err, 'Registration failed. Please try again.');
      dispatch({ type: 'SET_ERROR', payload: message });
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await authApi.logout();
    } finally {
      // Clear offline messages cache upon user logout
      await ChatCacheService.clearCache().catch((err) =>
        console.warn('Failed to clear chat cache during logout:', err)
      );
      dispatch({ type: 'CLEAR_USER' });
    }
  }, []);

  const updateProfile = useCallback(async (dto: UpdateProfileDto) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const updatedUser = await authApi.updateProfile(dto);
      dispatch({ type: 'UPDATE_USER', payload: updatedUser });
    } catch (err) {
      const message = getAuthErrorMessage(err, 'Failed to update profile.');
      dispatch({ type: 'SET_ERROR', payload: message });
      throw err;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const checkIn = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await authApi.checkIn();
      dispatch({ type: 'UPDATE_USER', payload: res.data.user });
      return res.data.pointsEarned;
    } catch (err) {
      const message = getAuthErrorMessage(err, 'Failed to check in.');
      dispatch({ type: 'SET_ERROR', payload: message });
      throw err;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const verify2Fa = useCallback(async (userId: string, code: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await authApi.verify2Fa(userId, code);
      if (res.data.user) {
        dispatch({ type: 'SET_USER', payload: res.data.user });
      }
      return res.data;
    } catch (err: any) {
      const message = getAuthErrorMessage(err, 'Verification failed. Please try again.');
      dispatch({ type: 'SET_ERROR', payload: message });
      throw err;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const user = await authApi.getMe();
      dispatch({ type: 'UPDATE_USER', payload: user });
    } catch (err) {
      console.warn('Failed to refresh user:', err);
    }
  }, []);

  const value = useMemo(
    () => ({ ...state, login, register, logout, updateProfile, checkIn, clearError, textSize, updateTextSize, verify2Fa, refreshUser }),
    [state, login, register, logout, updateProfile, checkIn, clearError, textSize, updateTextSize, verify2Fa, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
