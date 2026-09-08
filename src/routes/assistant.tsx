import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, SendHorizonal, Sparkles } from "lucide-react";
import { RegistrationMark } from "@/components/RegistrationMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "Ask AK — The Studio Assistant | AK Print Studio" },
      {
        name: "description",
        content:
          "Ask about pricing, materials, artwork specs and turnaround. Answers are grounded in the AK studio knowledge base, with sources shown.",
      },
      { property: "og:title", content: "Ask AK — The Studio Assistant" },
      { property: "og:description", content: "Grounded answers about custom printing, instantly." },
    ],
  }),
  component: Assistant,
});

type Message = { role: "user" | "assistant"; text: string; sources?: string[] };

const STARTERS = [
  "How much for 50 printed tees?",
  "What file format should I send?",
  "How long does a poster job take?",
  "Can you match a Pantone colour?",
];

function Assistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hi — I'm the AK Printshop assistant. Ask me anything about pricing, materials, artwork specs or turnaround, and I'll answer from the studio's own notes.",
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const ask = async (question: string) => {
    if (!question.trim() || thinking) return;
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setThinking(true);
    // An empty assistant bubble that fills word by word as the answer streams.
    setMessages((m) => [...m, { role: "assistant", text: "" }]);
    const patchLast = (patch: Partial<Message>) =>
      setMessages((m) => m.map((msg, i) => (i === m.length - 1 ? { ...msg, ...patch } : msg)));
    try {
      let text = "";
      await api.chatStream(question, {
        onSources: (sources) => patchLast({ sources }),
        onDelta: (delta) => {
          text += delta;
          patchLast({ text });
        },
      });
      if (!text.trim()) patchLast({ text: "I don't have an answer for that yet — message AK directly." });
    } catch {
      patchLast({ text: "I couldn't reach the studio brain just then. Try again in a moment." });
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-14">
      <div className="flex items-center gap-3">
        <RegistrationMark className="size-8" spin />
        <div>
          <h1 className="text-display text-3xl font-bold">Ask AK</h1>
          <p className="text-receipt text-muted-foreground">Retrieval-grounded studio assistant</p>
        </div>
      </div>

      <div className="mt-8 flex min-h-[52vh] flex-col gap-5 rounded-2xl border border-border bg-card p-6">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "ink-in max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                m.role === "user"
                  ? "rounded-br-sm bg-primary text-primary-foreground"
                  : "rounded-bl-sm bg-secondary text-secondary-foreground",
              )}
            >
              {m.text}
              {m.sources && m.sources.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
                  {m.sources.map((s) => (
                    <span
                      key={s}
                      className="text-receipt inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1"
                    >
                      <Sparkles className="size-3 text-accent" />
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Checking the studio notes…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {STARTERS.map((s) => (
          <button
            key={s}
            onClick={() => ask(s)}
            className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about pricing, materials, turnaround…"
          className="h-12"
        />
        <Button type="submit" size="lg" disabled={thinking} aria-label="Send">
          <SendHorizonal className="size-4" />
        </Button>
      </form>
    </div>
  );
}
