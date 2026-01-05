# API Schema

**Last Updated:** 2026-01-04
**Framework:** FastAPI
**Location:** `learn_system/app/api/`

## Server Configuration

- **Entry point:** `app/api/server.py`
- **Port:** 8001
- **Start command:** `uvicorn app.api.server:app --reload --port 8001`
- **CORS:** Enabled for frontend (localhost:5173)

## Endpoints

### Health

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Server health check |

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-01-04T12:00:00Z"
}
```

### Sources

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/sources/upload` | Upload and process document |
| GET | `/api/sources/{id}/status` | Get processing status |
| POST | `/api/sources/{id}/retry` | Retry failed processing |
| DELETE | `/api/sources/{id}` | Delete source and related data |

**POST /api/sources/upload**

Request: `multipart/form-data`
- `file`: The document file (.pdf, .docx, .md, .txt)
- `domain`: Optional domain classification

Response:
```json
{
  "source_id": "src_abc123",
  "status": "pending",
  "message": "Upload received, processing started"
}
```

**GET /api/sources/{id}/status**

Response:
```json
{
  "source_id": "src_abc123",
  "processing_status": "generating_items",
  "processing_progress": 75,
  "processing_step": "Generating practice items (12/15)",
  "kc_count": 15,
  "item_count": 36
}
```

Processing status values:
- `pending` - Waiting to start
- `extracting_text` - Parsing document
- `extracting_kcs` - LLM analyzing content
- `generating_items` - Creating practice questions
- `ready` - Complete
- `error` - Failed (see error_message)

**DELETE /api/sources/{id}**

Deletes:
1. All practice_items for source's KCs
2. All kc_state for source's KCs
3. All knowledge_components for source
4. The content_source record

## Pydantic Models

Location: `app/api/models/schemas.py`

```python
class ProcessingStatus(str, Enum):
    PENDING = "pending"
    EXTRACTING_TEXT = "extracting_text"
    EXTRACTING_KCS = "extracting_kcs"
    GENERATING_ITEMS = "generating_items"
    READY = "ready"
    ERROR = "error"

class UploadResponse(BaseModel):
    source_id: str
    status: ProcessingStatus
    message: str

class ProcessingStatusResponse(BaseModel):
    source_id: str
    processing_status: ProcessingStatus
    processing_progress: int
    processing_step: Optional[str]
    kc_count: Optional[int]
    item_count: Optional[int]
    error_message: Optional[str]
```

## Processing Pipeline

Location: `app/api/services/processing.py`

Class: `ProcessingPipeline`

Flow:
1. `update_status(source_id, "extracting_text", 10)`
2. Call `ingest_document()` with progress_callback
3. `update_status(source_id, "extracting_kcs", 40)`
4. Call `extract_kcs()`
5. `update_status(source_id, "generating_items", 60)`
6. Call `generate_all_items()`
7. `update_status(source_id, "ready", 100)`

Error handling:
- Catches exceptions
- Updates status to "error"
- Stores error_message for display

## Frontend API Client

Location: `web/src/services/sourcesApi.js`

```javascript
export async function uploadSource(file, domain) {
  const formData = new FormData();
  formData.append('file', file);
  if (domain) formData.append('domain', domain);

  const response = await fetch('http://localhost:8001/api/sources/upload', {
    method: 'POST',
    body: formData
  });
  return response.json();
}

export async function getSourceStatus(sourceId) {
  const response = await fetch(`http://localhost:8001/api/sources/${sourceId}/status`);
  return response.json();
}

export async function retrySource(sourceId) {
  const response = await fetch(`http://localhost:8001/api/sources/${sourceId}/retry`, {
    method: 'POST'
  });
  return response.json();
}

export async function deleteSource(sourceId) {
  const response = await fetch(`http://localhost:8001/api/sources/${sourceId}`, {
    method: 'DELETE'
  });
  return response.json();
}
```

## Cross-References

- Related database: `schemas/database.md` (content_sources table)
- Related milestones: `milestones/sources_feature.md` (M18 implementation)
