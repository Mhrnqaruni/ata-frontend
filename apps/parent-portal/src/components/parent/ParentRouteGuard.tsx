import React from 'react';
import { Outlet } from 'react-router-dom';
import { CircleNotch, WarningCircle } from '@phosphor-icons/react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useAuth } from '@/hooks/useAuth';
import { AuthPage } from '../auth/AuthPage';

export const ParentRouteGuard: React.FC = () => {
  const { initializing, user, isParentSession, bootstrapReady, logout } = useAuth();

  if (initializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Preparing your parent workspace</CardTitle>
            <CardDescription>Loading your MST parent session and workspace permissions.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
            <CircleNotch size={18} className="animate-spin text-primary" />
            Please wait a moment.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user?.isAuthenticated) {
    return <AuthPage />;
  }

  if (!isParentSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-lg border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WarningCircle size={20} className="text-destructive" />
              Unsupported workspace session
            </CardTitle>
            <CardDescription>
              This frontend is reserved for MST parent sessions. Sign out and re-open the parent portal from MST.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => void logout()}>
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!bootstrapReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Loading your children</CardTitle>
            <CardDescription>Refreshing the parent dashboard data from MST.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
            <CircleNotch size={18} className="animate-spin text-primary" />
            Almost there.
          </CardContent>
        </Card>
      </div>
    );
  }

  return <Outlet />;
};
