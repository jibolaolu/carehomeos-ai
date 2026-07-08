"""
Enhanced CQC Service with LLM-powered auto-tagging
==================================================
Replaces keyword-only tagging with GPT-4o mini analysis for all 34 Quality Statements.
Keyword rules remain as fast-path pre-filter.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

from app.services.llm_router import TaskType, complete

logger = logging.getLogger(__name__)


# Keyword-based fast path (8 rules from original)
KEYWORD_TAG_RULES: dict[str, list[str]] = {
    "nutrition": ["Effective: nutrition and hydration", "Responsive: personalised care"],
    "mobility": ["Safe: managing risks", "Effective: assessing needs"],
    "skin": ["Safe: managing risks", "Effective: monitoring outcomes"],
    "mood": ["Caring: kindness and compassion", "Responsive: personalised care"],
    "safeguarding": ["Safe: safeguarding people from abuse"],
    "medication": ["Safe: medicines optimisation"],
    "audit": ["Well-led: governance and assurance"],
    "family": ["Caring: involving people", "Responsive: listening to concerns"],
}


# Full 34 Quality Statements mapping
QUALITY_STATEMENTS = {
    # Safe
    "S1": "Safe: safeguarding people from abuse",
    "S2": "Safe: protection from discrimination",
    "S3": "Safe: safe environment, premises, equipment",
    "S4": "Safe: safe use of medicines",
    "S5": "Safe: infection prevention and control",
    "S6": "Safe: safe and effective staffing",
    "S7": "Safe: learning culture",
    "S8": "Safe: medicines optimisation",
    "S9": "Safe: consent to care and treatment",
    
    # Effective
    "E1": "Effective: assessing needs",
    "E2": "Effective: delivering evidence-based care",
    "E3": "Effective: consent",
    "E4": "Effective: nutritional support",
    "E5": "Effective: coordinated care",
    "E6": "Effective: staff competency",
    
    # Caring
    "C1": "Caring: kindness, dignity, compassion",
    "C2": "Caring: privacy",
    "C3": "Caring: involving people",
    "C4": "Caring: responding to concerns",
    "C5": "Caring: emotional support",
    
    # Responsive
    "R1": "Responsive: person-centred care",
    "R2": "Responsive: timely access",
    "R3": "Responsive: information accessibility",
    "R4": "Responsive: listening to concerns",
    "R5": "Responsive: equity in outcomes",
    "R6": "Responsive: end of life care",
    "R7": "Responsive: complaint handling",
    
    # Well-led
    "W1": "Well-led: leadership capacity",
    "W2": "Well-led: vision and strategy",
    "W3": "Well-led: governance",
    "W4": "Well-led: engagement",
    "W5": "Well-led: learning culture",
    "W6": "Well-led: sustainability",
    "W7": "Well-led: partnerships",
}


CQC_TAGGING_SYSTEM_PROMPT = """You are a CQC compliance expert. Map care home activities to the 34 CQC Quality Statements across 5 Key Questions.

Key Questions and Quality Statements:

SAFE (S1-S9):
S1: Safeguarding people from abuse
S2: Protection from discrimination  
S3: Safe environment, premises, equipment
S4: Safe use of medicines
S5: Infection prevention and control
S6: Safe and effective staffing
S7: Learning culture
S8: Medicines optimisation
S9: Consent to care and treatment

EFFECTIVE (E1-E6):
E1: Assessing needs
E2: Delivering evidence-based care
E3: Consent
E4: Nutritional support
E5: Coordinated care
E6: Staff competency

CARING (C1-C5):
C1: Kindness, dignity, compassion
C2: Privacy
C3: Involving people
C4: Responding to concerns
C5: Emotional support

RESPONSIVE (R1-R7):
R1: Person-centred care
R2: Timely access
R3: Information accessibility
R4: Listening to concerns
R5: Equity in outcomes
R6: End of life care
R7: Complaint handling

WELL-LED (W1-W7):
W1: Leadership capacity
W2: Vision and strategy
W3: Governance
W4: Engagement
W5: Learning culture
W6: Sustainability
W7: Partnerships

