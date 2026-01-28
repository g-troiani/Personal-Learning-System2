# Testing Documentation

**Last Updated:** 2026-01-28
**Milestones:** T1-T6 (TDD Foundation)

## Overview

**TDD is mandatory for EVERY milestone.** No milestone is complete without passing tests. Two test categories:
- **Logic Tests**: Automated via pytest (backend) and Vitest (frontend)
- **UI Tests**: Browser automation via Chrome extension

### Agent Separation Policy (MANDATORY)

**The agent that writes tests MUST be different from the agent that implements the solution.**

This prevents bias where the implementer writes tests that only cover their own assumptions. Separation ensures:
1. Tests verify requirements, not implementation details
2. Edge cases are discovered by fresh perspective
3. Tests serve as independent documentation of expected behavior

**Workflow for EVERY milestone:**
1. Spawn **Test Agent** to read requirements and write failing tests first
2. Spawn **Implementation Agent** to write code that passes the tests
3. **Test Agent** reviews coverage and adds edge cases
4. Both agents are spawned from the same milestone but with different prompts

## Test Infrastructure

### Backend (pytest)

**Location:** `learn_system/tests/`

**Configuration:** `learn_system/pytest.ini`
```ini
[pytest]
asyncio_mode = auto
testpaths = tests
addopts = -v --strict-markers --tb=short --cov=app --cov-report=term-missing
markers =
    unit: Pure function tests (no external deps)
    integration: API + database tests
    auth: Authentication tests
```

**Dependencies:** `learn_system/requirements.txt`
- pytest>=7.4.0
- pytest-asyncio>=0.23.0
- pytest-cov>=4.1.0
- pytest-mock>=3.12.0
- httpx>=0.25.0
- responses>=0.24.0

**Run Commands:**
```bash
cd learn_system
pytest -v                    # All tests
pytest --cov=app -v          # With coverage
pytest tests/unit/           # Unit tests only
pytest -k "test_health"      # Filter by name
```

### Frontend (Vitest)

**Location:** `web/src/**/*.test.js`

**Configuration:** `web/vitest.config.js`
```javascript
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
  },
})
```

**Dependencies:** `web/package.json` devDependencies
- vitest
- @vitest/ui
- @testing-library/react
- @testing-library/jest-dom
- @testing-library/user-event
- jsdom
- @vitest/coverage-v8

**Run Commands:**
```bash
cd web
npm run test             # Watch mode
npm run test:run         # Single run
npm run test:coverage    # With coverage
```

## Test Coverage

### Backend Tests (T1)

| File | Tests | Coverage |
|------|-------|----------|
| `tests/unit/test_health.py` | 5 | Health endpoint |
| `tests/unit/test_spacing.py` | 16 | SM-2 algorithm, priority scoring |
| `tests/conftest.py` | - | Fixtures: app, client, mock_supabase, auth |

**Current Coverage:** 23% overall (core modules: 100% spacing.py, 100% health.py)

### Frontend Tests (T2)

| File | Tests | Coverage |
|------|-------|----------|
| `src/hooks/useSessionPersistence.test.js` | 24 | Session persistence logic |

**Test Categories:**
- parseQueueItemIds: JSON parsing
- Session cache operations: localStorage
- isSessionValid: Age validation
- Tab lock logic: Multi-tab prevention

## UI Test Protocol (T3)

### When to Use UI Tests

| Change Type | UI Test Required |
|-------------|------------------|
| New component | Yes |
| Styling/layout | Yes |
| User flow change | Yes |
| Backend-only | No |
| Hook logic only | No |

### Chrome Extension Tools

| Tool | Purpose |
|------|---------|
| `mcp__claude-in-chrome__computer` (screenshot) | Capture visual state |
| `mcp__claude-in-chrome__computer` (left_click) | Click buttons/links |
| `mcp__claude-in-chrome__form_input` | Fill form fields |
| `mcp__claude-in-chrome__navigate` | Go to URLs |
| `mcp__claude-in-chrome__read_page` | Verify element presence |
| `mcp__claude-in-chrome__find` | Locate elements by description |
| `mcp__claude-in-chrome__resize_window` | Test responsive design |

### UI Test Checklist

```
[ ] Start dev server: cd web && npm run dev
[ ] Navigate to http://localhost:5173
[ ] Take screenshot of affected pages
[ ] Test user interactions (click, type, submit)
[ ] Verify visual correctness
[ ] Test at mobile viewport (375px width)
[ ] Test at tablet viewport (768px width)
[ ] Document any visual issues found
```

