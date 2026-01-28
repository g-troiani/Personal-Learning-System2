# Consolidated TDD Implementation Plan

**Feature:** Enforce Test-Driven Development (TDD) as Mandatory Practice
**Date:** 2026-01-28
**Status:** Ready for Implementation

---

## Executive Summary

This plan consolidates research from six worktrees to implement TDD as a mandatory practice across the Personal Learning System. The implementation requires:

1. **Installing test frameworks** (Vitest + pytest)
2. **Creating configuration files** (vitest.config.js, pytest.ini)
3. **Updating CLAUDE.md** with TDD requirements
4. **Updating EXECPLAN.md** with TDD operational policy
5. **Creating memory archival structure** for test documentation
6. **Writing initial tests** to validate setup

---

## Part 1: Testing Infrastructure Setup

### Frontend (React + Vite)

**Install dependencies:**
```bash
cd web/
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitest/coverage-v8
```

**Create vitest.config.js:**
```javascript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/**/*.test.{js,jsx}', 'src/main.jsx'],
      lines: 70,
      functions: 70,
      branches: 65,
      statements: 70
    },
    include: ['src/**/*.test.{js,jsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

**Update package.json scripts:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

**Create src/__tests__/setup.js:**
```javascript
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
process.env.VITE_SUPABASE_ANON_KEY = 'test-key'
process.env.VITE_API_URL = 'http://localhost:8001/api'

global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
```

### Backend (Python + FastAPI)

**Add to requirements.txt:**
```
# Testing
pytest>=7.4.0
pytest-asyncio>=0.23.0
pytest-cov>=4.1.0
pytest-mock>=3.12.0
httpx>=0.25.0
responses>=0.24.0
faker>=20.0.0
```

**Create pytest.ini:**
```ini
[pytest]
python_files = test_*.py
python_classes = Test*
python_functions = test_*

addopts =
    -v
    --strict-markers
    --tb=short
    --cov=app
    --cov-report=html
    --cov-report=term-missing:skip-covered
    --cov-fail-under=70

markers =
    unit: Pure function tests
    integration: API + database tests
    async: Async tests
    llm: Tests mocking LLM calls
    auth: Authentication tests

asyncio_mode = auto
testpaths = tests
timeout = 10
```

**Create tests/conftest.py:**
```python
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock

@pytest.fixture
def client():
    from app.api.server import create_app
    app = create_app()
    return TestClient(app)

@pytest.fixture
def mock_supabase():
    mock = MagicMock()
    mock.table.return_value.select.return_value.execute.return_value.data = []
    return mock

@pytest.fixture
def auth_headers():
    from app.api.auth.jwt_utils import encode_token
    token = encode_token({"sub": "test-user", "email": "test@example.com"})
    return {"Authorization": f"Bearer {token}"}
```

---

## Part 2: CLAUDE.md Updates

**Replace "Testing Instructions" section (lines 265-272) with:**

```markdown
## Testing Instructions

**Test-Driven Development (TDD) is mandatory for all production code.**

Write tests BEFORE implementing features. Red → Green → Refactor cycle.

### Frontend (React + Vite)
- Run `npm run test` in `web/` before commits
- Run `npm run test:coverage` to verify minimum 70% coverage
- Run `npm run lint` in `web/` before commits
- Run `npm run build` in `web/` to verify production build

### Backend (FastAPI)
- Run `pytest` in `learn_system/` before commits
- Run `pytest --cov` to verify minimum 75% coverage for critical modules
- Test auth, ingestion, and scheduling modules first

### Manual Testing Checklist
- Test document uploads for each type (PDF, DOCX, PPTX, Markdown)
- Test auth flows: login, signup, logout, approved user upload restrictions
- Test session recovery: reload mid-practice, verify resume dialog appears
- Verify RLS: users should only see their own data

### Test Organization
- Frontend: Co-located `*.test.jsx` files (LoginForm.jsx → LoginForm.test.jsx)
- Backend: `learn_system/tests/` directory (mirrors app structure)
- Use descriptive test names: `test_<function>_<scenario>_<expected>`

