"""Knowledge Component extraction using LLM."""

import json
import re
from typing import List, Dict, Any

from anthropic import Anthropic

from ..config import get_api_key, ANTHROPIC_MODEL
from ..database.queries import insert_kc, get_kcs_for_source


# Extraction prompt template from EXECPLAN.md
# Note: Using double braces {{ }} to escape them for .format()
KC_EXTRACTION_PROMPT = """You are analyzing educational content to extract learnable knowledge components.

For each distinct concept, skill, or fact that a learner should master, extract:
1. name: A concise identifier (3-8 words)
2. description: What the learner should know or be able to do (1-3 sentences)
3. knowledge_type: One of factual, conceptual, procedural_cognitive, procedural_execution
4. cognitive_level: One of remember, understand, apply, analyze, evaluate, create
5. intrinsic_complexity: 1-5 where 1 is simple definition, 5 is complex multi-step concept
6. prerequisites: Names of other KCs that should be learned first (if any, as a list of strings)

Knowledge type definitions:
- factual: Definitions, terms, formulas. Tested by recall.
- conceptual: Principles, relationships, "why" knowledge. Tested by explanation.
- procedural_cognitive: Problem-solving methods. Tested by solving problems.
- procedural_execution: Hands-on skills. Tested by doing tasks.

Return ONLY a JSON array with no additional text. Extract 10-20 knowledge components from this content.
Be specific and granular. Each KC should be independently learnable and testable.

Example output format:
[
  {{
    "name": "Definition of Retrieval Practice",
    "description": "Retrieval practice is the act of recalling information from memory, which strengthens the memory trace more effectively than passive review.",
    "knowledge_type": "factual",
    "cognitive_level": "remember",
    "intrinsic_complexity": 2,
    "prerequisites": []
  }}
]

Content to analyze:
{content}"""


def get_anthropic_client() -> Anthropic:
    """Returns configured Anthropic client."""
    return Anthropic(api_key=get_api_key())


def chunk_content(content: str, max_chars: int = 20000) -> List[str]:
    """
    Splits content into chunks for processing, preserving paragraph boundaries.

    Args:
        content: The full text content
        max_chars: Maximum characters per chunk (default 20000)

    Returns:
        List of content chunks
    """
    if len(content) <= max_chars:
        return [content]

    chunks = []
    paragraphs = content.split('\n\n')
    current_chunk = []
    current_length = 0

    for para in paragraphs:
        para_length = len(para) + 2  # +2 for \n\n

        if current_length + para_length > max_chars and current_chunk:
            # Save current chunk and start new one
            chunks.append('\n\n'.join(current_chunk))
            current_chunk = [para]
            current_length = para_length
        else:
            current_chunk.append(para)
            current_length += para_length

    # Don't forget the last chunk
    if current_chunk:
        chunks.append('\n\n'.join(current_chunk))

    return chunks


def parse_llm_response(response_text: str) -> List[Dict[str, Any]]:
    """
    Parses LLM response text into a list of KC dictionaries.

    Args:
        response_text: Raw text response from LLM

    Returns:
        List of parsed KC dictionaries
    """
    # Clean up response text
    text = response_text.strip()

    # Remove markdown code block markers if present
    if text.startswith('```json'):
        text = text[7:]
    elif text.startswith('```'):
        text = text[3:]
    if text.endswith('```'):
        text = text[:-3]
    text = text.strip()

    # Try to find JSON array in response
    json_match = re.search(r'\[[\s\S]*?\](?=\s*$|\s*```)', text)

    if not json_match:
        # Try a more aggressive match
        json_match = re.search(r'\[\s*\{[\s\S]*\}\s*\]', text)

    if not json_match:
        raise ValueError(f"No JSON array found in LLM response. Response starts with: {text[:200]}")

    json_str = json_match.group(0)

    try:
        kcs = json.loads(json_str)
    except json.JSONDecodeError as e:
        # Try to fix common issues
        # Sometimes there are trailing commas
        fixed_json = re.sub(r',\s*]', ']', json_str)
        fixed_json = re.sub(r',\s*}', '}', fixed_json)
        try:
            kcs = json.loads(fixed_json)
        except json.JSONDecodeError:
            raise ValueError(f"Failed to parse JSON: {e}. JSON snippet: {json_str[:500]}")

    if not isinstance(kcs, list):
        raise ValueError("Expected JSON array of knowledge components")

    # Validate and normalize each KC
    validated_kcs = []
    valid_types = {'factual', 'conceptual', 'procedural_cognitive', 'procedural_execution'}
    valid_levels = {'remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'}

    for kc in kcs:
        if not isinstance(kc, dict):
            continue

        # Required fields
        if 'name' not in kc or 'description' not in kc:
            continue

        # Normalize knowledge_type
        ktype = kc.get('knowledge_type', 'conceptual').lower()
        if ktype not in valid_types:
            ktype = 'conceptual'

        # Normalize cognitive_level
        level = kc.get('cognitive_level', 'understand').lower()
        if level not in valid_levels:
            level = 'understand'

        # Normalize complexity
        complexity = kc.get('intrinsic_complexity', 3)
        if not isinstance(complexity, int) or complexity < 1:
            complexity = 3
        complexity = min(5, max(1, complexity))

        # Normalize prerequisites
        prereqs = kc.get('prerequisites', [])
        if not isinstance(prereqs, list):
            prereqs = []

        validated_kcs.append({
            'name': str(kc['name']).strip(),
            'description': str(kc['description']).strip(),
            'knowledge_type': ktype,
            'cognitive_level': level,
            'intrinsic_complexity': complexity,
            'prerequisites': prereqs,
        })

    return validated_kcs


