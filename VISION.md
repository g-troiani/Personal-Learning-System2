# Personal Adaptive Learning System

## Vision Document for Engineering

---

## The Problem

I want to learn new topics faster and retain them longer. Current approaches fail me in predictable ways:

1. **I don't know what I don't know.** After reading a technical document, I feel like I understand it, but when I try to apply the knowledge, I discover gaps I wasn't aware of.

2. **I forget most of what I read.** Without systematic review, knowledge decays rapidly. A week after studying something, I've lost most of it.

3. **I can't measure my learning.** I have no objective way to know if I'm actually learning versus just spending time. Hours studied is not the same as knowledge gained.

4. **I don't know what works for me.** Some study techniques feel productive but aren't. Others feel frustrating but work. I have no data on which approaches actually produce results for my brain.

5. **Managing the learning process is itself cognitive overhead.** Deciding what to study, when to review, what I'm struggling with—this mental bookkeeping distracts from actual learning.

---

## What I Want

A system that handles the logistics of learning so I can focus on the learning itself. Specifically:

**Input:** I upload a document (PDF, DOCX, or Markdown) containing material I want to learn.

**Output:** The system tells me what to do and when. It presents practice questions, tracks my responses, schedules reviews at optimal intervals, and surfaces insights about my learning patterns.

**My role:** Show up, do the practice, report my results honestly. The system handles everything else.

---

## Core Requirements

### 1. Automatic Content Processing

When I upload a document, the system should:

- Extract the learnable concepts (what the research calls "knowledge components")
- Classify each concept by type: Is this a definition to memorize? A principle to understand? A procedure to practice? A hands-on skill to execute?
- Generate appropriate practice items for each concept
- Identify dependencies (what must be learned before what)

I should not have to manually create flashcards or design my own practice questions.

### 2. Intelligent Scheduling

The system should tell me what needs attention:

- What's due for review today (spaced repetition)
- What's overdue
- What's new and ready to learn
- What I'm struggling with

When I have 30 minutes to study, the system should know exactly what to put in front of me.

### 3. Measurement and Tracking

Everything gets measured:

- Did I get it right? How confident was I? How long did it take?
- How many attempts before I got it? Did I need hints?
- For hands-on tasks: Did I complete it? How independently? What errors did I encounter?