### Before Marking Milestone Complete
1. All tests pass (frontend + backend)
2. Coverage meets targets (70% frontend, 75% backend critical modules)
3. No skipped tests without documented rationale
4. Archive test approach to `.claude/memory/milestones/`
```

**Update "Development Commands" section:**

```markdown
## Development Commands

```bash
# Web UI (primary interface)
cd web/
npm install              # Install dependencies
npm run dev              # Development server at http://localhost:5173
npm run build            # Production build
npm run lint             # Lint code
npm run test             # Run tests (watch mode)
npm run test:coverage    # Run tests with coverage report

# Backend API
cd learn_system/
pip install -r requirements.txt
uvicorn app.api.server:app --port 8001 --reload  # API at http://localhost:8001
pytest                   # Run all tests
pytest --cov=app         # Run tests with coverage
pytest -v -k "test_auth" # Run specific test pattern

# CLI (optional, all commands functional)
python -m app.main init                    # Initialize database and bundles
python -m app.main ingest <file> --domain  # Process document, extract KCs
python -m app.main status                  # Show system statistics
python -m app.main sources                 # List ingested documents
python -m app.main todo                    # Show what's due for review
python -m app.main study --duration 30     # Start study session
python -m app.main review <pattern>        # Focus session on specific source
```
```

**Add to "Coding Constraints" Do section:**
```markdown
- Write tests before implementing features (TDD)
- Verify all tests pass before marking milestone complete
```

**Add to "Coding Constraints" Do Not section:**
```markdown
- Skip tests for "quick fixes" (all production code needs tests)
- Mark milestone complete with failing tests
```

---

## Part 3: EXECPLAN.md Updates

**Add new operational policy after Memory Access Protocols (after line 550):**

```markdown
### Test-Driven Development (OPERATIONAL POLICY - DO NOT DELETE)

TDD is mandatory for all production code. Write tests BEFORE implementing features.

**Mandatory for:**
- All backend API endpoints
- All frontend components handling user input
- All data processing pipelines
- All database migrations

**NOT mandatory for:**
- Spike explorations (throwaway prototypes)
- Configuration-only changes
- Documentation updates
- Memory system updates

**Modified Cleanup Loop:**

```
Work → Test → Archive → Slim → Repeat
       ↑
       └─ Mandatory pre-completion
```

**Pre-Completion Verification:**

Before marking ANY milestone complete:

1. **Test Execution**
   - `npm run test:run` (frontend) - all pass
   - `pytest` (backend) - all pass

2. **Coverage Check**
   - Frontend: ≥70%
   - Backend: ≥75% for critical modules (auth, ingestion, scheduling)

3. **Quality Check**
   - No skipped tests (@pytest.mark.skip)
   - Tests verify behavior, not implementation
   - Happy path + edge cases covered

**Failure Handling:**

If tests don't pass:
- ✗ DO NOT mark milestone complete
- ✗ DO NOT run Cleanup Loop
- ✓ DO document issue in "Known Issues"
- ✓ DO keep milestone "in-progress"

**Memory Integration:**

When archiving to `.claude/memory/milestones/[feature].md`, include:

```
## Testing Approach (MXX)

**Test Files:** paths/to/test/files
**Coverage:** XX% (Y/Z lines)
**Key Cases:** brief list
**Gotchas:** tricky mocking or setup
```

**Verification Commands:**

```bash
# Frontend
cd web/ && npm run test:run && npm run test:coverage

# Backend
cd learn_system/ && pytest --cov=app -v
```
```

---

## Part 4: Memory System Structure

**Create new directory:**
```
.claude/memory/quality/
```

**Create .claude/memory/quality/testing.md:**

```markdown
# Testing and Quality Assurance

**Last Updated:** 2026-01-28
**Summary:** Test strategy, coverage, and quality metrics

## Quick Reference

| Layer | Framework | Command | Min Coverage |
|-------|-----------|---------|--------------|
| Frontend | Vitest + RTL | `npm run test` | 70% |
| Backend | pytest | `pytest -v` | 75% |

## Test Coverage by Module

### Frontend (web/src/)

