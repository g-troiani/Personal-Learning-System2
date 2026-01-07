"""AI-related endpoints - document Q&A chat."""

import os
from typing import Optional, Dict, Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..auth import CurrentUser
from ..auth.ownership import verify_source_ownership
from ...database.connection import get_client


router = APIRouter()


class ChatRequest(BaseModel):
    source_id: str
    message: str
    context: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    response: str
    source_id: str


@router.post("/chat", response_model=ChatResponse)
async def chat_with_document(request: ChatRequest, current_user: CurrentUser):
    """
    Chat with AI about a specific document.
    Uses Groq for fast responses.

    Args:
        request: ChatRequest with source_id, message, and optional context
        current_user: Authenticated user (from JWT)
    """
    verify_source_ownership(request.source_id, current_user)
    try:
        client = get_client()

        # Fetch document content for context
        result = client.table("content_sources").select(
            "id, title, content, domain"
        ).eq("id", request.source_id).single().execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Document not found")

        source = result.data
        document_content = source.get("content", "")[:8000]  # Limit context size

        # Build the prompt
        system_prompt = f"""You are a helpful AI assistant helping a user understand a document.

Document Title: {source.get('title', 'Untitled')}
Domain: {source.get('domain', 'general')}

Document Content (excerpt):
{document_content}

Instructions:
- Answer questions based on the document content above
- Be concise and helpful
- If the answer isn't in the document, say so
- Use quotes from the document when relevant"""

        user_message = request.message

        # Try Groq first (fast), fallback to mock response
        response_text = await _call_llm(system_prompt, user_message)

        return ChatResponse(
            response=response_text,
            source_id=request.source_id
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"AI chat error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get AI response: {str(e)}"
        )


async def _call_llm(system_prompt: str, user_message: str) -> str:
    """Call LLM API for chat response."""

    # Try Groq first
    groq_key = os.getenv("GROQ_API_KEY")
    if groq_key:
        try:
            from groq import Groq
            groq_client = Groq(api_key=groq_key)

            response = groq_client.chat.completions.create(
                model="llama-3.1-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                max_tokens=1024,
                temperature=0.7
            )

            return response.choices[0].message.content

        except Exception as e:
            print(f"Groq API error, trying fallback: {e}")

    # Try Anthropic Claude
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if anthropic_key:
        try:
            import anthropic
            claude_client = anthropic.Anthropic(api_key=anthropic_key)

            response = claude_client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=1024,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_message}
                ]
            )

            return response.content[0].text

        except Exception as e:
            print(f"Anthropic API error: {e}")

    # Fallback mock response if no API keys
    return f"AI chat is not configured. Please set GROQ_API_KEY or ANTHROPIC_API_KEY in your environment.\n\nYour question was: {user_message}"
