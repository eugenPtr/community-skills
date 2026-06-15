# People Search is in-app chat, not a ChatGPT connector

The original brief asked for a "connector for ChatGPT" so members could query the
community from ChatGPT. We are instead building chat **inside the web app**.

Why: no consumer chat free tier cleanly attaches a private member database. ChatGPT
MCP connectors are paid-only; Custom GPTs are usable on free but capped, carry OpenAI
policy risk, and need awkward per-member OAuth on the Action. Claude.ai gates custom
connectors harder still. In every case we'd build the same backend (search API +
vector store) regardless — the third-party chat is just a fragile front door.

In-app chat means: members log in with the magic-link auth they already have (free to
them), we pay one LLM API bill, auth is solved by Supabase, there is zero dependency on
OpenAI/Anthropic account tiers or policy, and we fully control answer quality and UX.

Trade-off accepted: members use our UI rather than the native ChatGPT app. A Custom GPT
can be added later as an optional secondary front door against the same search API
without changing this decision.
