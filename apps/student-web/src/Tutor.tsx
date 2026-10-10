import { useEffect } from "react";
import type { UnitData } from "../../../packages/contracts/content";
import { useChatStore, newChat } from "./tutor/store";
import { ChatPanel } from "./tutor/ChatPanel";
export function Tutor({
  unit,
  release,
  onReport,
  user,
  keepHistory,
  onOpen,
}: {
  unit: UnitData;
  release: string;
  onReport: (id: string) => void;
  user: string;
  keepHistory: boolean;
  onOpen: () => void;
}) {
  const { store, state } = useChatStore(user);
  const chat = state.chats.find(
    (c) =>
      c.mode === "lesson" && c.unit_id === unit.id && c.release === release,
  );
  useEffect(() => {
    store.configure(keepHistory);
    if (
      !store.state.chats.some(
        (c) =>
          c.mode === "lesson" && c.unit_id === unit.id && c.release === release,
      )
    )
      store.add(newChat(unit.id, release, "lesson"));
  }, [store, unit.id, release, keepHistory]);
  return (
    <div className="stack">
      <div className="row between">
        <h2>লিখে কথা বলি</h2>
        <button onClick={onOpen}>এই পাঠ নিয়ে AI অনুশীলন</button>
      </div>
      {chat && (
        <ChatPanel
          user={user}
          chat={chat}
          unit={unit}
          onReport={onReport}
          embedded
        />
      )}
    </div>
  );
}