This data serves two purposes: adapting to my current state (what's mastered, what needs work) and enabling analysis of what techniques work best for me over time.

### 4. Self-Experimentation Infrastructure

Different learning techniques have different effects. The research identifies dozens of variables that matter: spacing intervals, practice modes (free recall vs. cued recall vs. recognition), interleaving vs. blocked practice, immediate vs. delayed feedback, elaboration prompts, reflection prompts, and more.

Rather than picking one approach, I want to run experiments on myself. The system should:

- Track which techniques were applied to which content
- Measure outcomes (time to mastery, retention at 7 and 30 days, transfer to novel problems)
- Control for confounding variables (topic difficulty, prior knowledge, domain)
- Surface insights like "For conceptual topics, you learn 23% faster with interleaved practice"

This requires careful data collection from day one, even if the analysis comes later.

### 5. Source-Specific Review

I learn multiple topics concurrently. If I study "LLM Evaluation" on Monday and "Terraform" on Tuesday, I need to review them on different schedules. The system should:

- Track learning state per source document
- Show me what's due by topic ("Terraform: 12 items due today")
- Let me focus a session on one topic when needed

---

## Design Philosophy

### Evidence-Based

The system should implement techniques validated by cognitive science research:

- **Retrieval practice** over passive review (testing yourself is how you learn, not just how you assess)
- **Spaced repetition** over massed practice (distributed study beats cramming)
- **Interleaving** over blocked practice (mixing topics builds discrimination)
- **Desirable difficulties** over easy fluency (struggle that feels unproductive often produces the most durable learning)

The research I've compiled covers four major sources: "Make It Stick" (Brown, Roediger, McDaniel), "A Mind for Numbers" (Oakley), "Ultralearning" (Young), and a technical blueprint for adaptive learning platforms. These collectively identify the techniques, the variables to track, and the effect sizes to expect.

### Measurement Over Intuition

The brain is unreliable at assessing its own learning. What feels productive (rereading, highlighting) often isn't. What feels frustrating (testing yourself, spacing practice) often is. The system should track actual performance, not felt fluency.

This means:

- Confidence ratings before attempts (to measure calibration)
- Difficulty ratings after attempts (to detect cognitive overload)
- Objective correctness scoring where possible
- Self-assessment with rubrics where objective scoring isn't possible

### Automation Over Willpower

I don't want to rely on discipline to make good learning decisions. The system should make the right choice the default:

- Present what's due, not what's easy
- Enforce spacing even when I want to cram
- Mix topics even when I want to block
- Track everything automatically so I don't have to remember to log

---

## Technical Constraints

### Localhost Deployment

This runs locally on my machine. No cloud services beyond the LLM API for content processing. Data stays on my disk.

- SQLite database (zero configuration, file-based)
- Command-line interface (simple, scriptable, no web server needed)
- Python implementation (ecosystem support for document processing and ML)

### LLM Integration

An LLM (Claude) processes documents to extract knowledge components and generate practice items. This is the intelligence layer that makes automatic content processing possible. The LLM is called during ingestion, not during practice sessions.

Cost is acceptable: a few dollars per document is fine for the quality of extraction.

### Single User

This is a personal tool, not a multi-tenant platform. No authentication, no user management, no privacy concerns beyond keeping the database file secure.

---

## Success Criteria

The system works if:

1. **I actually use it.** The overhead of uploading a document and practicing must be low enough that I do it consistently.

2. **I learn faster.** Measured by time-to-mastery on new topics compared to my previous unstructured approach.

3. **I retain longer.** Measured by performance on delayed retention tests (7 days, 30 days after initial learning).

4. **I gain insight.** After a few months of data, I can answer questions like: "Which technique bundles work best for procedural content?" and "What spacing interval produces the best retention for me?"

5. **I stop managing.** The cognitive overhead of deciding what to study disappears. I just run `learn todo`, see what's due, and do it.

---

## What This Is Not

- **Not a note-taking app.** I use other tools for capturing information. This is for deliberate practice on content I've already captured.

- **Not a flashcard app.** Flashcards are one practice mode among many. Conceptual knowledge needs explanation practice. Procedural knowledge needs problem-solving. Execution skills need hands-on tasks.

- **Not a course platform.** There's no curriculum, no progress bars, no gamification. Just evidence-based practice with honest measurement.

- **Not an AI tutor.** The LLM helps with content processing, but the practice loop is human-driven. I do the thinking; the system manages the logistics.

---

## Summary

I want to outsource the cognitive overhead of learning management while retaining the cognitive effort of learning itself. The system should:

1. Process documents into learnable units automatically
2. Generate appropriate practice for each unit
3. Schedule reviews using spaced repetition
4. Track everything for adaptation and analysis
5. Tell me what to do next

The goal is learning that's faster (efficient use of study time), deeper (actual understanding, not just familiarity), more durable (long-term retention), and measurable (data-driven insights).

This is a personal tool running on localhost, built on cognitive science research, designed for someone who wants to learn seriously and is willing to do the practice—but doesn't want to waste effort on the wrong things or lose knowledge to forgetting.

---

## Attached Context

The following reference materials inform this system:

1. **Research Synthesis** - MECE framework integrating findings from four learning science sources (822 lines)
2. **Variable Taxonomy** - Complete enumeration of what to track for learning and self-experimentation (74 variables across 7 categories)
3. **System Specification** - Database schema, algorithms, and implementation details (comprehensive technical spec)

These documents contain the detailed "how" that implements this "what" and "why."
