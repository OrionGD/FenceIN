import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = string;

export interface User {
  id: string;
  email: string;
  role: Role;
  firstName?: string;
  lastName?: string;
  mustChangePassword?: boolean;
  faceEnrolled?: boolean;
  fingerprintEnrolled?: boolean;
  biometricSkipped?: boolean;
}

export interface BiometricStatus {
  face: boolean;
  fingerprint: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  biometricStatus: BiometricStatus | null;
  authMethod: string | null;
  login: (
    userOrPayload: any,
    token?: string,
    biometricStatus?: BiometricStatus | null,
    authMethod?: string | null
  ) => void;
  logout: () => void;
  updateUser: (fields: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      biometricStatus: null,
      authMethod: null,
      login: (userOrPayload, token, biometricStatus = null, authMethod = null) => {
        if (userOrPayload && typeof userOrPayload === 'object' && 'user' in userOrPayload) {
          const payload = userOrPayload;
          const u = payload.user;
          const t = payload.access_token || payload.token;
          const bs = payload.biometricStatus || null;
          const am = payload.authMethod || 'PASSWORD';
          set({
            user: u,
            token: t,
            isAuthenticated: true,
            biometricStatus: bs,
            authMethod: am,
          });
        } else {
          set({
            user: userOrPayload,
            token: token || null,
            isAuthenticated: true,
            biometricStatus: biometricStatus || null,
            authMethod: authMethod || 'PASSWORD',
          });
        }
      },
      logout: () => set({ user: null, token: null, isAuthenticated: false, biometricStatus: null, authMethod: null }),
      updateUser: (fields) => set((state) => ({
        user: state.user ? { ...state.user, ...fields } : null
      })),
    }),
    {
      name: 'fencein-auth-storage',
    }
  )
);