### Responsive Breakpoints

| Viewport | Width | Test For |
|----------|-------|----------|
| Mobile | 375px | Touch-friendly, stacked layout |
| Tablet | 768px | Sidebar behavior |
| Desktop | 1024px | Standard layout |
| Large | 1440px | Wide content |

## Fixtures Reference

### Backend Fixtures (`conftest.py`)

```python
# App fixtures
@pytest.fixture(scope="session")
def app(): ...                    # FastAPI app instance

@pytest.fixture(scope="function")
def client(app): ...              # TestClient

# Mock Supabase
@pytest.fixture
def mock_supabase_client(): ...   # Mock client
@pytest.fixture
def mock_supabase(...): ...       # Patched global

# Auth fixtures
@pytest.fixture
def test_user_id(): ...           # "test-user-uuid-12345"
@pytest.fixture
def auth_headers(): ...           # Bearer token header
@pytest.fixture
def mock_jwt_decode(...): ...     # JWT decode mock

# Time fixtures
@pytest.fixture
def fixed_now(): ...              # datetime(2026, 1, 28, 12, 0, 0)

# Sample data
@pytest.fixture
def sample_kc_state(): ...
@pytest.fixture
def sample_source(): ...
```

### Frontend Setup (`setup.js`)

```javascript
// Mocked browser APIs
- localStorage (getItem, setItem, removeItem, clear)
- matchMedia
- ResizeObserver
- IntersectionObserver
- scrollTo
```

## Test Patterns

### Backend: Testing Pure Functions

```python
@pytest.mark.unit
def test_failed_attempt_resets_interval(self, spacing_module):
    """Score < 0.5 should reset interval to 1 day."""
    new_interval, new_ef, _ = spacing_module(
        score=0.4,
        current_interval=10.0,
        easiness_factor=2.5
    )
    assert new_interval == 1.0
```

### Backend: Testing API Endpoints

```python
@pytest.mark.unit
def test_health_check_returns_200(self, client):
    """Health endpoint should return 200."""
    response = client.get("/api/health")
    assert response.status_code == 200
```

### Frontend: Testing Hook Logic

```javascript
describe('parseQueueItemIds', () => {
  it('should parse valid JSON array', () => {
    const result = parseQueueItemIds('["item_1", "item_2"]')
    expect(result).toEqual(['item_1', 'item_2'])
  })
})
```

### Frontend: Testing localStorage

```javascript
describe('Session cache operations', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should save session data to localStorage', () => {
    saveToCache({ id: 'test' })
    const cached = JSON.parse(localStorage.getItem(STORAGE_KEY))
    expect(cached.id).toBe('test')
  })
})
```

## Implementation Notes (T1-T6)

### T1: Backend Test Infrastructure
- Added pytest dependencies to requirements.txt
- Created pytest.ini with async support
- Created conftest.py with fixtures for mocking
- Created test_health.py (5 tests)
- Created test_spacing.py (16 tests)
- **Result:** 21 tests passing

### T2: Frontend Test Infrastructure
- Added Vitest and testing-library dependencies
- Created vitest.config.js with jsdom environment
- Added test scripts to package.json
- Created setup.js with browser API mocks
- Created useSessionPersistence.test.js (24 tests)
- **Result:** 24 tests passing

### T3: UI Test Protocol
- Validated Chrome extension UI testing workflow
- Tested navigation between pages
- Tested responsive design at 375px viewport
- Documented tools and checklist

### T4: Documentation Updates
- Updated CLAUDE.md Testing Instructions section
- Added test commands to Development Commands
- Added TDD requirements to Coding Constraints

### T5: Memory System Integration
- Created quality/testing.md (this file)
- Updated INDEX.md with quality/ category

### T6: Validation
- Backend: `pytest -v` → 21 passed
- Frontend: `npm run test:run` → 24 passed
- UI: Screenshots verified, navigation works, responsive OK

## Known Issues

1. **pyiceberg deprecation warnings** - Harmless warnings from pyparsing
2. **urllib3 OpenSSL warning** - LibreSSL compatibility, doesn't affect tests
3. **Coverage gaps** - Many modules at 0% (CLI, ingestion, extractors)

## Future Improvements

1. Add integration tests for API endpoints with mocked Supabase
2. Add E2E tests for critical user flows
3. Increase coverage to 70% frontend, 75% backend
4. Add visual regression testing with screenshots
