import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { CaretDown, Gear, House } from '@phosphor-icons/react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { ParentAccountMenu } from './ParentAccountMenu';
import { useAuth } from '@/hooks/useAuth';
import { getAssetPath } from '@/lib/runtime';

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-primary/10 hover:text-foreground'
  }`;

export const ParentAppShell: React.FC = () => {
  const navigate = useNavigate();
  const { children, defaultChildId } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-3 text-left"
            >
              <img
                src={getAssetPath('/mst_logo_no_bg.png')}
                alt="MST logo"
                className="h-11 w-auto shrink-0 object-contain"
              />
              <div>
                <div className="text-lg font-semibold">MST Parent Portal</div>
                <div className="text-xs text-muted-foreground">Family-linked study workspaces</div>
              </div>
            </button>

            <nav className="hidden items-center gap-2 md:flex">
              <NavLink to="/" end className={navLinkClassName}>
                <House size={16} />
                Dashboard
              </NavLink>
              <NavLink to="/settings" className={navLinkClassName}>
                <Gear size={16} />
                Settings
              </NavLink>
              {defaultChildId ? (
                <Button variant="ghost" size="sm" onClick={() => navigate(`/children/${defaultChildId}`)}>
                  Default child
                </Button>
              ) : null}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {children.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    Children
                    <CaretDown size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {children.map((child) => (
                    <DropdownMenuItem key={child.student_id} onClick={() => navigate(`/children/${child.student_id}`)}>
                      {child.student_name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            <ParentAccountMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};
