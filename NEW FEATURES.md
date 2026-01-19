# Practice Mode UI Differentiation - Implementation Plan

**Date:** 2026-01-19
**Status:** Ready for Implementation
**Research Sources:** 6 parallel worktrees (pmui/ui-ux, pmui/data-model, pmui/answer-input, pmui/question-flow, pmui/component-arch, pmui/integration)

---

## Executive Summary

Render practice items differently based on `practice_mode` type. Currently, AnswerInput.jsx renders ALL modes (free_recall, cued_recall, recognition, explanation, application, execution) as identical textareas. After implementation, each mode will have appropriate UI: recognition shows clickable option buttons, cued_recall shows progressive hint reveals, execution shows task checklists, etc.

**Key Finding:** This is a **frontend-only change**. The backend already stores and returns all necessary data (`practice_mode`, `hints`, `expected_response`, `rubric`, `success_criteria`). The frontend simply doesn't use it for differentiated rendering.

---

## Architecture Overview

### Current State

```
Study.jsx
├── QuestionCard (shows practice_mode badge)
├── AnswerInput (SAME textarea for ALL modes)  ← Problem
└── SelfAssessment (same 1-5 scale for all)
```

### Target State

```
Study.jsx
├── QuestionCard (unchanged)
├── AnswerInput (dispatcher component)
│   ├── FreeRecallInput       → textarea, no hints
│   ├── CuedRecallInput       → textarea + progressive hint reveal
│   ├── RecognitionInput      → multiple choice buttons
│   ├── ExplanationInput      → expanded textarea + rubric preview
│   ├── ApplicationInput      → scenario context + textarea
│   └── ExecutionInput        → checklist + completion tracking
└── SelfAssessment (mode-aware; skip for recognition auto-grade)
```

---

## Data Model: No Changes Required

| Field | Status | Usage |
|-------|--------|-------|
| `practice_mode` | ✅ Already stored | Branch UI rendering |
| `hints` | ✅ Already stored (JSON array) | Progressive hints for cued_recall; **recognition options** |
| `expected_response` | ✅ Already stored | Correct answer comparison |
| `rubric` | ✅ Stored but unused | Display in explanation/application modes |
| `success_criteria` | ✅ Stored but unused | Checklist for execution mode |
| `metadata` | ✅ Available | Optional: store structured recognition options |

### Recognition Mode Options

**Problem:** No dedicated `options` column for recognition items.

**Solution:** Use existing `hints` field for recognition mode:
```json
{
  "practice_mode": "recognition",
  "prompt": "Which principle explains why testing improves memory?",
  "expected_response": "Testing effect",
  "hints": ["Testing effect", "Encoding specificity", "Generation effect", "Spacing effect"]
}
```
- `hints[0]` always matches `expected_response` (correct answer)
- Frontend shuffles before display
- No schema migration required

---

## Component Architecture

### File Structure

```
web/src/components/study/
├── AnswerInput.jsx           # Refactored as dispatcher
├── QuestionCard.jsx          # Unchanged
├── SelfAssessment.jsx        # Minor: skip for auto-graded modes
├── SessionHeader.jsx         # Unchanged
├── SessionSummary.jsx        # Unchanged
├── inputs/                   # NEW directory
│   ├── index.js
│   ├── FreeRecallInput.jsx   # Extracted from current AnswerInput
│   ├── CuedRecallInput.jsx   # Textarea + hint system
│   ├── RecognitionInput.jsx  # Multiple choice buttons
│   ├── ExplanationInput.jsx  # Expanded textarea + rubric
│   ├── ApplicationInput.jsx  # Scenario + textarea
│   └── ExecutionInput.jsx    # Checklist + completion
└── shared/                   # NEW directory
    ├── TextArea.jsx          # Styled textarea primitive
    ├── SubmitButton.jsx      # Primary action
    └── SkipButton.jsx        # Skip action
```

### Props Interface

