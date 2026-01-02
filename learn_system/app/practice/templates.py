"""LLM prompt templates for generating practice items by knowledge type."""


def get_factual_prompt(kc: dict) -> str:
    """Returns LLM prompt for generating factual practice items."""
    return """Generate practice items for this FACTUAL knowledge component.

Knowledge Component:
- Name: {name}
- Description: {description}
- Complexity: {complexity}/5

Generate 3 practice items with varying difficulty:
1. A free_recall item (difficulty 1-2): Ask the learner to recall the definition/fact from memory with no cues
2. A cued_recall item (difficulty 2-3): Provide a partial hint or context, ask them to complete it
3. A recognition item (difficulty 1): Multiple choice where learner selects the correct answer

For each item provide:
- practice_mode: "free_recall", "cued_recall", or "recognition"
- difficulty_level: 1-5
- prompt: The question to ask the learner
- expected_response: The correct/ideal answer
- hints: List of 2-3 progressive hints (from subtle to more obvious)
- rubric: Brief criteria for self-assessment

Return as a JSON array. Example format:
[
  {{
    "practice_mode": "free_recall",
    "difficulty_level": 2,
    "prompt": "What is retrieval practice?",
    "expected_response": "Retrieval practice is the act of recalling information from memory, which strengthens memory more effectively than passive review.",
    "hints": ["Think about testing vs studying", "It involves actively pulling information from memory"],
    "rubric": "Full credit: mentions recalling/retrieving from memory and memory strengthening. Partial: mentions one element."
  }}
]""".format(
        name=kc['name'],
        description=kc['description'],
        complexity=kc.get('intrinsic_complexity', 3)
    )


def get_conceptual_prompt(kc: dict) -> str:
    """Returns LLM prompt for generating conceptual practice items."""
    return """Generate practice items for this CONCEPTUAL knowledge component.

Knowledge Component:
- Name: {name}
- Description: {description}
- Complexity: {complexity}/5

Generate 3 practice items with varying difficulty:
1. An explanation item (difficulty 2-3): Ask learner to explain WHY or HOW something works
2. An application item (difficulty 3-4): Present a scenario where learner applies the concept
3. A comparison item (difficulty 3-4): Ask learner to compare/contrast with related concepts

For each item provide:
- practice_mode: "explanation" or "application"
- difficulty_level: 1-5
- prompt: The question or scenario
- expected_response: Key points that should be covered
- hints: List of 2-3 progressive hints
- rubric: Criteria for evaluating the response

Return as a JSON array. Example format:
[
  {{
    "practice_mode": "explanation",
    "difficulty_level": 3,
    "prompt": "Explain why spaced practice is more effective than massed practice for long-term retention.",
    "expected_response": "Spaced practice allows for memory consolidation between sessions, creates multiple retrieval opportunities that strengthen memory traces, and requires more effortful retrieval which enhances encoding.",
    "hints": ["Think about what happens to memories over time", "Consider the role of forgetting in learning"],
    "rubric": "Full credit: mentions consolidation, multiple retrievals, or desirable difficulty. Partial: explains benefit without mechanism."
  }}
]""".format(
        name=kc['name'],
        description=kc['description'],
        complexity=kc.get('intrinsic_complexity', 3)
    )


def get_procedural_cognitive_prompt(kc: dict) -> str:
    """Returns LLM prompt for generating procedural-cognitive practice items."""
    return """Generate practice items for this PROCEDURAL-COGNITIVE knowledge component.

Knowledge Component:
- Name: {name}
- Description: {description}
- Complexity: {complexity}/5

Generate 3 practice items with varying difficulty:
1. A step-listing item (difficulty 2): Ask learner to list the steps of the procedure
2. An application item (difficulty 3-4): Present a problem and ask them to apply the procedure
3. A troubleshooting item (difficulty 4-5): Present a scenario where the procedure isn't working

For each item provide:
- practice_mode: "application"
- difficulty_level: 1-5
- prompt: The problem or question
- expected_response: The solution steps or answer
- hints: List of 2-3 progressive hints
- rubric: Criteria for evaluating correctness

Return as a JSON array. Example format:
[
  {{
    "practice_mode": "application",
    "difficulty_level": 3,
    "prompt": "You're studying for an exam in 2 weeks. Using spaced repetition principles, create a study schedule.",
    "expected_response": "Day 1: Initial study. Day 2-3: First review. Day 5-6: Second review. Day 10: Third review. Day 14: Final review before exam. Intervals increase to match forgetting curve.",
    "hints": ["Think about when forgetting typically occurs", "Reviews should happen just before you'd forget"],
    "rubric": "Full credit: includes increasing intervals and multiple review sessions. Partial: has multiple sessions but intervals are equal."
  }}
]""".format(
        name=kc['name'],
        description=kc['description'],
        complexity=kc.get('intrinsic_complexity', 3)
    )


def get_procedural_execution_prompt(kc: dict) -> str:
    """Returns LLM prompt for generating execution task practice items."""
    return """Generate practice items for this PROCEDURAL-EXECUTION knowledge component (hands-on skill).

Knowledge Component:
- Name: {name}
- Description: {description}
- Complexity: {complexity}/5

Generate 3 practice items with varying difficulty:
1. A guided task (difficulty 2): Provide step-by-step guidance for the execution
2. An independent task (difficulty 3-4): Describe what to accomplish without detailed steps
3. A challenging task (difficulty 4-5): Add constraints or complications

For each item provide:
- practice_mode: "execution"
- difficulty_level: 1-5
- prompt: Clear description of the task to perform
- expected_response: What successful completion looks like
- hints: List of 2-3 hints if they get stuck
- success_criteria: Specific observable criteria for completion

Return as a JSON array. Example format:
[
  {{
    "practice_mode": "execution",
    "difficulty_level": 3,
    "prompt": "Create a spaced repetition flashcard deck for a topic you're currently learning. Include at least 10 cards with varied question types.",
    "expected_response": "A flashcard deck with 10+ cards covering key concepts, using both recall and recognition questions, organized by subtopic.",
    "hints": ["Start with the most important concepts", "Mix fact-based and explanation-based questions"],
    "success_criteria": "Deck created with 10+ cards, cards test recall not just recognition, topics are properly organized"
  }}
]""".format(
        name=kc['name'],
        description=kc['description'],
        complexity=kc.get('intrinsic_complexity', 3)
    )


def get_prompt_for_kc_type(kc: dict) -> str:
    """Returns the appropriate prompt template based on KC knowledge type."""
    knowledge_type = kc.get('knowledge_type', 'conceptual').lower()

    prompt_map = {
        'factual': get_factual_prompt,
        'conceptual': get_conceptual_prompt,
        'procedural_cognitive': get_procedural_cognitive_prompt,
        'procedural_execution': get_procedural_execution_prompt,
    }

    prompt_func = prompt_map.get(knowledge_type, get_conceptual_prompt)
    return prompt_func(kc)
