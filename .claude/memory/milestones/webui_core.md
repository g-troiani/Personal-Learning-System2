# Web UI Core Milestones Archive

**Last Updated:** 2026-01-19
**Summary:** Implementation details for M9-M15, M50 (React web interface, all core pages, practice mode UI differentiation)

## Quick Reference

- **Web Root:** `web/`
- **Framework:** React 18, Vite, React Router 6
- **Styling:** Tailwind CSS with custom design system colors
- **Database Client:** @supabase/supabase-js
- **Charts:** Recharts
- **Icons:** lucide-react
- **Dev Server:** `npm run dev` (port 5173)

## Milestone Details

### Milestone 9: Web UI Foundation (2026-01-02)

Project setup and layout components.

- Scaffolded React project with Vite in web/ directory
- Installed dependencies: react-router-dom, @supabase/supabase-js, lucide-react, recharts, tailwindcss
- Configured Tailwind CSS with design system colors from spec (bg-main, accent-progress, etc.)
- Created Sidebar component with navigation links and user profile
- Created Layout component with sidebar and content area
- Set up React Router with all page routes
- Created SupabaseContext provider with data fetching methods
- Created placeholder pages for: Home, Calendar, DueForReview, Sources, Progress, Analytics, Study
- Verified navigation works correctly between all pages
- Note: Supabase auth returns 401 due to RLS - requires service role key (hardcoded fallback added)

### Milestone 10: Home Dashboard (2026-01-02)

Main dashboard with greeting, alerts, search, and source cards.

- Created home components: GreetingHeader, OverdueAlert, SearchBar, QuickActions, SourceCard
- Implemented time-based greeting ("Good morning/afternoon/evening, Learner")
- Search bar with placeholder "Search your knowledge base..."
- Quick action buttons: Study, Plan, Add Document, Analytics with navigation
- Source cards grid showing: emoji, title, mastery progress bar, due/overdue counts
- Quick Stats section showing: Total Sources, New Items, Due Today, Overdue
- Sidebar shows "Due for Review" badge with live count (53 items)
- Recent sources section in sidebar with emoji icons
- Overdue alert banner (only visible when overdue > 0)
- Fixed shell environment variable conflict causing wrong Supabase URL
- Must use publishable key (sb_publishable_) not secret key in browser

### Milestone 11: Study Session (2026-01-02)

Interactive practice interface with answer input.

- Created SessionHeader component with progress indicator and "End session" button
- Created QuestionCard component with KC type badge, practice mode, name, and prompt
- Created AnswerInput component with textarea, mic button placeholder, submit button, skip link
- Created SelfAssessment component with 5-point score and difficulty ratings
- Created SessionSummary modal with items completed, average score, duration, navigation buttons
- Full Study.jsx page with session lifecycle: fetch queue, create session, present items, record attempts
- Attempts recorded to database with response time, score, correctness, difficulty
- KC state updated with mastery calculation (EMA) after each attempt
- Fixed hints JSON parsing to handle both JSON arrays and plain text
- Verified mastery updates persist (0% → 11% after successful attempt)

### Milestone 12: Calendar (2026-01-02)

Learning calendar and session scheduling.

- Created MonthNavigation component with prev/next arrows and month/year display
- Created CalendarGrid component with 7-column layout, today highlight, session indicators
- Created ScheduleForm component with source dropdown, session type, duration, date
- Full Calendar.jsx page fetching sessions from database
- Session scheduling creates records in sessions table
- Sessions shown on selected date with status (Completed/Scheduled)

### Milestone 13: Due for Review (2026-01-02)

Organized review queue by urgency.

- Created ReviewSection component with colored dot indicator, title, and source list
- Created SourceItem component with emoji, title, count, and action button (Review/Study/Start)
- Full DueForReview.jsx page fetching and categorizing items from getDueCounts()
- Three sections: Overdue (red), Due Today (amber), New Content (green)
- Sources sorted by count within each category (highest first)
- Action buttons link to /study?source={sourceId} for filtered sessions
- "Study All" button at bottom shows total count and starts unfiltered session
- Empty state shows friendly message when all caught up

### Milestone 14: Progress (2026-01-02)

Statistics dashboard with charts.

