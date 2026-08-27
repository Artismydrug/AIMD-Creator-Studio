import { Bell, Heart, MessageSquare, UserPlus } from 'lucide-react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetNotificationsQueryKey,
  useGetNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  type Notification,
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(value).toLocaleDateString();
}

function detail(notification: Notification) {
  const name = notification.actor?.username ?? 'Someone';
  switch (notification.type) {
    case 'direct_message': return `${name} sent you a direct message`;
    case 'follow': return `${name} started following you`;
    case 'like': return `${name} liked your studio post`;
    case 'critique': return `${name} left a critique on your studio post`;
  }
}

function icon(notification: Notification) {
  if (notification.type === 'follow') return UserPlus;
  if (notification.type === 'like') return Heart;
  return MessageSquare;
}

export default function Notifications() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const notificationsQuery = useGetNotifications({ query: { queryKey: getGetNotificationsQueryKey(), refetchInterval: 30_000 } });
  const markOne = useMarkNotificationRead({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() }) },
  });
  const markAll = useMarkAllNotificationsRead({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() }) },
  });
  const notifications = notificationsQuery.data?.notifications ?? [];
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;

  const openNotification = (notification: Notification) => {
    if (!notification.readAt) markOne.mutate({ id: notification.id });
    if (notification.type === 'direct_message' && notification.conversationDestination) {
      navigate(`/messages?conversation=${notification.conversationDestination.conversationId}`);
    } else if (notification.type === 'follow' && notification.actor) {
      navigate(`/profile/${notification.actor.id}`);
    } else if (notification.postDestination) {
      navigate(notification.type === 'critique' ? '/community' : '/studio-log');
    } else if (notification.actor) {
      navigate(`/profile/${notification.actor.id}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-10 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest mb-2">
            <Bell className="w-4 h-4" /> Activity
          </div>
          <h1 className="font-display font-black text-4xl uppercase tracking-tight">Notifications</h1>
          <p className="font-mono text-sm text-muted-foreground mt-2">Recent activity from your creator network.</p>
        </div>
        <Button variant="outline" className="rounded-none font-mono text-xs uppercase" disabled={!unreadCount || markAll.isPending} onClick={() => markAll.mutate()}>
          {markAll.isPending ? 'Marking…' : 'Mark all read'}
        </Button>
      </header>

      {notificationsQuery.isLoading ? (
        <div className="py-20 text-center font-mono text-sm text-muted-foreground animate-pulse">Loading notifications…</div>
      ) : notificationsQuery.isError ? (
        <div className="py-16 text-center border border-destructive/30 bg-destructive/5">
          <p className="font-mono text-sm text-destructive mb-3">Could not load notifications.</p>
          <Button variant="outline" className="rounded-none" onClick={() => notificationsQuery.refetch()}>Try again</Button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-border">
          <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display font-bold text-xl uppercase">You&apos;re all caught up</h2>
          <p className="font-mono text-xs text-muted-foreground mt-2">New messages and creator activity will appear here.</p>
        </div>
      ) : (
        <div className="border border-border divide-y divide-border">
          {notifications.map((notification) => {
            const Icon = icon(notification);
            const unread = !notification.readAt;
            return (
              <button key={notification.id} onClick={() => openNotification(notification)} className={`w-full text-left flex items-center gap-4 p-4 transition-colors hover:bg-muted/60 ${unread ? 'bg-primary/5' : 'bg-background'}`}>
                <Avatar className="w-10 h-10 border border-border">
                  <AvatarImage src={notification.actor?.avatarUrl ?? ''} />
                  <AvatarFallback className="bg-muted text-primary font-bold">{notification.actor?.username?.slice(0, 2).toUpperCase() ?? '?'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${unread ? 'font-bold text-foreground' : 'text-foreground/80'}`}>{detail(notification)}</p>
                  <p className="font-mono text-[11px] text-muted-foreground mt-1">{relativeTime(notification.createdAt)}</p>
                </div>
                <Icon className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
                {unread && <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" aria-label="Unread" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}