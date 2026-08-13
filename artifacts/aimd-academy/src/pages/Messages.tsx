import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Send, Users, Plus, Search, ChevronLeft, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGetCurrentUser } from '@workspace/api-client-react';

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchConversations() {
  const r = await fetch('/api/conversations');
  return r.json();
}

async function fetchMessages(convId: number) {
  const r = await fetch(`/api/conversations/${convId}/messages`);
  return r.json();
}

async function sendMessage(convId: number, content: string) {
  const r = await fetch(`/api/conversations/${convId}/messages`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  return r.json();
}

async function startConversation(participantIds: number[]) {
  const r = await fetch('/api/conversations', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participantIds }),
  });
  return r.json();
}

// ─── Time helper ─────────────────────────────────────────────────────────────

function relTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = [
  'bg-primary/15 text-primary',
  'bg-violet-500/20 text-violet-400',
  'bg-amber-500/20 text-amber-400',
  'bg-sky-500/20 text-sky-400',
  'bg-rose-500/20 text-rose-400',
];

// ─── Conversation list item ───────────────────────────────────────────────────

function ConvItem({ conv, active, onClick }: { conv: any; active: boolean; onClick: () => void }) {
  const other = conv.participants?.[0];
  const name = conv.isGroup ? (conv.name ?? 'Group') : (other?.username ?? 'Unknown');
  const ini  = initials(name);
  const colorClass = AVATAR_COLORS[conv.id % AVATAR_COLORS.length];
  const hasUnread = (conv.unreadCount ?? 0) > 0;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 flex items-center gap-3 transition-colors border-b border-border/60 ${
        active ? 'bg-muted' : 'hover:bg-muted/40'
      }`}
    >
      <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm ${colorClass}`}>
        {conv.isGroup ? <Users className="w-4 h-4" /> : ini}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm font-semibold truncate ${hasUnread ? 'text-white' : 'text-foreground/80'}`}>{name}</span>
          {conv.lastMessage && (
            <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">
              {relTime(conv.lastMessage.createdAt)}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {conv.lastMessage ? `${conv.lastMessage.senderName === 'Alex Rivera' ? 'You' : conv.lastMessage.senderName}: ${conv.lastMessage.content}` : 'No messages yet'}
        </p>
      </div>
      {hasUnread && (
        <div className="flex-shrink-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
          <span className="text-[10px] font-bold text-zinc-950">{conv.unreadCount}</span>
        </div>
      )}
    </button>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, isMine }: { msg: any; isMine: boolean }) {
  const ini = initials(msg.senderName ?? '?');
  const colorClass = AVATAR_COLORS[msg.senderId % AVATAR_COLORS.length];

  return (
    <div className={`flex gap-2.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isMine && (
        <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-[11px] ${colorClass}`}>
          {ini}
        </div>
      )}
      <div className={`max-w-[70%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {!isMine && (
          <span className="font-mono text-[10px] text-muted-foreground ml-1">{msg.senderName}</span>
        )}
        <div className={`px-4 py-2.5 text-sm leading-relaxed ${
          isMine
            ? 'bg-primary text-zinc-950 font-medium rounded-2xl rounded-tr-sm'
            : 'bg-muted text-foreground rounded-2xl rounded-tl-sm'
        }`}>
          {msg.content}
        </div>
        <span className="font-mono text-[10px] text-muted-foreground mx-1">{relTime(msg.createdAt)}</span>
      </div>
    </div>
  );
}

// ─── Thread view ──────────────────────────────────────────────────────────────

// currentUserId resolved from Clerk session via useGetCurrentUser() below

function ThreadView({ convId, convName, onBack }: { convId: number; convName: string; onBack: () => void }) {
  const qc = useQueryClient();
  const { data: currentUser } = useGetCurrentUser();
  const currentUserId = currentUser?.id;
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', convId],
    queryFn: () => fetchMessages(convId),
    refetchInterval: 4000,
  });

  const send = useMutation({
    mutationFn: (content: string) => sendMessage(convId, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', convId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!draft.trim()) return;
    send.mutate(draft.trim());
    setDraft('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background flex-shrink-0">
        <button onClick={onBack} className="md:hidden p-1 text-muted-foreground hover:text-white">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="font-display font-bold text-white uppercase tracking-tight">{convName}</div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 min-h-0">
        {isLoading ? (
          <div className="font-mono text-xs text-muted-foreground text-center animate-pulse">Loading messages…</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="font-mono text-xs text-muted-foreground">No messages yet. Start the conversation.</p>
          </div>
        ) : (
          messages.map((msg: any) => (
            <MessageBubble key={msg.id} msg={msg} isMine={msg.senderId === currentUserId} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="px-4 py-3 border-t border-border bg-background flex-shrink-0">
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Write a message…"
            className="flex-1 bg-muted/40 border-border text-white placeholder:text-muted-foreground rounded-full focus:border-primary/50"
          />
          <Button
            onClick={handleSend}
            disabled={!draft.trim() || send.isPending}
            className="rounded-full w-10 h-10 p-0 bg-primary hover:bg-primary/90 text-zinc-950 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Messages() {
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
    refetchInterval: 8000,
  });

  const filtered = conversations.filter((c: any) => {
    const name = c.isGroup
      ? (c.name ?? 'Group')
      : (c.participants?.[0]?.username ?? '');
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const activeConv = conversations.find((c: any) => c.id === activeConvId);
  const activeConvName = activeConv
    ? activeConv.isGroup
      ? (activeConv.name ?? 'Group')
      : (activeConv.participants?.[0]?.username ?? 'Chat')
    : '';

  const totalUnread = conversations.reduce((n: number, c: any) => n + (c.unreadCount ?? 0), 0);

  return (
    <div className="h-[calc(100vh-56px)] md:h-screen flex overflow-hidden bg-background">
      {/* Sidebar — conversation list */}
      <div className={`flex-shrink-0 w-full md:w-80 border-r border-border flex flex-col ${activeConvId ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="px-4 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h1 className="font-display font-black text-xl uppercase tracking-tight text-white">Messages</h1>
              {totalUnread > 0 && (
                <span className="bg-primary text-zinc-950 font-bold text-[10px] rounded-full px-1.5 py-0.5">
                  {totalUnread}
                </span>
              )}
            </div>
            <button className="w-8 h-8 flex items-center justify-center border border-border hover:border-primary/50 hover:text-primary text-muted-foreground transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="pl-8 h-8 bg-muted/40 border-border text-sm placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 font-mono text-xs text-muted-foreground animate-pulse text-center">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="font-mono text-xs text-muted-foreground">No conversations yet.</p>
            </div>
          ) : (
            filtered.map((conv: any) => (
              <ConvItem
                key={conv.id}
                conv={conv}
                active={conv.id === activeConvId}
                onClick={() => setActiveConvId(conv.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Thread panel */}
      <div className={`flex-1 min-w-0 ${activeConvId ? 'flex flex-col' : 'hidden md:flex md:flex-col'}`}>
        {activeConvId ? (
          <ThreadView
            convId={activeConvId}
            convName={activeConvName}
            onBack={() => setActiveConvId(null)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
            <div className="w-16 h-16 rounded-full bg-muted/40 border border-border flex items-center justify-center">
              <MessageSquare className="w-7 h-7 text-muted-foreground" />
            </div>
            <div>
              <h2 className="font-display font-black text-xl uppercase text-white mb-1">Your Inbox</h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                Select a conversation to start messaging, or reach out to a creator from the directory.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