| Module | Test File | Coverage | Status |
|--------|-----------|----------|--------|
| TBD | TBD | 0% | Pending |

### Backend (learn_system/app/)

| Module | Test File | Coverage | Status |
|--------|-----------|----------|--------|
| TBD | TBD | 0% | Pending |

## Cross-References

- Decision: `decisions/testing_strategy.md` (TBD)
- Patterns: `quality/patterns.md` (TBD)
```

**Update .claude/memory/INDEX.md:**

Add to Quick Navigation:
```markdown
| Quality | 1 | Testing milestones, coverage, patterns |
```

Add to File Summaries:
```markdown
### quality/

| File | Topics |
|------|--------|
| `testing.md` | Test framework setup, coverage by module, known issues |
```

---

## Part 5: Implementation Roadmap

### Phase 1: Setup (Day 1)

| Task | Time |
|------|------|
| Install frontend test dependencies | 5 min |
| Create vitest.config.js | 5 min |
| Create src/__tests__/setup.js | 5 min |
| Update package.json scripts | 5 min |
| Install backend test dependencies | 5 min |
| Create pytest.ini | 5 min |
| Create tests/conftest.py | 10 min |

### Phase 2: First Tests (Day 1-2)

| Task | Priority |
|------|----------|
| Backend: test_health.py (simplest) | HIGH |
| Backend: test_auth.py (critical) | HIGH |
| Frontend: setup.js validation | HIGH |
| Frontend: LoginForm.test.jsx | HIGH |

### Phase 3: Documentation (Day 2)

| Task | File |
|------|------|
| Update Testing Instructions | CLAUDE.md |
| Update Development Commands | CLAUDE.md |
| Update Coding Constraints | CLAUDE.md |
| Add TDD Operational Policy | EXECPLAN.md |
| Create quality/testing.md | .claude/memory/ |
| Update INDEX.md | .claude/memory/ |

### Phase 4: Coverage Expansion (Ongoing)

| Week | Target | Focus |
|------|--------|-------|
| 1 | 40% | Auth, health, core hooks |
| 2 | 60% | Ingestion, practice, contexts |
| 3 | 75% | API endpoints, integration |
| 4+ | 80%+ | E2E, edge cases |

---

## Part 6: Verification Checklist

Before marking TDD implementation complete:

- [ ] Vitest installed and configured (frontend)
- [ ] pytest installed and configured (backend)
- [ ] At least 1 passing test per stack
- [ ] CLAUDE.md Testing Instructions updated
- [ ] CLAUDE.md Development Commands updated
- [ ] CLAUDE.md Coding Constraints updated
- [ ] EXECPLAN.md TDD Operational Policy added
- [ ] .claude/memory/quality/testing.md created
- [ ] .claude/memory/INDEX.md updated
- [ ] `npm run test:run` passes
- [ ] `pytest` passes

---

## Summary

This plan provides a complete implementation path for TDD:

1. **Infrastructure**: Vitest (frontend) + pytest (backend)
2. **Configuration**: vitest.config.js, pytest.ini, setup files
3. **Documentation**: CLAUDE.md and EXECPLAN.md updates
4. **Memory System**: quality/testing.md for archival
5. **Workflow**: Modified Cleanup Loop with test verification

The implementation matches existing project conventions:
- Concise, imperative documentation style
- Tables over prose
- Specific commands and file paths
- Memory archival patterns
- Operational policy format

---

## Worktree Research Sources

| Worktree | Focus | Key Finding |
|----------|-------|-------------|
| tdd-testing-infrastructure | Current state | 0 tests, 0 coverage, no frameworks |
| tdd-claude-md | Documentation | Expand Testing Instructions section |
| tdd-execplan | Operational policy | Add TDD to Cleanup Loop |
| tdd-memory-archival | Memory structure | Create quality/ category |
| tdd-frontend | React patterns | Vitest + RTL, co-located tests |
| tdd-backend | FastAPI patterns | pytest + httpx, tests/ directory |

---

**Ready for implementation. Apply changes in order: Infrastructure → Tests → Documentation → Memory.**
