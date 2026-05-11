import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NotificationItem, NotifCategory } from '@/hooks/useNotifications';

interface Props {
  notifications: NotificationItem[];
  onDismiss: (id: string) => void;
  onDismissCategory: (cat?: NotifCategory) => void;
  onClose: () => void;
}

type Tab = 'All' | NotifCategory;

const TABS: Tab[] = ['All', 'Stock', 'Orders', 'Sales'];

const TAB_ICONS: Record<Tab, string> = {
  All:    'ri-notification-3-line',
  Stock:  'ri-box-3-line',
  Orders: 'ri-shopping-cart-2-line',
  Sales:  'ri-receipt-line',
};

// Icon + colour derived from notification id prefix / category / severity
function itemIcon(n: NotificationItem): { icon: string; bg: string; color: string } {
  if (n.category === 'Stock') {
    const isExpiry = n.id.startsWith('expiry-');
    const bg    = n.severity === 'critical' ? 'bg-red-100'    : n.severity === 'warning' ? 'bg-amber-100'  : 'bg-orange-100';
    const color = n.severity === 'critical' ? 'text-red-600'  : n.severity === 'warning' ? 'text-amber-600': 'text-orange-500';
    return { icon: isExpiry ? 'ri-timer-2-line' : 'ri-alert-line', bg, color };
  }
  if (n.category === 'Orders') {
    const isOverdue = n.id.startsWith('overdue-');
    return isOverdue
      ? { icon: 'ri-time-line',     bg: 'bg-red-100',   color: 'text-red-600'   }
      : { icon: 'ri-wallet-3-line', bg: 'bg-amber-100', color: 'text-amber-600' };
  }
  // Sales
  return n.id.startsWith('refund-')
    ? { icon: 'ri-arrow-go-back-line', bg: 'bg-red-100',     color: 'text-red-600'    }
    : { icon: 'ri-receipt-line',       bg: 'bg-emerald-100', color: 'text-emerald-600' };
}

const ROUTE_LABELS: Partial<Record<Tab, string>> = {
  Stock:  'View Inventory →',
  Orders: 'View Purchases →',
  Sales:  'View Sales History →',
};

const CATEGORY_ROUTES: Record<NotifCategory, string> = {
  Stock:  '/inventory',
  Orders: '/purchases',
  Sales:  '/sales-history',
};

const EMPTY_MSGS: Record<Tab, string> = {
  All:    'No active notifications',
  Stock:  'All stock levels and expiry dates are healthy',
  Orders: 'No overdue or unpaid orders',
  Sales:  'No sales activity in the last 7 days',
};

export default function NotificationsDropdown({ notifications, onDismiss, onDismissCategory, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('All');
  const navigate = useNavigate();

  const visible = tab === 'All' ? notifications : notifications.filter((n) => n.category === tab);
  const countOf = (t: Tab) => t === 'All' ? notifications.length : notifications.filter((n) => n.category === t).length;

  function go(route: string) { navigate(route); onClose(); }

  const catLink = tab !== 'All' ? ROUTE_LABELS[tab] : undefined;
  const catRoute = tab !== 'All' ? CATEGORY_ROUTES[tab as NotifCategory] : undefined;

  return (
    <div
      className="absolute right-0 top-11 w-[22rem] bg-white border border-slate-200 rounded-2xl z-50 flex flex-col overflow-hidden"
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)', maxHeight: '80vh' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 text-sm">Notifications</span>
          {notifications.length > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600">
              {notifications.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button
              onClick={() => onDismissCategory(tab === 'All' ? undefined : tab)}
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer whitespace-nowrap transition-all"
            >
              Clear {tab === 'All' ? 'all' : tab.toLowerCase()}
            </button>
          )}
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 cursor-pointer"
          >
            <i className="ri-close-line text-sm"></i>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 flex-shrink-0">
        {TABS.map((t) => {
          const count = countOf(t);
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold transition-all cursor-pointer border-b-2 ${
                active ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <i className={`${TAB_ICONS[t]} text-sm`}></i>
              <span className="flex items-center gap-1">
                {t}
                {count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                    active ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {count}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 px-4 text-center">
            <span className="w-10 h-10 flex items-center justify-center bg-emerald-50 rounded-full">
              <i className="ri-checkbox-circle-line text-emerald-500 text-xl"></i>
            </span>
            <p className="text-slate-500 text-sm font-semibold">All clear</p>
            <p className="text-slate-400 text-xs">{EMPTY_MSGS[tab]}</p>
          </div>
        ) : (
          visible.map((n) => {
            const { icon, bg, color } = itemIcon(n);
            const hasImage = !!n.image;
            return (
              <div
                key={n.id}
                className="flex items-start gap-3 px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-all group"
              >
                {/* Avatar / Icon */}
                <div className={`w-10 h-10 flex-shrink-0 rounded-xl overflow-hidden flex items-center justify-center border border-slate-100 ${hasImage ? 'bg-slate-100' : bg}`}>
                  {hasImage
                    ? <img src={n.image} alt={n.title} className="w-full h-full object-cover object-top" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement)?.style.removeProperty('display'); }} />
                    : null
                  }
                  {/* Fallback initials or icon — hidden when image loads */}
                  <span
                    className={`text-xs font-bold leading-none select-none ${hasImage ? 'hidden' : color}`}
                    style={hasImage ? {} : {}}
                  >
                    {n.initials
                      ? <span className={color}>{n.initials}</span>
                      : <i className={`${icon} text-base ${color}`}></i>
                    }
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 text-sm font-semibold truncate">{n.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5 truncate">{n.subtitle}</p>
                  {n.badge && (
                    <span className={`inline-flex items-center mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${n.badgeColor}`}>
                      {n.badge}
                    </span>
                  )}
                </div>

                {/* Dismiss */}
                <button
                  onClick={() => onDismiss(n.id)}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-200 text-slate-300 hover:text-slate-500 cursor-pointer flex-shrink-0 mt-0.5 transition-all opacity-0 group-hover:opacity-100"
                >
                  <i className="ri-close-line text-sm"></i>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between flex-shrink-0">
        <span className="text-xs text-slate-400">
          {notifications.filter((n) => n.severity === 'critical').length} critical ·{' '}
          {notifications.filter((n) => n.severity === 'warning').length} warnings
        </span>
        {catLink && catRoute && (
          <button
            onClick={() => go(catRoute)}
            className="text-indigo-600 text-xs font-semibold hover:underline cursor-pointer whitespace-nowrap"
          >
            {catLink}
          </button>
        )}
      </div>
    </div>
  );
}