Respond ONLY with a JSON array of matching Quality Statement codes. Be precise and specific."""


async def tag_quality_statement(
    note_type: str,
    text: str = "",
    use_llm: bool = True,
) -> list[str]:
    """Auto-tag care note to CQC Quality Statements.
    
    Uses keyword fast-path first, then LLM for comprehensive analysis.
    
    Args:
        note_type: Type of care note (nutrition, mobility, etc.)
        text: Full text content of the note
        use_llm: Whether to use LLM analysis (default True)
    
    Returns:
        List of Quality Statement tags
    """
    # Fast path: keyword matching
    keyword_tags = _keyword_tag(note_type, text)
    
    if not use_llm:
        return keyword_tags
    
    # LLM path for comprehensive analysis
    try:
        llm_tags = await _llm_tag(note_type, text)
        
        # Merge and deduplicate
        all_tags = list(set(keyword_tags + llm_tags))
        
        # Validate tags exist in our mapping
        valid_tags = [t for t in all_tags if t in QUALITY_STATEMENTS]
        
        logger.debug(f"CQC tags for {note_type}: {valid_tags} (keywords: {keyword_tags}, llm: {llm_tags})")
        
        return sorted(valid_tags) if valid_tags else ["R1"]
        
    except Exception as e:
        logger.warning(f"LLM CQC tagging failed, using keywords only: {e}")
        return keyword_tags if keyword_tags else ["R1"]


def _keyword_tag(note_type: str, text: str) -> list[str]:
    """Fast keyword-based tagging."""
    lower = f"{note_type} {text}".lower()
    tags: list[str] = []
    
    for keyword, mapped in KEYWORD_TAG_RULES.items():
        if keyword in lower:
            # Convert descriptive tags to codes
            for tag in mapped:
                code = _tag_to_code(tag)
                if code:
                    tags.append(code)
    
    return sorted(set(tags))


def _tag_to_code(tag: str) -> str | None:
    """Convert descriptive tag to Quality Statement code."""
    # Reverse lookup from QUALITY_STATEMENTS
    for code, description in QUALITY_STATEMENTS.items():
        if tag.lower() in description.lower() or description.lower() in tag.lower():
            return code
    return None


async def _llm_tag(note_type: str, text: str) -> list[str]:
    """LLM-based comprehensive CQC tagging."""
    prompt = f"""Analyse this care home note and map it to the relevant CQC Quality Statements.

Note type: {note_type}
Content: {text[:800]}

Respond ONLY with a JSON array of matching Quality Statement codes, e.g., ["S3", "E2", "C1"].
If no specific statements match, return ["R1"].
Be precise -- only include statements that are clearly evidenced by this note."""

    result = await complete(
        task_type=TaskType.CQC_PACK,
        prompt=prompt,
        system=CQC_TAGGING_SYSTEM_PROMPT,
    )
    
    # Parse response
    response_text = result.text.strip()
    
    # Try to extract JSON array
    try:
        # Find array in response
        start = response_text.find("[")
        end = response_text.rfind("]") + 1
        if start >= 0 and end > start:
            codes = json.loads(response_text[start:end])
            if isinstance(codes, list):
                return [str(c).upper() for c in codes if isinstance(c, str)]
    except (json.JSONDecodeError, ValueError):
        pass
    
    # Fallback: extract codes manually
    import re
    codes = re.findall(r'[A-Z]\d+', response_text.upper())
    return codes if codes else ["R1"]


async def build_regulation_17_trail(
    finding: str,
    owner: str,
    due: str,
    home_id: str,
    audit_id: str | None = None,
) -> dict[str, Any]:
    """Build a Regulation 17 improvement loop trail.
    
    Args:
        finding: Audit finding description
        owner: Person responsible for action
        due: Deadline for completion
        home_id: Care home ID
        audit_id: Related audit ID
    
    Returns:
        Structured Regulation 17 trail record
    """
    return {
        "regulation": "Regulation 17: Good governance",
        "finding": finding,
        "owner": owner,
        "due": due,
        "home_id": home_id,
        "audit_id": audit_id,
        "evidence_chain": [
            "audit finding recorded",
            "action owner assigned",
            "deadline recorded",
            "improvement plan created",
        ],
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "cqc_tags": ["W3"],  # Governance
    }


async def get_cqc_snapshot(home_id: str) -> dict[str, Any]:
    """Get current CQC readiness snapshot for a care home.
    
    Args:
        home_id: Care home ID
    
    Returns:
        Snapshot with scores per Key Question and overall readiness
    """
    from app.demo_data import CQC_SNAPSHOT
    
    # In production, this would query real evidence counts
    # For now, return demo data with home_id injected
    snapshot = CQC_SNAPSHOT.copy()
    snapshot["home_id"] = home_id
    snapshot["snapshot_date"] = datetime.now(timezone.utc).isoformat()
    
    return snapshot


async def calculate_readiness_score(home_id: str) -> dict[str, Any]:
    """Calculate a 0-100 readiness score per Key Question.
    
    Args:
        home_id: Care home ID
    
    Returns:
        Scores with trend analysis
    """
    # This would query actual evidence in production
    # For now, return a structured template
    return {
        "home_id": home_id,
        "calculated_at": datetime.now(timezone.utc).isoformat(),
        "overall_score": 0,
        "key_questions": {
            "safe": {"score": 0, "evidence_count": 0, "trend": "stable"},
            "effective": {"score": 0, "evidence_count": 0, "trend": "stable"},
            "caring": {"score": 0, "evidence_count": 0, "trend": "stable"},
            "responsive": {"score": 0, "evidence_count": 0, "trend": "stable"},
            "well_led": {"score": 0, "evidence_count": 0, "trend": "stable"},
        },
        "priority_gaps": [],
        "strengths": [],
    }