```typescript
// AnswerInput (dispatcher)
interface AnswerInputProps {
  practiceMode: 'free_recall' | 'cued_recall' | 'recognition' |
                'explanation' | 'application' | 'execution';
  item: PracticeItem;
  onSubmit: (response: AnswerResponse) => void;
  onSkip: () => void;
  disabled?: boolean;
}

// Unified response object
interface AnswerResponse {
  type: 'text' | 'selection' | 'completion';
  value?: string;              // For text modes
  selectedIndex?: number;      // For recognition
  hintsUsed?: number;          // For cued_recall
  completed?: boolean;         // For execution
  independenceLevel?: number;  // For execution (1-5)
}
```

### Dispatcher Pattern

```jsx
// AnswerInput.jsx
const MODE_COMPONENTS = {
  free_recall: FreeRecallInput,
  cued_recall: CuedRecallInput,
  recognition: RecognitionInput,
  explanation: ExplanationInput,
  application: ApplicationInput,
  execution: ExecutionInput,
}

export default function AnswerInput({ practiceMode, item, onSubmit, onSkip, disabled }) {
  const InputComponent = MODE_COMPONENTS[practiceMode] || FreeRecallInput

  return (
    <div className="max-w-2xl mx-auto">
      <InputComponent
        item={item}
        onSubmit={onSubmit}
        onSkip={onSkip}
        disabled={disabled}
      />
    </div>
  )
}
```

---

## UI Specifications by Mode

### 1. Free Recall
- Plain textarea (5 rows)
- No placeholder (avoid priming)
- Submit + Skip buttons
- **No hints visible**

### 2. Cued Recall
- Textarea + progressive hint reveal
- Amber accent (`bg-amber-50`, `border-amber-200`)
- "Show Hint X" button with remaining count
- Track `hintsUsed` for attempt recording

### 3. Recognition (Most Different)
- Multiple choice buttons (A, B, C, D)
- Green accent on selection (`border-accent-progress`, `bg-green-50`)
- Radio button style with checkmark
- **Auto-grade on submit** (no self-assessment)

### 4. Explanation
- Expanded textarea (8 rows, resizable)
- Rubric preview in blue box (`bg-blue-50`)
- Word count indicator
- Self-assessment uses rubric

### 5. Application
- Two-part prompt: Scenario + Task
- Purple accent for scenario (`bg-purple-50`, `border-l-4 border-purple-500`)
- Standard textarea for response

### 6. Execution
- "Start Task" button → external work → return to record
- Success criteria displayed as checklist
- Track: completed (bool), independence (1-5), iterations, errors
- Green accent (`bg-green-50`)

---

## Scoring Logic Per Mode

| Mode | Scoring Method | Normalization | Self-Assessment? |
|------|----------------|---------------|------------------|
| `free_recall` | Self-rating 0-3 | score / 3.0 | Yes |
| `cued_recall` | Self-rating 0-3 | score / 3.0 | Yes |
| `recognition` | Auto-grade | 1.0 (correct) or 0.0 (incorrect) | **No** |
| `explanation` | Self-rating 0-3 | score / 3.0 | Yes |
| `application` | Self-rating 0-3 | score / 3.0 | Yes |
| `execution` | Independence level | (independence - 1) / 4.0 | Modified |

### Recognition Auto-Grading

```javascript
// In Study.jsx handleSubmit
if (response.type === 'selection') {
  const options = parseOptions(currentItem.hints)
  const isCorrect = options[response.selectedIndex] === currentItem.expected_response

  // Record attempt immediately, skip SelfAssessment
  await recordAttempt({
    score: isCorrect ? 1.0 : 0.0,
    correctness: isCorrect ? 'correct' : 'incorrect'
  })
  moveToNextItem()
  return
}
setShowAssessment(true) // Only for non-recognition modes
```

---

## Implementation Phases

### Phase 1: Infrastructure (Non-Breaking)
**Scope:** Create new directories and components without modifying existing code

1. Create `web/src/components/study/inputs/` directory
2. Create `web/src/components/study/shared/` directory
3. Create shared primitives: `TextArea.jsx`, `SubmitButton.jsx`, `SkipButton.jsx`
4. Create `FreeRecallInput.jsx` (extract current AnswerInput logic)

**Test:** All components import correctly, existing behavior unchanged.

### Phase 2: Dispatcher Refactor
**Scope:** Make AnswerInput a dispatcher while maintaining backward compatibility