def extract_kcs_from_chunk(client: Anthropic, content: str, domain: str) -> List[Dict[str, Any]]:
    """
    Extracts knowledge components from a single content chunk.

    Args:
        client: Anthropic client
        content: Content chunk to analyze
        domain: Knowledge domain for context

    Returns:
        List of KC dictionaries
    """
    prompt = KC_EXTRACTION_PROMPT.format(content=content)

    try:
        message = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=4096,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        response_text = message.content[0].text
        return parse_llm_response(response_text)
    except Exception as e:
        # Re-raise with more context
        raise ValueError(f"LLM extraction failed: {str(e)[:200]}")


def extract_kcs(source_id: str, content: str, domain: str) -> List[Dict[str, Any]]:
    """
    Calls LLM to extract knowledge components from content.

    Args:
        source_id: ID of the source document
        content: Full text content to analyze
        domain: Knowledge domain for categorization

    Returns:
        List of KC dictionaries with name, description, type, level, complexity
    """
    client = get_anthropic_client()
    chunks = chunk_content(content)

    all_kcs = []
    seen_names = set()

    for i, chunk in enumerate(chunks):
        try:
            chunk_kcs = extract_kcs_from_chunk(client, chunk, domain)

            # Deduplicate by name within this extraction
            for kc in chunk_kcs:
                name_lower = kc['name'].lower()
                if name_lower not in seen_names:
                    seen_names.add(name_lower)
                    all_kcs.append(kc)

        except Exception as e:
            import traceback
            print(f"Warning: Error extracting KCs from chunk {i+1}/{len(chunks)}:")
            print(f"  Error: {str(e)}")
            traceback.print_exc()
            continue

    return all_kcs


def store_extracted_kcs(source_id: str, kcs: List[Dict[str, Any]], domain: str) -> List[str]:
    """
    Stores extracted knowledge components in the database.

    Args:
        source_id: ID of the source document
        kcs: List of KC dictionaries
        domain: Knowledge domain

    Returns:
        List of created KC IDs
    """
    created_ids = []

    for kc in kcs:
        kc_id = insert_kc(
            source_id=source_id,
            name=kc['name'],
            description=kc['description'],
            knowledge_type=kc['knowledge_type'],
            cognitive_level=kc['cognitive_level'],
            intrinsic_complexity=kc['intrinsic_complexity'],
            domain=domain,
            metadata={'prerequisites': kc.get('prerequisites', [])}
        )
        created_ids.append(kc_id)

    return created_ids


def extract_and_store_kcs(source_id: str, content: str, domain: str) -> int:
    """
    Extracts knowledge components from content and stores them.

    Args:
        source_id: ID of the source document
        content: Full text content to analyze
        domain: Knowledge domain

    Returns:
        Number of KCs created
    """
    # Check if KCs already exist for this source
    existing = get_kcs_for_source(source_id)
    if existing:
        return len(existing)

    # Extract and store
    kcs = extract_kcs(source_id, content, domain)
    if kcs:
        store_extracted_kcs(source_id, kcs, domain)

    return len(kcs)
