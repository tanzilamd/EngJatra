import { z } from "zod";
import { ChatThread, type ChatThreadData } from "../contracts/tutor";
const CachedChat = ChatThread.extend({
  draft: z.string().max(1500),
  cloudId: z.string().uuid().optional(),
  interrupted: z.boolean().optional(),
});
export function encodeTutorSession(
  selected: string | null,
  chats: (ChatThreadData & {
    draft: string;
    cloudId?: string;
    busy: boolean;
  })[],
) {
  const raw = JSON.stringify({
    selected,
    chats: chats.map(
      ({
        id,
        unit_id,
        release,
        mode,
        title,
        created_at,
        messages,
        draft,
        cloudId,
        busy,
      }) => ({
        id,
        unit_id,
        release,
        mode,
        title,
        created_at,
        messages,
        draft,
        cloudId,
        interrupted: busy,
      }),
    ),
  });
  if (raw.length > 500000) throw Error("STORAGE_CAPACITY");
  return raw;
}
export function decodeTutorSession(raw: string) {
  if (raw.length > 500000) throw Error("STORAGE_CAPACITY");
  const data: unknown = JSON.parse(raw);
  const parsed = z
    .object({
      selected: z.string().uuid().nullable(),
      chats: z.array(CachedChat).max(20),
    })
    .strict()
    .parse(Array.isArray(data) ? { selected: null, chats: data } : data);
  return {
    ...parsed,
    selected: parsed.chats.some((c) => c.id === parsed.selected)
      ? parsed.selected
      : (parsed.chats.at(-1)?.id ?? null),
  };
}
