import React from 'react';
import { SignOut, UserCircle, ArrowSquareOut, Gear } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { useAuth } from '@/hooks/useAuth';

const ATA_PARENT_APP_URL = import.meta.env.VITE_ATA_PARENT_APP_URL || '';

export const ParentAccountMenu: React.FC = () => {
  const navigate = useNavigate();
  const { user, parent, logout } = useAuth();

  const handleReturnToAta = () => {
    if (!ATA_PARENT_APP_URL) {
      return;
    }
    window.location.assign(ATA_PARENT_APP_URL);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="soft" size="sm" className="gap-2 rounded-full px-4">
          <UserCircle size={18} />
          <span className="hidden sm:inline">{parent?.full_name || user?.email || 'Account'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-1">
          <div className="text-sm font-semibold">{parent?.full_name || 'Parent account'}</div>
          <div className="text-xs font-normal text-muted-foreground">{user?.email || 'No email available'}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/settings')}>
          <Gear size={16} className="mr-2" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleReturnToAta} disabled={!ATA_PARENT_APP_URL}>
          <ArrowSquareOut size={16} className="mr-2" />
          Return to MST
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void logout()}>
          <SignOut size={16} className="mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
