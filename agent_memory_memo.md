# LLMs as Operating Systems: Agent Memory — Engineering Memo

## 1) Concatenated transcripts

All 8 lesson transcripts were extracted (in lesson order) and concatenated into one file.

- **Concatenated transcript (TXT):** [0_all_transcripts_concatenated.txt](sandbox:/mnt/data/0_all_transcripts_concatenated.txt)

---

## 2) Main concepts, distilled (progressive build)

These lessons build one coherent engineering idea: **treat an LLM agent as an “operating system” that actively manages its own context window** using explicit memory structures plus tools, then scale that to retrieval (agentic RAG) and multi-agent coordination.

Progression:

1. **Why memory matters for agents**  
   Agents run multi-step loops. Long-lived assistants need persistence and personalization.
2. **MemGPT mental model**  
   The agent OS is itself an LLM-driven controller that decides what enters the context window.
3. **Core memory (in-context, editable)**  
   Structured memory blocks inside the prompt, with explicit tools to update them.
4. **External memory (out-of-context)**  
   Recall and archival stores that the agent can search on demand.
5. **Implementation with Letta**  
   Agents are services. State is stored in a DB. Tools + heartbeats enable looping.
6. **Programming memory**  
   Replace “human/persona blocks” with custom memory schemas and custom stateful tools.
7. **Agentic RAG**  
   Retrieval becomes agent-controlled: when to retrieve and how to query.
8. **Multi-agent systems**  
   Agents coordinate via tools, shared blocks, or group chats.

---

## 3) MECE sections

1. The problem: long-running agent behavior needs a memory system  
2. LLM OS mental model: agent loop + context compilation  
3. Memory taxonomy: core vs external, recall vs archival  
4. Core memory design: blocks, limits, and editing tools  
5. External memory design: insert/search, summaries, and retrieval triggers  
6. Tools as the control surface: stateful tools, heartbeats, streaming  
7. Custom memory systems: replace default blocks with domain schemas  
8. Agentic RAG: retrieval as an agent decision  
9. Multi-agent orchestration: messaging, shared memory, and group abstractions  
10. Engineering playbook: what improves end-user results, failure modes, evaluation

---

# Amazon-style memo

## 1) Context and decision framing

We are building LLM applications where the product experience depends on what the agent remembers, what it forgets, and how it retrieves. The constraint is that the LLM context window is finite, but the user’s expectation of continuity is not. The practical goal is not to make memory large. The goal is to make memory useful, correct, and controllable under latency, cost, and privacy constraints.

The core claim is that memory is not a bolt-on. Memory is a first-class subsystem designed alongside tools, prompts, and orchestration. Letta implements this by treating agents as services whose state lives in a database, while the LLM step is an operation that compiles state into a prompt.

---

## 2) The LLM OS mental model: the agent loop plus context compilation

An agent is a loop that repeatedly decides what to do next. “Doing” includes sending messages, calling tools, and editing memory. The OS analogy becomes concrete when you separate (a) persistent agent state from (b) the context window snapshot used for the next LLM call.

### Schema: agent as OS (control loop)

```text
User message
  ↓
Agent state (DB-backed)
  - system + persona + policies
  - memory (core + external pointers)
  - tool definitions
  - message history (full)
  ↓
Context compilation (LLM OS responsibility)
  - choose what goes into prompt now
  - may retrieve from external memory
  - may summarize / evict history
  ↓
LLM step
  ↓
Tool calls + memory edits + optional heartbeat (loop)
  ↓
Updated agent state (persist)
```

This mental model matters because it forces a decision: you are not only prompting the LLM, you are designing the compilation policy that decides what the LLM sees.

---

## 3) Memory taxonomy: what exists, where it lives, how it is accessed

Two tiers dominate: memory inside the context window and memory outside it. Within that, MemGPT-style systems use a practical taxonomy.

### Memory types table

| Memory type | Where it lives | What it holds | How it is accessed | Why it matters |
|---|---|---|---|---|
| Core memory | Inside prompt | High-value, always-visible facts (user, agent persona, pinned constraints) | Directly present each step; editable via tools | Drives personalization and stable behavior |
| Chat history | Inside prompt (bounded) | Recent dialogue and tool results | Directly present until it overflows | Keeps local coherence |
| Summary | Inside prompt | Compressed history of evicted messages | Created when truncating | Preserves continuity under long chats |
| Recall memory | External store (DB) | Full conversation history, searchable | Conversation search tool | Enables look-back without bloating context |
| Archival memory | External store (vector DB) | General knowledge store (docs, facts, files) | Archival insert/search tools | Enables RAG-like retrieval and long-term storage |

A key insight: **core memory is not just another message.** It is a reserved region of the prompt with its own edit tools. This supports stable personalization better than hoping “important facts” remain in chat history.

---

## 4) Core memory design: blocks, limits, and edit tools

Core memory is defined as **memory blocks** plus **memory tools**.

- A block has a label (human, persona, tasks), a value (the text), and a character limit.
- Tools like **core memory replace** and **core memory append** implement controlled edits.

