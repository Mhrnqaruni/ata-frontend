/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authAPI, type WorkspaceIdentityUser } from '@/lib/api/auth';
import {
  EMPTY_PARENT_WORKSPACE_POLICY,
  parentAPI,
  type ParentBootstrapPayload,
  type ParentDashboardChildSummary,
  type ParentIdentitySummary,
  type ParentWorkspacePolicy,
} from '@/lib/api/parent';
import {
  clearBridgeHandledMarker,
  getBridgeTokenFromLocation,
  hasHandledBridgeToken,
  markBridgeTokenHandled,
  stripBridgeTokenFromUrl,
} from '@/lib/auth/bridge';
import { clearSession, hasSession } from '@/lib/auth/session';

interface AuthUser {
  id: string;
  email: string | null;
  role: string;
  isAdmin: boolean;
  isAuthenticated: boolean;
  ata_parent_id?: string | null;
  ata_user_type?: string | null;
  allowed_child_ids: string[];
  workspace_scope: Record<string, unknown>;
  auth_source?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  parent: ParentIdentitySummary | null;
  children: ParentDashboardChildSummary[];
  defaultChildId: string | null;
  workspacePolicy: ParentWorkspacePolicy;
  authRequired: boolean;
  bootstrapReady: boolean;
  initializing: boolean;
  loading: boolean;
  exchangeInFlight: boolean;
  bridgeHandled: boolean;
  bridgeError: string | null;
  isParentSession: boolean;
  bootstrapFromBridgeToken: (bridgeToken: string) => Promise<void>;
  refreshMe: () => Promise<AuthUser | null>;
  refreshBootstrap: () => Promise<ParentBootstrapPayload | null>;
  refreshWorkspaceScope: () => Promise<ParentBootstrapPayload | null>;
  logout: () => Promise<void>;
  getChildById: (studentId: string) => ParentDashboardChildSummary | undefined;
  canUseAiForChild: (studentId?: string | null) => boolean;
  isToolAllowed: (toolKey: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const bridgeExchangeRequests = new Map<string, Promise<ParentBootstrapPayload>>();

const normalizeUser = (identity?: WorkspaceIdentityUser | null): AuthUser | null => {
  if (!identity?.id) {
    return null;
  }

  return {
    id: identity.id,
    email: identity.email || null,
    role: identity.role || 'user',
    isAdmin: Boolean(identity.is_admin),
    isAuthenticated: Boolean(identity.is_authenticated),
    ata_parent_id: identity.ata_parent_id || null,
    ata_user_type: identity.ata_user_type || null,
    allowed_child_ids: identity.allowed_child_ids || [],
    workspace_scope: identity.workspace_scope || {},
    auth_source: identity.auth_source || null,
  };
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    const maybeAxios = error as {
      response?: { data?: { error?: string; message?: string } };
      message?: string;
    };
    return (
      maybeAxios.response?.data?.error ||
      maybeAxios.response?.data?.message ||
      maybeAxios.message ||
      fallback
    );
  }

  return fallback;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [parent, setParent] = useState<ParentIdentitySummary | null>(null);
  const [childrenState, setChildrenState] = useState<ParentDashboardChildSummary[]>([]);
  const [defaultChildId, setDefaultChildId] = useState<string | null>(null);
  const [workspacePolicy, setWorkspacePolicy] = useState<ParentWorkspacePolicy>(EMPTY_PARENT_WORKSPACE_POLICY);
  const [authRequired, setAuthRequired] = useState(true);
  const [bootstrapReady, setBootstrapReady] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [exchangeInFlight, setExchangeInFlight] = useState(false);
  const [bridgeHandled, setBridgeHandled] = useState(false);
  const [bridgeError, setBridgeError] = useState<string | null>(null);

  const clearBootstrap = useCallback(() => {
    setParent(null);
    setChildrenState([]);
    setDefaultChildId(null);
    setWorkspacePolicy(EMPTY_PARENT_WORKSPACE_POLICY);
    setBootstrapReady(false);
  }, []);

  const applyBootstrap = useCallback((payload: ParentBootstrapPayload) => {
    setParent(payload.parent);
    setChildrenState(payload.children || []);
    setDefaultChildId(payload.default_child_id || null);
    setWorkspacePolicy(payload.workspace_policy || EMPTY_PARENT_WORKSPACE_POLICY);
    setBootstrapReady(true);
  }, []);

  const refreshMe = useCallback(async (): Promise<AuthUser | null> => {
    const response = await authAPI.me();
    setAuthRequired(Boolean(response.auth_required));
    const nextUser = normalizeUser(response.user);
    setUser(nextUser);
    return nextUser;
  }, []);

  const refreshBootstrap = useCallback(async (): Promise<ParentBootstrapPayload | null> => {
    const response = await parentAPI.getBootstrap();
    if (!response.success) {
      return null;
    }

    const payload: ParentBootstrapPayload = {
      parent: response.parent,
      children: response.children || [],
      default_child_id: response.default_child_id || null,
      workspace_policy: response.workspace_policy || EMPTY_PARENT_WORKSPACE_POLICY,
    };
    applyBootstrap(payload);
    return payload;
  }, [applyBootstrap]);

  const refreshWorkspaceScope = useCallback(async (): Promise<ParentBootstrapPayload | null> => {
    const response = await authAPI.refreshWorkspaceScope();
    if (!response.success || !response.bootstrap) {
      throw new Error(response.error || 'Failed to refresh parent workspace scope.');
    }

    applyBootstrap(response.bootstrap);
    return response.bootstrap;
  }, [applyBootstrap]);

  const bootstrapFromBridgeToken = useCallback(async (bridgeToken: string) => {
    const trimmedToken = bridgeToken.trim();
    if (!trimmedToken) {
      throw new Error('Bridge token is required.');
    }

    setExchangeInFlight(true);
    setBridgeError(null);

    try {
      if (hasHandledBridgeToken(trimmedToken) && hasSession()) {
        stripBridgeTokenFromUrl();
        const existingUser = await refreshMe();
        if (existingUser?.ata_user_type === 'parent') {
          await refreshWorkspaceScope();
        }
        setBridgeHandled(true);
        return;
      }

      let request = bridgeExchangeRequests.get(trimmedToken);
      if (!request) {
        request = (async () => {
          const result = await authAPI.exchangeAtaBridgeToken(trimmedToken);
          if (!result.success || !result.bootstrap) {
            throw new Error(result.error || 'Bridge exchange failed.');
          }
          return result.bootstrap;
        })().finally(() => {
          bridgeExchangeRequests.delete(trimmedToken);
        });
        bridgeExchangeRequests.set(trimmedToken, request);
      }

      const initialBootstrap = await request;
      applyBootstrap(initialBootstrap);
      markBridgeTokenHandled(trimmedToken);
      stripBridgeTokenFromUrl();

      const nextUser = await refreshMe();
      if (nextUser?.ata_user_type === 'parent') {
        try {
          await refreshWorkspaceScope();
        } catch {
          // Keep the exchange bootstrap as the initial state if the immediate refresh fails.
        }
      }

      setBridgeHandled(true);
    } catch (error) {
      clearBridgeHandledMarker(trimmedToken);
      stripBridgeTokenFromUrl();
      const message = getErrorMessage(error, 'Bridge exchange failed.');
      setBridgeError(message);
      clearSession();
      setUser(null);
      clearBootstrap();
      throw new Error(message);
    } finally {
      setExchangeInFlight(false);
    }
  }, [applyBootstrap, clearBootstrap, refreshMe, refreshWorkspaceScope]);

  const logout = useCallback(async () => {
    try {
      await authAPI.signOut();
    } finally {
      clearSession();
      setUser(null);
      clearBootstrap();
      setBridgeHandled(false);
      setBridgeError(null);
      setAuthRequired(true);
    }
  }, [clearBootstrap]);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      setInitializing(true);
      setBridgeError(null);

      try {
        const bridgeToken = getBridgeTokenFromLocation();

        if (bridgeToken) {
          await bootstrapFromBridgeToken(bridgeToken);
          return;
        }

        if (!hasSession()) {
          if (!cancelled) {
            setUser(null);
            clearBootstrap();
          }
          return;
        }

        const nextUser = await refreshMe();
        if (cancelled) {
          return;
        }

        if (nextUser?.ata_user_type === 'parent') {
          try {
            await refreshWorkspaceScope();
          } catch {
            await refreshBootstrap();
          }
        } else {
          clearBootstrap();
        }
      } catch (error) {
        if (!cancelled) {
          clearSession();
          setUser(null);
          clearBootstrap();
          setBridgeError((current) => current || getErrorMessage(error, 'Failed to initialize session.'));
        }
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [bootstrapFromBridgeToken, clearBootstrap, refreshBootstrap, refreshMe, refreshWorkspaceScope]);

  const isParentSession = Boolean(user?.isAuthenticated && (user?.ata_user_type || '').toLowerCase() === 'parent');

  const getChildById = useCallback((studentId: string) => {
    return childrenState.find((child) => child.student_id === studentId);
  }, [childrenState]);

  const canUseAiForChild = useCallback((studentId?: string | null) => {
    if (!isParentSession) {
      return true;
    }

    const allowedTools = workspacePolicy.allowed_tools || [];
    if (allowedTools.length === 0) {
      return false;
    }

    const childIds = workspacePolicy.child_ids_with_ai_access || [];
    if (!studentId) {
      return Boolean(workspacePolicy.can_use_standalone_workspaces);
    }

    if (childIds.length === 0) {
      return false;
    }

    return childIds.includes(studentId);
  }, [
    isParentSession,
    workspacePolicy.allowed_tools,
    workspacePolicy.can_use_standalone_workspaces,
    workspacePolicy.child_ids_with_ai_access,
  ]);

  const isToolAllowed = useCallback((toolKey: string) => {
    if (!isParentSession) {
      return true;
    }
    return (workspacePolicy.allowed_tools || []).includes(toolKey);
  }, [isParentSession, workspacePolicy.allowed_tools]);

  const value = useMemo<AuthContextType>(() => ({
    user,
    parent,
    children: childrenState,
    defaultChildId,
    workspacePolicy,
    authRequired,
    bootstrapReady,
    initializing,
    loading: initializing,
    exchangeInFlight,
    bridgeHandled,
    bridgeError,
    isParentSession,
    bootstrapFromBridgeToken,
    refreshMe,
    refreshBootstrap,
    refreshWorkspaceScope,
    logout,
    getChildById,
    canUseAiForChild,
    isToolAllowed,
  }), [
    authRequired,
    bootstrapFromBridgeToken,
    bootstrapReady,
    bridgeError,
    bridgeHandled,
    canUseAiForChild,
    childrenState,
    defaultChildId,
    exchangeInFlight,
    getChildById,
    initializing,
    isParentSession,
    isToolAllowed,
    logout,
    parent,
    refreshBootstrap,
    refreshWorkspaceScope,
    refreshMe,
    user,
    workspacePolicy,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
