import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, X, Send, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

export function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Msg = { role: "user", content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsert(content);
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e: any) {
      console.error("AI chat error:", e);
      toast.error(e.message || "Failed to get AI response");
      // Remove the user message if no assistant response was generated
      if (!assistantSoFar) {
        setMessages(messages);
      }
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages]);

  return (
    <>
      {/* Floating trigger */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
          aria-label="Open AI Assistant"
        >
          <Bot className="h-6 w-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-4 right-4 z-50 w-[90vw] max-w-md h-[70vh] max-h-[600px] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border bg-primary/5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">PrepWise AI</p>
                <p className="text-[10px] text-muted-foreground">Your interview coach</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-8">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Hi! I'm your PrepWise AI assistant</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
                    Ask me anything about interview prep, how to use the platform, or tips to improve your performance.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                  {[
                    "How do I start a mock interview?",
                    "Give me tips for behavioral questions",
                    "How do I create a live room?",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); }}
                      className="text-[11px] px-2.5 py-1.5 rounded-full border border-border bg-background hover:bg-muted text-foreground transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "assistant" && (
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  )}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-3 w-3 text-accent-foreground" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-2 items-center">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-3 w-3 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-md px-3.5 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Ask me anything..."
                rows={1}
                className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring max-h-24 min-h-[40px]"
              />
              <Button
                size="icon"
                className="h-10 w-10 rounded-xl shrink-0"
                onClick={send}
                disabled={!input.trim() || isLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