This yields predictable behavior: the agent can update what it always knows without rewriting the system prompt each time. A canonical example: user name changes, agent updates the human block, then replies.

### Design knobs that actually change behavior

| Knob | What you change | What changes in practice |
|---|---|---|
| Block labels and structure | human/persona vs custom blocks | What the agent treats as pinned truth |
| Block budgets | character limits per block | How much personalization vs task context stays pinned |
| Edit permissions | which tools exist | Whether the agent can correct itself or drift |
| Prompt template | how blocks are rendered | How salient memory is to the model |

Implementation guidance that improves outcomes: memory edits should be explicit and auditable. Save stable preferences and identity facts, not guesses.

---

## 5) External memory: why it exists and how to make it reliable

External memory exists because context windows overflow and storing everything in prompt is expensive and brittle.

Two external shapes:

1. **Recall memory** for conversation history  
2. **Archival memory** for general knowledge and documents

Two behaviors are central:

- **Eviction with summarization:** when the chat history grows, messages are evicted and replaced with a recursive summary.
- **Retrieval on demand:** the agent searches recall or archival memory when needed.

### Retrieval triggers that tend to work

- The user references something old: “like we discussed last week…”
- The user asks about stable preferences or identity
- The user asks about policy or documentation that should be sourced
- The agent detects uncertainty and sees external memory exists (via memory statistics)

What leads to better results: retrieval should be driven by clear intent signals and bounded by budgets. Favor fewer, higher-quality retrievals over constant searching.

---

## 6) Tools as the control surface: stateful tools, heartbeats, streaming

Tools are the mechanism for acting, editing state, and stepping the loop.

- **Stateful tools:** tools can receive agent state and modify it.
- **Heartbeats:** tools can request another step, enabling multi-step execution from one user input.
- **Streaming:** when step counts rise, streaming makes behavior observable and debuggable.

Engineering interpretation: the agent loop is a workflow engine. Heartbeats are the scheduling primitive. Tools are the syscalls.

---

## 7) Custom memory systems: replace default blocks with domain schemas

You are not limited to human/persona blocks.

General pattern:

- Define a custom block schema (for example, a JSON task queue).
- Implement custom tools that mutate that schema (push/pop).
- Override the system prompt to explain the memory contract.
- Disable base tools for a constrained agent, then selectively re-add required tools (for example, send message).

This matters because many products need structured state: open tickets, candidate pipelines, user settings, or task queues.

---

## 8) Agentic RAG: retrieval becomes an agent decision

Agentic RAG differs from traditional RAG:

- Traditional RAG: the system retrieves; the model answers.
- Agentic RAG: the agent decides when to retrieve and how to query.

Two approaches:

1. **Copy data into archival memory** (sources and attaching passages to agents).  
2. **Query external systems via tools** (custom connectors, secrets via tool execution environment variables).

Best-result pattern: treat retrieval as interaction design. Users care that answers are grounded, consistent, and fast. Retrieve small relevant chunks, expose provenance when appropriate, and avoid retrieval when core memory already contains the answer.

---

## 9) Multi-agent orchestration: messaging, shared memory blocks, and groups

When agents are deployed as services, collaboration requires explicit coordination.

Coordination patterns:

1. **Tool-mediated messaging:** send message to agent and wait for reply.  
2. **Shared memory blocks:** multiple agents attach to the same block ID; edits sync.  
3. **Multi-agent group chat:** agents share one thread and take turns (round robin).

### Coordination patterns table

| Pattern | When it fits | Tradeoff |
|---|---|---|
| Explicit message tools | Clear handoffs, asynchronous teams | More plumbing, clearer boundaries |
| Shared memory blocks | Shared single source of truth | Risk of contention and accidental edits |
| Group chat | Tight collaboration, shared context | Harder to isolate responsibilities |

What improves outcomes: narrow roles and explicit ownership of memory. Many production failures come from ambiguous responsibility and unclear stopping conditions.

---

## 10) Engineering playbook: what matters to end users and how to build for it

### Checklist mapped to user experience

| User expectation | System requirement | Implementation guidance |
|---|---|---|
| “Remember me” | Stable identity and preferences | Core memory with explicit write rules |
| “Do not forget constraints” | Pinned policies | Dedicated policy blocks, restricted edits |
| “Use my documents correctly” | Grounded retrieval | Archival memory + provenance cues |
| “Stay fast” | Bounded steps and retrievals | Streaming, step limits, tool timeouts |
| “Be trustworthy” | Avoid confident fabrication | Retrieval-first for factual queries |
| “Respect privacy” | Data minimization and control | Separate personal memory, retention policies |

### Common failure modes and mitigations

- **Memory pollution (saving junk):** add heuristics for what is worth saving; confirm sensitive updates.
- **Memory drift (incorrect edits):** keep edits explicit; allow corrections; log changes.
- **Retrieval spam:** gate retrieval by intent and uncertainty; cap results.
- **Context bloat:** enforce budgets; move stale facts to archival.
- **Multi-agent loops:** use tool rules and termination criteria; separate responsibilities.
