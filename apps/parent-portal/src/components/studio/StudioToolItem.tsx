/**
 * StudioToolItem Component
 * Educational Note: Renders a single studio tool button with active/inactive state.
 * Active items (with signals) are highlighted and clickable.
 * Inactive items are dimmed but still visible for context.
 */

import React from 'react';
import { Button } from '../ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { cn } from '@/lib/utils';
import type { StudioSignal, StudioItemId } from './types';

interface StudioToolItemProps {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  signals: StudioSignal[];
  optionId?: StudioItemId;
  onClick?: (optionId: StudioItemId, signals: StudioSignal[]) => void;
  disabledMessage?: string;
}

export const StudioToolItem: React.FC<StudioToolItemProps> = ({
  title,
  icon: Icon,
  signals,
  optionId,
  onClick,
  disabledMessage,
}) => {
  const isActive = signals.length > 0 && Boolean(optionId) && !disabledMessage;

  const button = (
    <Button
      variant="soft"
      className={cn(
        'h-8 w-full justify-start px-2 py-1 text-left text-xs relative',
        isActive
          ? 'hover:bg-accent border-primary/30 bg-primary/5'
          : 'opacity-50 hover:opacity-70 hover:bg-muted cursor-default'
      )}
      onClick={() => {
        if (isActive && optionId && onClick) {
          onClick(optionId, signals);
        }
      }}
      disabled={!isActive}
    >
      <Icon
        size={14}
        className={cn(
          'mr-1.5 flex-shrink-0',
          isActive ? 'text-primary' : 'text-muted-foreground'
        )}
      />
      <span className={cn('truncate', isActive ? 'text-foreground' : 'text-muted-foreground')}>
        {title}
      </span>

      {/* Active indicator dot */}
      {isActive && (
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary rounded-full" />
      )}
    </Button>
  );

  if (!disabledMessage) {
    return button;
  }

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="block w-full">{button}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="px-2 py-1 text-[11px]">
          {disabledMessage}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