- Created StatCards.jsx with 4 summary cards: Sources, Items Learned, Study Sessions, Total Time
- Created MasteryBySource.jsx with horizontal progress bars per source, sorted by mastery
- Created WeeklyChart.jsx with Recharts bar chart showing daily activity (Mon-Sun)
- Streak indicator shows consecutive days with study sessions
- Weekly total shows items practiced this week
- Link to /analytics for detailed insights
- All stats calculated from real database queries (content_sources, kc_state, sessions, attempts)

### Milestone 15: Analytics (2026-01-02)

Deep insights, technique comparison, and recommendations.

- Created InsightCards.jsx with three colored insight cards: What's Working (green), Needs Attention (amber), Optimization (blue)
- Created TechniqueComparison.jsx with Recharts horizontal bar chart showing 7-day and 30-day retention by technique bundle
- Created PerformanceByType.jsx with horizontal bars for factual/conceptual/procedural/metacognitive with color coding
- Created CalibrationAnalysis.jsx with scatter chart comparing confidence_before to actual score, showing overconfident/underconfident/well-calibrated counts
- Created ItemsNeedingAttention.jsx listing struggling items with Practice buttons linking to filtered study sessions
- Full Analytics.jsx page with filter controls (time period, source, knowledge type) that update all sections
- All analytics calculated from real database queries (attempts, kc_state, technique_bundles, retention_tests, kc_technique_history)

### Milestone 50: Practice Mode UI Differentiation (2026-01-19)

Render practice items with mode-appropriate UI instead of uniform textarea.

**Problem:** AnswerInput.jsx rendered ALL practice modes (free_recall, cued_recall, recognition, explanation, application, execution) as identical textareas, ignoring mode-specific data (`hints`, `rubric`, `success_criteria`).

**Solution:** Refactored AnswerInput.jsx as dispatcher to mode-specific input components.

**File Structure Created:**
```
web/src/components/study/
├── AnswerInput.jsx           # Dispatcher based on practice_mode
├── inputs/
│   ├── FreeRecallInput.jsx   # Simple textarea
│   ├── CuedRecallInput.jsx   # Textarea + progressive amber hints
│   ├── RecognitionInput.jsx  # A/B/C/D buttons, auto-grade
│   ├── ExplanationInput.jsx  # Blue rubric box + word count
│   ├── ApplicationInput.jsx  # Purple scenario card + word count
│   └── ExecutionInput.jsx    # Start Task → Record Results flow
└── shared/
    ├── TextArea.jsx          # Styled textarea primitive
    ├── SubmitButton.jsx      # Primary action button
    └── SkipButton.jsx        # Skip action
```

**Scoring by Mode:**
| Mode | Scoring | Self-Assessment? |
|------|---------|------------------|
| free_recall | Self-rating 0-3 → score/3.0 | Yes |
| cued_recall | Self-rating 0-3 → score/3.0 | Yes |
| recognition | Auto-grade → 1.0 or 0.0 | **No** |
| explanation | Self-rating 0-3 → score/3.0 | Yes |
| application | Self-rating 0-3 → score/3.0 | Yes |
| execution | Independence 1-5 → (level-1)/4.0 | Modified |

**Key Implementation Details:**
- Dispatcher pattern: `MODE_COMPONENTS[practiceMode] || FreeRecallInput`
- Recognition auto-grading: compares selected option to `expected_response`, skips SelfAssessment
- Cued recall: tracks `hintsUsed` count, amber styling (`bg-amber-50`)
- Execution: two-phase flow (Start Task → Record Results), success_criteria checklist
- Explanation: blue rubric box (`bg-blue-50`), word count indicator
- Application: purple scenario card (`bg-purple-50`, `border-l-4 border-purple-500`)

**Study.jsx Changes:**
- Added `userResponse` state to track mode-specific data
- Recognition mode: auto-grades and skips to next item
- Execution mode: calculates independence score from 1-5 level
- All modes pass proper response object to SelfAssessment

**Testing Verified:**
- ExplanationInput: blue rubric preview, word count displays correctly
- ApplicationInput: scenario placeholder styling (purple), word count works
- Recognition/CuedRecall/Execution: code verified, not in current study queue

**This was a pure frontend enhancement - no backend or database changes.**

## Cross-References

- Related decisions: decisions/technology.md (React, Vite, Tailwind choices)
- Related schemas: schemas/api.md (SupabaseContext methods)
- Related milestones: milestones/sources_feature.md (M16-M20 extends UI)