1. Refactor `AnswerInput.jsx` to dispatcher pattern
2. Add `practiceMode` and `item` props
3. Default to `FreeRecallInput` for unknown modes
4. Update `Study.jsx` to pass new props

**Test:** Study flow works identically for all existing modes.

### Phase 3: Recognition Mode
**Scope:** First mode-specific input with auto-grading

1. Create `RecognitionInput.jsx` with option buttons
2. Add option parsing from `hints` field
3. Implement auto-grading in `Study.jsx`
4. Update `SelfAssessment.jsx` to skip for recognition

**Test:** Recognition items show buttons, auto-grade correctly.

### Phase 4: Cued Recall with Hints
**Scope:** Progressive hint system

1. Create `CuedRecallInput.jsx` with hint toggle
2. Track `hintsUsed` count
3. Pass to attempt recording

**Test:** Hints reveal progressively, count tracked in attempts.

### Phase 5: Execution Mode
**Scope:** Task completion workflow

1. Create `ExecutionInput.jsx` with Start Task → Record Results flow
2. Display `success_criteria` as checklist
3. Track independence, iterations, errors

**Test:** Execution items show task flow, data recorded correctly.

### Phase 6: Explanation/Application Enhancement
**Scope:** Rubric preview and expanded input

1. Create `ExplanationInput.jsx` with rubric preview
2. Create `ApplicationInput.jsx` with scenario styling
3. Add word count indicator

**Test:** Rubric displays, scenario styled distinctly.

---

## Files to Modify

| File | Change Type | Phase |
|------|-------------|-------|
| `web/src/components/study/inputs/` | Create directory | 1 |
| `web/src/components/study/shared/` | Create directory | 1 |
| `shared/TextArea.jsx` | Create | 1 |
| `shared/SubmitButton.jsx` | Create | 1 |
| `shared/SkipButton.jsx` | Create | 1 |
| `inputs/FreeRecallInput.jsx` | Create | 1 |
| `AnswerInput.jsx` | Refactor to dispatcher | 2 |
| `Study.jsx` | Add props, auto-grading | 2-3 |
| `inputs/RecognitionInput.jsx` | Create | 3 |
| `SelfAssessment.jsx` | Skip for auto-graded modes | 3 |
| `inputs/CuedRecallInput.jsx` | Create | 4 |
| `inputs/ExecutionInput.jsx` | Create | 5 |
| `inputs/ExplanationInput.jsx` | Create | 6 |
| `inputs/ApplicationInput.jsx` | Create | 6 |

---

## Accessibility Requirements

- **Keyboard navigation:** Tab between options, Enter to submit, A/B/C/D keys for recognition
- **Screen reader:** ARIA labels for option buttons, hint announcements
- **Focus management:** Auto-focus first interactive element on mode change
- **Reduced motion:** Conditional transitions via `prefers-reduced-motion`

---

## Testing Checklist

- [ ] Each mode renders correct component based on `practice_mode`
- [ ] Recognition shows clickable options, auto-grades
- [ ] Cued recall shows progressive hints, tracks count
- [ ] Execution shows task flow, records independence/iterations
- [ ] Explanation shows rubric preview
- [ ] Application shows styled scenario
- [ ] Self-assessment skipped for recognition mode
- [ ] Attempt data includes mode-specific fields
- [ ] Responsive at 375px, 768px, 1024px, 1440px
- [ ] Keyboard navigation works for all modes
- [ ] Screen reader announces mode changes

---

## Dependencies

- **New packages:** None
- **Database migrations:** None
- **API changes:** None
- **Backend changes:** None

This is a **pure frontend enhancement**.

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Recognition options not in `hints` | Medium | Parse from prompt text as fallback |
| Existing items have malformed hints | Low | Try/catch JSON parsing, fallback to free_recall |
| Self-assessment expects text answer | Low | Update to handle response object |
| Performance with many option buttons | Low | Max 4-6 options per recognition item |

---

## Success Criteria

1. Recognition items display as clickable multiple choice (not textarea)
2. Cued recall items have working hint toggle
3. Execution items have task completion workflow
4. All mode data correctly recorded in attempts table
5. No regression in existing study flow
