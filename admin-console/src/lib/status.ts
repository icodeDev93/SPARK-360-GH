import type { BusinessStatus } from '@/types';

export type StatusFilter = 'all' | BusinessStatus;

export const statusConfig: Record<
  BusinessStatus,
  { label: string; badge: string; dot: string; action: string; actionLabel: string }
> = {
  pending: {
    label: 'Pending',
    badge: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
    dot: 'bg-amber-500',
    action: 'border-amber-200 text-amber-700 hover:bg-amber-50',
    actionLabel: 'Mark Pending',
  },
  active: {
    label: 'Active',
    badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
    dot: 'bg-emerald-500',
    action: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
    actionLabel: 'Activate',
  },
  inactive: {
    label: 'Inactive',
    badge: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/10',
    dot: 'bg-slate-400',
    action: 'border-slate-200 text-slate-700 hover:bg-slate-50',
    actionLabel: 'Deactivate',
  },
  archived: {
    label: 'Archived',
    badge: 'bg-red-50 text-red-600 ring-1 ring-inset ring-red-600/10',
    dot: 'bg-red-500',
    action: 'border-red-200 text-red-600 hover:bg-red-50',
    actionLabel: 'Archive',
  },
};
