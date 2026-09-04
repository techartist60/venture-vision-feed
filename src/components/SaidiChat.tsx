import { AtomLoader } from '@/components/ui/AtomLoader';
import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Bot, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

type Message = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/saidi-chat`;

const GREETING: Message = {
  role: 'assistant',
  content: "Hey there! 👋 I'm **Saidi**, your Idestrim AI assistant. Ask me anything — from navigating the platform to brainstorming your next big idea!\n\n💡 *Tip: Long-press any button in the app to ask me for help about it!*",
};

interface SaidiChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SaidiChat({ open, onOpenChange }: SaidiChatProps) {
  const setOpen = onOpenChange;
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Long-press handler: listen for long-press on ANY interactive element
  useEffect(() => {
    let pressTimer: ReturnType<typeof setTimeout> | null = null;
    let pressTarget: HTMLElement | null = null;
    let startX = 0;
    let startY = 0;

    const INTERACTIVE_SELECTOR =
      'button, a, [role="button"], [role="tab"], [role="menuitem"], [role="link"], input, select, textarea, [tabindex], nav a, label';

    const getHelpContext = (el: HTMLElement): string | null => {
      // Never trigger inside the Saidi chat itself or the FAB hub
      if (el.closest('[data-saidi-input], [data-saidi-panel], [data-fab-hub]')) return null;

      // Check for explicit data-saidi-help attribute up the tree
      let current: HTMLElement | null = el;
      while (current) {
        const help = current.getAttribute('data-saidi-help');
        if (help) return help;
        current = current.parentElement;
      }

      // Find nearest interactive element
      const interactive = el.closest(INTERACTIVE_SELECTOR) as HTMLElement | null;
      if (interactive) {
        const label =
          interactive.getAttribute('aria-label') ||
          interactive.getAttribute('title') ||
          interactive.getAttribute('data-saidi-help') ||
          interactive.textContent?.replace(/\s+/g, ' ').trim().slice(0, 80);

        if (label && label.length > 1) {
          return `I long-pressed "${label}" on Idestrim. Explain in depth what it is, exactly what happens when I use it, how it fits into the Idestrim workflow, a practical tip, and related features I should know about.`;
        }
      }

      // Fallback: long-press anywhere else — describe the surrounding content
      const text = el.textContent?.replace(/\s+/g, ' ').trim().slice(0, 80);
      const page = document.title || window.location.pathname;
      if (text && text.length > 1) {
        return `I long-pressed on this content on Idestrim (page: ${page}): "${text}". Explain in depth what this is, what I can do with it, how it fits into the Idestrim workflow, a practical tip, and related features I should know about.`;
      }
      return `I long-pressed on the ${page} page on Idestrim. Explain in depth what this page/area is for, what I can do here, a practical tip, and related features I should know about.`;
    };

    const startPress = (e: PointerEvent) => {
      // Only primary button / single touch, and never on form controls
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      pressTarget = e.target as HTMLElement;
      startX = e.clientX;
      startY = e.clientY;

      pressTimer = setTimeout(() => {
        pressTimer = null;
        const context = getHelpContext(pressTarget!);
        if (context) {
          onOpenChange(true);
          setInput(context);
          pendingSendRef.current = true;
        }
      }, 800);
    };

    const cancelPress = () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    };

    // Cancel on any real movement so taps and scrolls are never hijacked
    const moveCheck = (e: PointerEvent) => {
      if (!pressTimer) return;
      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);
      if (dx > 6 || dy > 6) cancelPress();
    };

    document.addEventListener('pointerdown', startPress);
    document.addEventListener('pointerup', cancelPress);
    document.addEventListener('pointercancel', cancelPress);
    document.addEventListener('pointermove', moveCheck);
    window.addEventListener('scroll', cancelPress, true);
    window.addEventListener('blur', cancelPress);

    return () => {
      document.removeEventListener('pointerdown', startPress);
      document.removeEventListener('pointerup', cancelPress);
      document.removeEventListener('pointercancel', cancelPress);
      document.removeEventListener('pointermove', moveCheck);
      window.removeEventListener('scroll', cancelPress, true);
      window.removeEventListener('blur', cancelPress);
      cancelPress();
    };
  }, [onOpenChange]);


  // Listen for auto-send event from long-press
  const pendingSendRef = useRef(false);
  useEffect(() => {
    if (input && pendingSendRef.current) {
      pendingSendRef.current = false;
      handleSend();
    }
  }, [input]);

  const streamChat = useCallback(async (allMessages: Message[]) => {
    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: allMessages }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || `Error ${resp.status}`);
    }

    if (!resp.body) throw new Error('No response body');

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let assistantSoFar = '';

    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      const snapshot = assistantSoFar;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && prev.length > 1 && last.content !== GREETING.content) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: snapshot } : m));
        }
        return [...prev, { role: 'assistant', content: snapshot }];
      });
    };

    let done = false;
    while (!done) {
      const { done: rDone, value } = await reader.read();
      if (rDone) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || !line.trim()) continue;
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') { done = true; break; }
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) upsert(content);
        } catch {
          buffer = line + '\n' + buffer;
          break;
        }
      }
    }
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const history = messages.filter(m => m !== GREETING);
      await streamChat([...history, userMsg]);
    } catch (e: any) {
      toast({ title: 'Saidi Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, streamChat, toast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Expose a way to open Saidi with a pre-filled question
  useEffect(() => {
    const handler = (e: CustomEvent<{ question: string }>) => {
      setOpen(true);
      setInput(e.detail.question);
      pendingSendRef.current = true;
    };
    window.addEventListener('saidi-ask' as any, handler);
    return () => window.removeEventListener('saidi-ask' as any, handler);
  }, []);

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div
          data-saidi-panel
          className={cn(
            "fixed z-[100] flex flex-col",
            "bottom-4 left-4 sm:left-auto sm:right-4 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-6rem)]",
            "rounded-2xl overflow-hidden border border-border/60",
            "bg-background shadow-[0_20px_60px_-12px_rgba(0,0,0,0.5)]",
            "animate-in fade-in slide-in-from-bottom-4 duration-300"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <div>
                <h3 className="text-sm font-bold leading-tight">Saidi</h3>
                <p className="text-[10px] opacity-80">Idestrim AI Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Close Saidi"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-2", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    msg.role === 'user'
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  )}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="m-0 whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-2">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <AtomLoader size={28} />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border/60 px-3 py-2.5 flex gap-2 items-end bg-background">
            <textarea
              ref={inputRef}
              data-saidi-input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Saidi anything..."
              rows={1}
              className="flex-1 resize-none bg-muted rounded-xl px-3 py-2.5 text-sm
                placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40
                max-h-24 scrollbar-thin"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center
                justify-center shrink-0 disabled:opacity-40 hover:bg-primary/90 transition-colors"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
