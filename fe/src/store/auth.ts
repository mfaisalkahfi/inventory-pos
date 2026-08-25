import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  fullName: string;
}

export interface MenuItem {
  id: string;
  name: string;
  icon: string;
  route: string;
  children?: MenuItem[];
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  permissions: string[];
  menu: MenuItem[];
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setPermissions: (permissions: string[]) => void;
  setMenu: (menu: MenuItem[]) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      permissions: [],
      menu: [],
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      setPermissions: (permissions) => set({ permissions }),

      setMenu: (menu) => set({ menu }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          permissions: [],
          menu: [],
          isAuthenticated: false,
        }),

      hasPermission: (permission: string) =>
        get().permissions.includes(permission),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        menu: state.menu,
      }),
    },
  ),
);
