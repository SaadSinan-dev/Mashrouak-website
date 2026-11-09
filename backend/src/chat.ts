import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import {
  conversationInput,
  messageInput,
  type Conversation,
  type Message,
  type SettingsContent,
} from "../../shared/schema";
import type { AppEnv, Ctx } from "./types";
import { id, now } from "./types";
import { auditStatement, authorize, rateLimit, visitorHash } from "./security";
import { publicEntries } from "./content";
import { assistantInstructions, getAssistant } from "./ai";

export const chat = new Hono<AppEnv>();
async function ownedConversation(c: Ctx, conversationId: string) {
  const visitor = await visitorHash(c);
  const row = await c.env.DB.prepare(
    "SELECT * FROM conversations WHERE id=? AND visitor_hash=?",
  )
    .bind(conversationId, visitor)
    .first<Conversation>();
  if (!row) throw new HTTPException(404, { message: "not_found" });
  return row;
}
async function enabled(c: Ctx) {
  const row = await c.env.DB.prepare(
    "SELECT published FROM content WHERE kind='settings' AND slug='global' AND status='published'",
  ).first<{ published: string }>();
  const settings = row?.published
    ? (JSON.parse(row.published) as SettingsContent)
    : null;
  if (settings?.chatEnabled === false)
    throw new HTTPException(503, { message: "chat_unavailable" });
  return settings;
}
export async function history(c: Ctx, conversationId: string) {
  const rows = await c.env.DB.prepare(
    "SELECT m.id,m.conversation_id,m.sender,m.body,m.client_id,m.read_at,m.created_at,u.name AS operator_name FROM (SELECT * FROM messages WHERE conversation_id=? ORDER BY created_at DESC,id DESC LIMIT 300) m LEFT JOIN users u ON u.id=m.operator_id ORDER BY m.created_at,m.id",
  )
    .bind(conversationId)
    .all<Message>();
  return rows.results;
}
chat.get("/session", async (c) => {
  const visitor = await visitorHash(c, true);
  const row = await c.env.DB.prepare(
    "SELECT id,name,email,language,status,assigned_to,ai_state,created_at,updated_at FROM conversations WHERE visitor_hash=? ORDER BY created_at DESC LIMIT 1",
  )
    .bind(visitor)
    .first<Conversation>();
  return c.json({ conversation: row });
});
chat.post("/conversations", async (c) => {
  await enabled(c);
  await rateLimit(c, "conversation", 5, 3600);
  const input = conversationInput.parse(await c.req.json());
  const visitor = await visitorHash(c, true);
  // Reuse the current conversation to make double submission safe.
  const existing = await c.env.DB.prepare(
    "SELECT id,name,email,language,status,assigned_to,ai_state,created_at,updated_at FROM conversations WHERE visitor_hash=? AND status!='resolved' ORDER BY created_at DESC LIMIT 1",
  )
    .bind(visitor)
    .first<Conversation>();
  if (existing) return c.json({ conversation: existing });
  const conversationId = id();
  await c.env.DB.prepare(
    "INSERT INTO conversations(id,visitor_hash,name,email,language,created_at,updated_at) VALUES(?,?,?,?,?,?,?)",
  )
    .bind(
      conversationId,
      visitor,
      input.name,
      input.email,
      input.language,
      now(),
      now(),
    )
    .run();
  const conversation = await c.env.DB.prepare(
    "SELECT id,name,email,language,status,assigned_to,ai_state,created_at,updated_at FROM conversations WHERE id=?",
  )
    .bind(conversationId)
    .first<Conversation>();
  return c.json({ conversation }, 201);
});
chat.get("/conversations/:id", async (c) => {
  await rateLimit(c, "chat-read", 120, 60);
  const conversation = await ownedConversation(c, c.req.param("id"));
  const { visitor_hash: _, ...safe } = conversation as Conversation & {
    visitor_hash: string;
  };
  void _;
  return c.json({
    conversation: safe,
    messages: await history(c, conversation.id),
  });
});
chat.post("/conversations/:id/messages", async (c) => {
  await enabled(c);
  const conversation = await ownedConversation(c, c.req.param("id"));
  await rateLimit(c, "message", 30, 60, conversation.id);
  const input = messageInput.parse(await c.req.json());
  if (conversation.status === "resolved")
    throw new HTTPException(409, { message: "conversation_resolved" });
  const timestamp = now();
  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO messages(id,conversation_id,sender,body,client_id,created_at) VALUES(?,?,'visitor',?,?,?) ON CONFLICT(conversation_id,sender,client_id) DO NOTHING",
    ).bind(id(), conversation.id, input.body, input.clientId, timestamp),
    c.env.DB.prepare("UPDATE conversations SET updated_at=? WHERE id=?").bind(
      timestamp,
      conversation.id,
    ),
  ]);
  return c.json({ messages: await history(c, conversation.id) }, 201);
});
chat.post("/conversations/:id/read", async (c) => {
  const conversation = await ownedConversation(c, c.req.param("id"));
  await c.env.DB.prepare(
    "UPDATE messages SET read_at=? WHERE conversation_id=? AND sender!='visitor' AND read_at IS NULL",
  )
    .bind(now(), conversation.id)
    .run();
  return c.json({ ok: true });
});
chat.post("/conversations/:id/handoff", async (c) => {
  const conversation = await ownedConversation(c, c.req.param("id"));
  await rateLimit(c, "handoff", 5, 300, conversation.id);
  await c.env.DB.prepare(
    "UPDATE conversations SET status='pending',updated_at=? WHERE id=?",
  )
    .bind(now(), conversation.id)
    .run();
  return c.json({ ok: true });
});
chat.post("/conversations/:id/assistant", async (c) => {
  const settings = await enabled(c);
  const conversation = await ownedConversation(c, c.req.param("id"));
  const provider = getAssistant(c.env);
  if (!provider || !settings?.aiEnabled)
    throw new HTTPException(503, { message: "assistant_unavailable" });
  if (conversation.status === "resolved" || conversation.assigned_to)
    throw new HTTPException(409, { message: "human_conversation" });
  await rateLimit(c, "assistant", 4, 300, conversation.id);
  const messages = await history(c, conversation.id);
  if (!messages.length || messages[messages.length - 1]?.sender !== "visitor")
    throw new HTTPException(409, { message: "send_message_first" });
  const claim = await c.env.DB.prepare(
    "UPDATE conversations SET ai_state='running' WHERE id=? AND ai_state!='running'",
  )
    .bind(conversation.id)
    .run();
  if (!claim.meta.changes)
    throw new HTTPException(409, { message: "assistant_running" });
  const job = async () => {
    try {
      const entries = await publicEntries(c);
      const knowledge = await c.env.DB.prepare(
        "SELECT published FROM content WHERE kind='knowledge' AND status='published' AND published IS NOT NULL LIMIT 30",
      ).all<{ published: string }>();
      const answer = await provider.answer(
        assistantInstructions(
          entries,
          knowledge.results.map((k) => JSON.parse(k.published)),
          conversation.language,
        ),
        messages.slice(-16),
      );
      // Do not interleave an AI response after a staff member has taken ownership.
      await c.env.DB.batch([
        c.env.DB.prepare(
          "INSERT INTO messages(id,conversation_id,sender,body,client_id,created_at) SELECT ?,id,'assistant',?,?,? FROM conversations WHERE id=? AND assigned_to IS NULL AND status!='resolved'",
        ).bind(id(), answer, id(), now(), conversation.id),
        c.env.DB.prepare(
          "UPDATE conversations SET ai_state='idle',updated_at=? WHERE id=?",
        ).bind(now(), conversation.id),
      ]);
    } catch {
      await c.env.DB.prepare(
        "UPDATE conversations SET ai_state='failed' WHERE id=?",
      )
        .bind(conversation.id)
        .run();
    }
  };
  c.executionCtx.waitUntil(job());
  return c.json({ state: "running" }, 202);
});

