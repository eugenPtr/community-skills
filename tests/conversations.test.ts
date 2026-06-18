import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  addMessage,
  createConversation,
  MEMBER_MESSAGE_CAP,
} from "@/lib/people-search/conversations";
import { createTestDb, pgliteConversationsAdapter, seedMember } from "./db";

// Seam D (issue #23): Conversation persistence rules, exercised through real SQL.
// Why each matters: the 10-message cap bounds cost and must be enforced server-
// side (not just in the UI); replay order must be clock-independent so messages
// never reorder; retention must actually delete old Conversations.
describe("conversations persistence", () => {
  let db: PGlite;
  let adapter: ReturnType<typeof pgliteConversationsAdapter>;
  let memberId: string;

  beforeEach(async () => {
    db = await createTestDb();
    adapter = pgliteConversationsAdapter(db);
    memberId = await seedMember(db, { firstName: "Test", lastName: "Member" });
  });
  afterEach(async () => {
    await db.close();
  });

  it("rejects the 11th Member message and writes no row", async () => {
    const conversationId = await createConversation(adapter, memberId);

    for (let i = 0; i < MEMBER_MESSAGE_CAP; i++) {
      const r = await addMessage(adapter, {
        conversationId,
        role: "user",
        content: `msg ${i}`,
      });
      expect(r).toEqual({ kind: "ok" });
    }

    const rejected = await addMessage(adapter, {
      conversationId,
      role: "user",
      content: "the 11th",
    });
    expect(rejected).toEqual({ kind: "capReached" });

    const count = await db.query<{ count: number }>(
      `select count(*)::int as count from messages where conversation_id = $1 and role = 'user'`,
      [conversationId],
    );
    expect(count.rows[0].count).toBe(MEMBER_MESSAGE_CAP);

    // Assistant answers are never capped -- the cap is on Member messages only.
    const assistant = await addMessage(adapter, {
      conversationId,
      role: "assistant",
      content: "still allowed",
    });
    expect(assistant).toEqual({ kind: "ok" });
  });

  it("replays messages in insertion order (by id, not clock)", async () => {
    const conversationId = await createConversation(adapter, memberId);

    await addMessage(adapter, { conversationId, role: "user", content: "a" });
    await addMessage(adapter, { conversationId, role: "assistant", content: "b" });
    await addMessage(adapter, { conversationId, role: "user", content: "c" });

    const messages = await adapter.listMessages(conversationId);
    expect(messages).toEqual([
      { role: "user", content: "a" },
      { role: "assistant", content: "b" },
      { role: "user", content: "c" },
    ]);
  });

  it("retention deletes Conversations idle beyond 90 days, keeps recent ones", async () => {
    const stale = await createConversation(adapter, memberId);
    const fresh = await createConversation(adapter, memberId);
    await addMessage(adapter, { conversationId: stale, role: "user", content: "old" });
    await addMessage(adapter, { conversationId: fresh, role: "user", content: "new" });

    // Backdate the stale Conversation's last activity beyond the 90-day window.
    await db.query(
      `update conversations set last_message_at = now() - interval '91 days' where id = $1`,
      [stale],
    );

    await adapter.deleteExpiredConversations();

    const remaining = await db.query<{ id: string }>(`select id from conversations`);
    const ids = remaining.rows.map((r) => r.id);
    expect(ids).toEqual([fresh]);

    // The stale Conversation's messages cascaded away with it.
    const staleMsgs = await db.query<{ id: string }>(
      `select id from messages where conversation_id = $1`,
      [stale],
    );
    expect(staleMsgs.rows).toHaveLength(0);
  });
});
