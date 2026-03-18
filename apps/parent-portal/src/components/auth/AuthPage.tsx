import React from 'react';
import { CircleNotch, ArrowSquareOut, WarningCircle } from '@phosphor-icons/react';
import { Navigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { getBridgeTokenFromLocation } from '@/lib/auth/bridge';
import { useAuth } from '@/hooks/useAuth';
import { getAssetPath } from '@/lib/runtime';

const ATA_PARENT_APP_URL = import.meta.env.VITE_ATA_PARENT_APP_URL || '';

export const AuthPage: React.FC = () => {
  const { initializing, exchangeInFlight, bridgeError, user } = useAuth();
  const hasBridgeToken = Boolean(getBridgeTokenFromLocation());

  const handleReturnToAta = () => {
    if (!ATA_PARENT_APP_URL) {
      return;
    }
    window.location.assign(ATA_PARENT_APP_URL);
  };

  if (user?.isAuthenticated && !initializing && !exchangeInFlight && !hasBridgeToken) {
    return <Navigate to="/" replace />;
  }

  if (initializing || exchangeInFlight || hasBridgeToken || user?.isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <img
              src={getAssetPath('/mst_logo_no_bg.png')}
              alt="MST logo"
              className="mb-2 h-12 w-auto self-start object-contain"
            />
            <CardTitle>Opening MST Parent Portal</CardTitle>
            <CardDescription>
              {hasBridgeToken
                ? 'Exchanging the MST bridge token and starting your MST parent workspace session.'
                : 'Checking for an existing parent workspace session.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
            <CircleNotch size={18} className="animate-spin text-primary" />
            Please wait.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (bridgeError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-lg border-destructive/30">
          <CardHeader>
            <img
              src={getAssetPath('/mst_logo_no_bg.png')}
              alt="MST logo"
              className="mb-2 h-12 w-auto self-start object-contain"
            />
            <CardTitle className="flex items-center gap-2">
              <WarningCircle size={20} className="text-destructive" />
              Parent portal launch failed
            </CardTitle>
            <CardDescription>
              The bridge token could not be exchanged into a workspace session. Return to MST and retry the launch.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {bridgeError}
            </div>
            <Button onClick={handleReturnToAta} disabled={!ATA_PARENT_APP_URL} className="gap-2">
              <ArrowSquareOut size={16} />
              Return to MST
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <img
            src={getAssetPath('/mst_logo_no_bg.png')}
            alt="MST logo"
            className="mb-2 h-12 w-auto self-start object-contain"
          />
          <CardTitle>Open the parent portal from MST</CardTitle>
          <CardDescription>
            This parent deployment does not expose direct sign in or sign up. Start from MST so the browser receives a short-lived bridge token and a scoped parent workspace session.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use the MST parent entry page to launch this portal. This frontend only talks to its own workspace BFF and never asks the browser to call MST parent APIs directly.
          </p>
          <Button onClick={handleReturnToAta} disabled={!ATA_PARENT_APP_URL} className="gap-2">
            <ArrowSquareOut size={16} />
            Return to MST
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
