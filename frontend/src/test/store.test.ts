import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore, useUIStore, useThemeStore } from '../store';
import type { User } from '../types';

describe('Zustand Global State Stores', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().logout();
    useUIStore.getState().closeModal();
  });

  describe('useAuthStore', () => {
    const mockUser: User = {
      id: 101,
      name: 'Alice Developer',
      email: 'alice@marketforge.dev',
      isAdmin: false,
      isSeller: true,
      riskScore: 0,
      isFlaggedForReview: false,
      createdAt: new Date().toISOString(),
    };

    it('initializes with unauthenticated state', () => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
    });

    it('sets authentication and stores token/user in localStorage', () => {
      useAuthStore.getState().setAuth(mockUser, 'mock-jwt-token-12345');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.name).toBe('Alice Developer');
      expect(state.token).toBe('mock-jwt-token-12345');
      expect(localStorage.getItem('token')).toBe('mock-jwt-token-12345');
      expect(JSON.parse(localStorage.getItem('user')!)).toEqual(mockUser);
    });

    it('updates user partially', () => {
      useAuthStore.getState().setAuth(mockUser, 'mock-jwt-token-12345');
      useAuthStore.getState().updateUser({ name: 'Alice Senior Dev', isSeller: true });

      const state = useAuthStore.getState();
      expect(state.user?.name).toBe('Alice Senior Dev');
      expect(state.user?.email).toBe('alice@marketforge.dev');
    });

    it('clears state and localStorage on logout', () => {
      useAuthStore.getState().setAuth(mockUser, 'mock-jwt-token-12345');
      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('useUIStore', () => {
    it('opens and closes modals with payload data', () => {
      expect(useUIStore.getState().activeModal).toBeNull();

      useUIStore.getState().openModal('auth', { mode: 'login' });
      expect(useUIStore.getState().activeModal).toBe('auth');
      expect(useUIStore.getState().modalData).toEqual({ mode: 'login' });

      useUIStore.getState().closeModal();
      expect(useUIStore.getState().activeModal).toBeNull();
      expect(useUIStore.getState().modalData).toBeNull();
    });

    it('toggles sidebar navigation drawer', () => {
      expect(useUIStore.getState().sidebarOpen).toBe(false);
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(true);
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(false);
    });
  });

  describe('useThemeStore', () => {
    beforeEach(() => {
      document.documentElement.classList.remove('dark');
      localStorage.clear();
      useThemeStore.getState().setTheme('light');
    });

    it('manages theme modes and updates document classes', () => {
      expect(useThemeStore.getState().theme).toBe('light');
      expect(useThemeStore.getState().resolvedTheme).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      useThemeStore.getState().setTheme('dark');
      expect(useThemeStore.getState().theme).toBe('dark');
      expect(useThemeStore.getState().resolvedTheme).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(localStorage.getItem('marketforge-theme')).toBe('dark');

      useThemeStore.getState().toggleTheme();
      expect(useThemeStore.getState().theme).toBe('light');
      expect(useThemeStore.getState().resolvedTheme).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(localStorage.getItem('marketforge-theme')).toBe('light');
    });

    it('clears explicit localStorage key when switching to system', () => {
      useThemeStore.getState().setTheme('dark');
      expect(localStorage.getItem('marketforge-theme')).toBe('dark');

      useThemeStore.getState().setTheme('system');
      expect(useThemeStore.getState().theme).toBe('system');
      expect(localStorage.getItem('marketforge-theme')).toBeNull();
    });
  });
});
