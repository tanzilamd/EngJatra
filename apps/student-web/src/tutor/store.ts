import { useSyncExternalStore } from "react";
import { type ChatThreadData } from "../../../../packages/contracts/tutor";
import type { TutorData } from "../../../../packages/contracts/api";
import {
  encodeTutorSession,
  decodeTutorSession,
} from "../../../../packages/data/tutor-session";
export type LocalChat = ChatThreadData & {
  draft: string;
  busy: boolean;
  error: string;
  cloudId?: string;
  contextDetached?: boolean;
  historyStatus?: "saved" | "disabled" | "unavailable" | "full";
};
type State = {
  selected: string | null;
  chats: LocalChat[];
  consent: boolean;
  storageError: boolean;
};
const empty = (): State => ({
  selected: null,
  chats: [],
  consent: false,
  storageError: false,
});
const stores = new Map<string, ChatStore>();
class ChatStore {
  state = empty();
  listeners = new Set<() => void>();
  keep = false;
  restored = false;
  constructor(readonly key: string) {}
  subscribe = (f: () => void) => {
    this.listeners.add(f);
    return () => {
      this.listeners.delete(f);
    };
  };
  get = () => this.state;
  configure(keep: boolean) {
    this.keep = keep;
    if (keep && !this.restored) {
      this.restored = true;
      try {
        const raw = sessionStorage.getItem(this.key);
        if (raw && raw.length < 500000) {
          const parsed = decodeTutorSession(raw);
          if (!this.state.chats.length)
            this.state = {
              ...this.state,
              chats: parsed.chats.map(({ interrupted, ...c }) => ({
                ...c,
                busy: false,
                error: interrupted
                  ? "আগের অনুরোধের ফল পাওয়া যায়নি। আবার পাঠানোর আগে ইতিহাস দেখে নিতে পারো।"
                  : "",
              })),
              selected: parsed.selected,
            };
        }
      } catch {
        this.state = { ...this.state, storageError: true };
      }
    }
    if (!keep) {
      try {
        sessionStorage.removeItem(this.key);
      } catch {
        /* ephemeral memory remains usable */
      }
    }
    this.emit();
  }
  emit() {
    if (this.keep) {
      try {
        const raw = encodeTutorSession(this.state.selected, this.state.chats);
        sessionStorage.setItem(this.key, raw);
      } catch {
        this.state = { ...this.state, storageError: true };
      }
    }
    this.listeners.forEach((f) => f());
  }
  select(id: string) {
    if (this.state.chats.some((c) => c.id === id)) {
      this.state = { ...this.state, selected: id };
      this.emit();
    }
  }
  consent(value: boolean) {
    this.state = { ...this.state, consent: value };
    this.emit();
  }
  patch(id: string, change: Partial<LocalChat>) {
    this.state = {
      ...this.state,
      chats: this.state.chats.map((c) =>
        c.id === id ? { ...c, ...change } : c,
      ),
    };
    this.emit();
  }
  add(chat: LocalChat) {
    // Never evict unsent/in-flight chats to make space.
    if (this.state.chats.length >= 20) return false;
    this.state = {
      ...this.state,
      chats: [...this.state.chats, chat],
      selected: chat.id,
    };
    this.emit();
    return true;
  }
  remove(id: string) {
    this.state = {
      ...this.state,
      chats: this.state.chats.filter((c) => c.id !== id),
      selected: this.state.selected === id ? null : this.state.selected,
    };
    this.emit();
  }
  clear() {
    this.state = empty();
    try {
      sessionStorage.removeItem(this.key);
    } catch {
      /* no secret logs */
    }
    this.emit();
  }
}
export function useChatStore(user: string) {
  const key = `engjatra.chat.tab.${user}`;
  if (!stores.has(key)) stores.set(key, new ChatStore(key));
  const store = stores.get(key)!;
  return { store, state: useSyncExternalStore(store.subscribe, store.get) };
}
export function conversationContext(chat: LocalChat) {
  return chat.messages.slice(-6).map((m) => ({
    role: m.role,
    text: (m.reply
      ? `${m.reply.assistant_reply_en} ${m.reply.next_question_en}`
      : m.content
    ).slice(0, 1000),
  }));
}
export function newChat(
  unit_id: string,
  release: string,
  mode: LocalChat["mode"],
): LocalChat {
  return {
    id: crypto.randomUUID(),
    unit_id,
    release,
    mode,
    title: mode === "lesson" ? "পাঠ নিয়ে অনুশীলন" : "নতুন কথোপকথন",
    created_at: new Date().toISOString(),
    messages: [],
    draft: "",
    busy: false,
    error: "",
  };
}
export function completeTurn(chat: LocalChat, text: string, reply: TutorData) {
  return [
    ...chat.messages,
    { id: crypto.randomUUID(), role: "user" as const, content: text },
    {
      id: crypto.randomUUID(),
      role: "assistant" as const,
      content: reply.assistant_reply_en,
      reply,
    },
  ];
}
window.addEventListener("engjatra:logout", () => {
  stores.forEach((s) => {
    s.keep = false;
    s.clear();
  });
  stores.clear();
});