export const inbox = new Hono<AppEnv>();
inbox.use("*", authorize(["owner", "support"]));
inbox.get("/", async (c) => {
  const search = (c.req.query("q") ?? "").slice(0, 100);
  const rows = await c.env.DB.prepare(
    "SELECT c.id,c.name,c.email,c.language,c.status,c.assigned_to,c.ai_state,c.created_at,c.updated_at,(SELECT body FROM messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 1) AS preview,(SELECT count(*) FROM messages WHERE conversation_id=c.id AND sender='visitor' AND read_at IS NULL) AS unread FROM conversations c WHERE strpos(lower(c.name||' '||c.email),lower(?))>0 ORDER BY c.updated_at DESC LIMIT 200",
  )
    .bind(search)
    .all<Conversation>();
  return c.json({ conversations: rows.results });
});
inbox.get("/:id", async (c) => {
  const conversation = await c.env.DB.prepare(
    "SELECT id,name,email,language,status,assigned_to,ai_state,created_at,updated_at FROM conversations WHERE id=?",
  )
    .bind(c.req.param("id"))
    .first<Conversation>();
  if (!conversation) throw new HTTPException(404, { message: "not_found" });
  return c.json({ conversation, messages: await history(c, conversation.id) });
});
inbox.post("/:id/read", async (c) => {
  await c.env.DB.prepare(
    "UPDATE messages SET read_at=? WHERE conversation_id=? AND sender='visitor' AND read_at IS NULL",
  )
    .bind(now(), c.req.param("id"))
    .run();
  return c.json({ ok: true });
});
inbox.post("/:id/messages", async (c) => {
  const input = messageInput.parse(await c.req.json());
  await rateLimit(c, "operator-message", 60, 60, c.get("user").id);
  const conversation = await c.env.DB.prepare(
    "SELECT id,status FROM conversations WHERE id=?",
  )
    .bind(c.req.param("id"))
    .first<{ id: string; status: string }>();
  if (!conversation) throw new HTTPException(404, { message: "not_found" });
  if (conversation.status === "resolved")
    throw new HTTPException(409, { message: "conversation_resolved" });
  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO messages(id,conversation_id,sender,body,client_id,operator_id,created_at) VALUES(?,?,'operator',?,?,?,?) ON CONFLICT(conversation_id,sender,client_id) DO NOTHING",
    ).bind(
      id(),
      conversation.id,
      input.body,
      input.clientId,
      c.get("user").id,
      now(),
    ),
    c.env.DB.prepare(
      "UPDATE conversations SET status='active',assigned_to=?,updated_at=? WHERE id=?",
    ).bind(c.get("user").id, now(), conversation.id),
    auditStatement(c, "support.reply", conversation.id),
  ]);
  return c.json({ messages: await history(c, conversation.id) }, 201);
});
inbox.patch("/:id", async (c) => {
  const input = z
    .object({
      status: z.enum(["pending", "active", "resolved"]),
      assignedTo: z.uuid().nullable(),
    })
    .strict()
    .parse(await c.req.json());
  if (input.assignedTo) {
    const operator = await c.env.DB.prepare(
      "SELECT id FROM users WHERE id=? AND active=1 AND role IN ('owner','support')",
    )
      .bind(input.assignedTo)
      .first();
    if (!operator)
      throw new HTTPException(422, { message: "invalid_operator" });
  }
  const changed = await c.env.DB.prepare(
    "UPDATE conversations SET status=?,assigned_to=?,updated_at=? WHERE id=?",
  )
    .bind(input.status, input.assignedTo, now(), c.req.param("id"))
    .run();
  if (!changed.meta.changes)
    throw new HTTPException(404, { message: "not_found" });
  await auditStatement(
    c,
    "support.status",
    c.req.param("id"),
    input.status,
  ).run();
  return c.json({ ok: true });
});
