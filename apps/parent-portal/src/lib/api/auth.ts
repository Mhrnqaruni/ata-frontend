import { api } from './client';
import { clearSession, setSession } from '../auth/session';
import type { ParentBootstrapPayload } from './parent';

interface ApiErrorLike {
  response?: {
    data?: {
      error?: string;
      message?: string;
    };
  };
  message?: string;
}

const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null) {
    const apiError = error as ApiErrorLike;
    return (
      apiError.response?.data?.error ||
      apiError.response?.data?.message ||
      apiError.message ||
      fallback
    );
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return fallback;
};

export interface WorkspaceIdentityUser {
  id: string;
  email?: string | null;
  role: 'admin' | 'user' | string;
  is_admin: boolean;
  is_authenticated: boolean;
  ata_parent_id?: string | null;
  ata_user_type?: string | null;
  allowed_child_ids?: string[];
  workspace_scope?: Record<string, unknown>;
  auth_source?: string;
}

export interface MeResponse {
  success: boolean;
  auth_required?: boolean;
  user: WorkspaceIdentityUser;
}

export interface AuthResponse {
  success: boolean;
  user?: {
    id: string;
    email?: string | null;
  };
  session?: {
    access_token?: string | null;
    refresh_token?: string | null;
    expires_in?: number | null;
    token_type?: string | null;
  };
  error?: string;
}

export interface BridgeExchangeResponse extends AuthResponse {
  bootstrap?: ParentBootstrapPayload;
}

export interface AtaBootstrapResponse extends ParentBootstrapPayload {
  success: boolean;
}

export interface ScopeRefreshResponse extends AuthResponse {
  bootstrap?: ParentBootstrapPayload;
}

const persistSessionIfPresent = (data: AuthResponse | BridgeExchangeResponse) => {
  if (data?.session?.access_token) {
    setSession(data.session.access_token, data.session.refresh_token);
  }
};

export const authAPI = {
  async me(): Promise<MeResponse> {
    const response = await api.get('/auth/me');
    return response.data as MeResponse;
  },

  async exchangeAtaBridgeToken(bridgeToken: string): Promise<BridgeExchangeResponse> {
    try {
      const response = await api.post('/ata/session/exchange', { bridge_token: bridgeToken });
      const data = response.data as BridgeExchangeResponse;
      persistSessionIfPresent(data);
      return data;
    } catch (error: unknown) {
      return { success: false, error: getApiErrorMessage(error, 'Bridge exchange failed') };
    }
  },

  async getAtaBootstrap(): Promise<AtaBootstrapResponse> {
    const response = await api.get('/ata/bootstrap');
    return response.data as AtaBootstrapResponse;
  },

  async refreshWorkspaceScope(): Promise<ScopeRefreshResponse> {
    try {
      const response = await api.post('/ata/session/refresh-scope', {});
      const data = response.data as ScopeRefreshResponse;
      persistSessionIfPresent(data);
      return data;
    } catch (error: unknown) {
      return { success: false, error: getApiErrorMessage(error, 'Scope refresh failed') };
    }
  },

  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await api.post('/auth/signin', { email, password });
      const data = response.data as AuthResponse;
      persistSessionIfPresent(data);
      return data;
    } catch (error: unknown) {
      return { success: false, error: getApiErrorMessage(error, 'Sign in failed') };
    }
  },

  async signUp(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await api.post('/auth/signup', { email, password });
      const data = response.data as AuthResponse;
      persistSessionIfPresent(data);
      return data;
    } catch (error: unknown) {
      return { success: false, error: getApiErrorMessage(error, 'Sign up failed') };
    }
  },

  async signOut(): Promise<void> {
    try {
      await api.post('/auth/signout');
    } finally {
      clearSession();
    }
  },
};
