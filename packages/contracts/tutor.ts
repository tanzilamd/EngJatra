import { z } from "zod";
import { TutorReply, Release } from "./api";
import { unitId } from "./content";
export const TutorMode = z.enum(["conversation", "lesson"]);
export type TutorModeData = z.infer<typeof TutorMode>;
export const ChatMessage = z
  .object({
    id: z.string().uuid(),
    role: z.enum(["user", "assistant"]),
    content: z.string().max(1500),
    reply: TutorReply.nullable().optional(),
  })
  .strict();
export const ChatHeader = z
  .object({
    id: z.string().uuid(),
    unit_id: unitId,
    release: Release,
    mode: TutorMode,
    title: z.string().min(1).max(80),
    created_at: z.string(),
  })
  .strict();
export const ChatThread = ChatHeader.extend({
  messages: z.array(ChatMessage).max(50),
});
export type ChatHeaderData = z.infer<typeof ChatHeader>;
export type ChatThreadData = z.infer<typeof ChatThread>;
export const ChatResult = z.object({
  reply: TutorReply.optional(),
  error: z.string().optional(),
  fallback_activity: z.string().optional(),
  local_demo: z.boolean().optional(),
  conversation_id: z.string().uuid().nullable().optional(),
  history_status: z
    .enum(["saved", "disabled", "unavailable", "full"])
    .optional(),
});
export type ChatResultData = z.infer<typeof ChatResult>;
export const ChatTurn = z
  .object({
    conversation_id: z.string().uuid().nullable().default(null),
    request_id: z.string().uuid(),
  })
  .strict();
