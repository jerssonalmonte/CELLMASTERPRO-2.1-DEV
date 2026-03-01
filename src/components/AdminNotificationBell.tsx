import { useState, useEffect } from 'react';
import { Bell, CheckCheck, DollarSign, AlertTriangle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { parseISO, differenceInDays, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const db = supabase as any;

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function AdminNotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [expiringAlerts, setExpiringAlerts] = useState<{ name: string; daysLeft: number }[]>([]);
  const [open, setOpen] = useState(false);

  const loadData = async () => {
    const [nRes, tRes] = await Promise.all([
      db.from('saas_notifications').select('*').order('created_at', { ascending: false }).limit(20),
      db.from('tenants').select('id, name, next_due_date, subscription_plan, subscription_status'),
    ]);
    setNotifications(nRes.data || []);

    const today = new Date();
    const alerts = (tRes.data || [])
      .filter((t: any) => {
        if (!t.next_due_date || t.subscription_plan === 'lifetime' || t.subscription_status === 'suspendida') return false;
        const days = differenceInDays(parseISO(t.next_due_date), today);
        return days <= 7;
      })
      .map((t: any) => ({
        name: t.name,
        daysLeft: differenceInDays(parseISO(t.next_due_date), today),
      }))
      .sort((a: any, b: any) => a.daysLeft - b.daysLeft);
    setExpiringAlerts(alerts);
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (open) loadData(); }, [open]);

  const unreadCount = notifications.filter(n => !n.is_read).length + expiringAlerts.length;

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await db.from('saas_notifications').update({ is_read: true }).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-200">
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-lg shadow-red-500/30">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[360px] p-0 bg-[hsl(220,20%,8%)] border-white/[0.08] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <span className="text-[13px] font-semibold text-slate-100">Notificaciones</span>
          {notifications.some(n => !n.is_read) && (
            <Button variant="ghost" size="sm" className="h-6 text-[11px] text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-2" onClick={markAllRead}>
              <CheckCheck className="h-3 w-3 mr-1" /> Marcar leídas
            </Button>
          )}
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {/* Expiring membership alerts (computed on-the-fly) */}
          {expiringAlerts.map((alert, i) => (
            <div key={`exp-${i}`} className="flex items-start gap-2.5 px-4 py-3 border-b border-white/[0.04] bg-amber-500/[0.03]">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-amber-300">Membresía por vencer</p>
                <p className="text-[12px] text-slate-400 mt-0.5">
                  {alert.name} — {alert.daysLeft < 0 ? `Vencida hace ${Math.abs(alert.daysLeft)}d` : alert.daysLeft === 0 ? 'Vence hoy' : `${alert.daysLeft}d restantes`}
                </p>
              </div>
            </div>
          ))}

          {/* DB notifications */}
          {notifications.map(n => (
            <div key={n.id} className={`flex items-start gap-2.5 px-4 py-3 border-b border-white/[0.04] transition-colors ${!n.is_read ? 'bg-blue-500/[0.03]' : ''}`}>
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-medium text-slate-200">{n.title}</p>
                  {!n.is_read && <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />}
                </div>
                <p className="text-[12px] text-slate-400 mt-0.5">{n.message}</p>
                <p className="text-[10px] text-slate-600 mt-1">
                  {formatDistanceToNow(parseISO(n.created_at), { addSuffix: true, locale: es })}
                </p>
              </div>
            </div>
          ))}

          {notifications.length === 0 && expiringAlerts.length === 0 && (
            <div className="py-10 text-center">
              <Bell className="h-6 w-6 text-slate-600 mx-auto mb-2" />
              <p className="text-[13px] text-slate-500">Sin notificaciones</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
