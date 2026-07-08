"""
AI Family Communication Hub
===========================
Advanced family communication features including AI-generated visit preparation,
conversation topics, sentiment analysis, and multi-language support.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from app.services.llm_router import TaskType, complete

logger = logging.getLogger(__name__)


FAMILY_HUB_SYSTEM_PROMPT = """You are a warm, empathetic care home family liaison coordinator.
Help families stay connected with their loved ones through meaningful visits and conversations.
Be sensitive to dementia, communication difficulties, and family dynamics."""


async def generate_visit_preparation(
    resident: dict[str, Any],
    upcoming_visit: dict[str, Any] | None = None,
    recent_notes: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Generate personalised visit preparation for family members.
    
    Args:
        resident: Resident profile
        upcoming_visit: Visit details (date, time, family member)
        recent_notes: Recent care notes for context
    
    Returns:
        Visit preparation guide with conversation topics, mood context, and suggestions
    """
    recent_summary = "\n".join([
        f"- [{n.get('created_at', 'unknown')}] {n.get('type', 'general')}: {n.get('summary', 'N/A')}"
        for n in (recent_notes or [])[:5]
    ])
    
    prompt = f"""Prepare a family member for visiting {resident.get('name', 'their loved one')}.

Resident Profile:
- Name: {resident.get('name', 'unknown')}
- Preferred name: {resident.get('preferred_name', resident.get('name', 'unknown'))}
- Age: {resident.get('age', 'unknown')}
- Primary need: {resident.get('primary_need', 'unknown')}
- Cognitive status: {resident.get('cognitive_status', 'unknown')}
- Communication: {resident.get('communication', 'unknown')}
- Current mood trend: {resident.get('mood_trend', 'stable')}
- Likes: {', '.join(resident.get('likes', []))}
- Dislikes: {', '.join(resident.get('dislikes', []))}

Recent Notes:
{recent_summary}

Respond with JSON:
{{
    "visit_preparation": {{
        "mood_context": "how they have been recently",
        "best_time_to_visit": "when they are typically most alert/engaged",
        "what_to_bring": ["suggested items"],
        "what_to_avoid": ["things that might upset them"]
    }},
    "conversation_topics": [
        {{
            "topic": "specific topic",
            "why_it_works": "why this is meaningful for them",
            "conversation_starter": "how to start this conversation",
            "adaptations": "how to adapt if they have memory/cognitive issues"
        }}
    ],
    "activities_during_visit": [
        {{
            "activity": "suggested activity",
            "duration": "15-30 minutes",
            "materials_needed": ["what to bring"],
            "benefits": "why this activity is good"
        }}
    ],
    "communication_tips": [
        "specific tip for communicating with this resident"
    ],
    "emotional_support": {{
        "what_to_expect": "realistic expectations for the visit",
        "if_they_dont_recognise_you": "how to handle this sensitively",
        "if_they_become_upset": "how to respond calmly",
        "leaving_tips": "how to say goodbye without distress"
    }},
    "after_visit": {{
        "reflection_prompts": ["questions to reflect on after the visit"],
        "when_to_visit_again": "suggested frequency"
    }}
}}

Be warm, practical, and sensitive. Consider cognitive status in all suggestions."""

    result = await complete(
        task_type=TaskType.FAMILY_UPDATE,
        prompt=prompt,
        system=FAMILY_HUB_SYSTEM_PROMPT,
    )
    
    preparation = _parse_json_safely(result.text)
    
    if preparation.get("parse_error"):
        preparation = _visit_prep_fallback(resident)
    
    preparation["resident_id"] = resident.get("id")
    preparation["generated_at"] = datetime.now(timezone.utc).isoformat()
    
    return preparation


def _visit_prep_fallback(resident: dict[str, Any]) -> dict[str, Any]:
    """Fallback visit preparation."""
    cognitive = resident.get("cognitive_status", "").lower()
    has_dementia = "dementia" in cognitive or "confus" in cognitive
    
    return {
        "visit_preparation": {
            "mood_context": "They have been generally comfortable with daily support.",
            "best_time_to_visit": "Morning or early afternoon when they are most alert.",
            "what_to_bring": ["Family photos", "Favourite music", "Small snack they enjoy"],
            "what_to_avoid": ["Loud noises", "Too many visitors at once", "Rushing"],
        },
        "conversation_topics": [
            {
                "topic": "Favourite memories",
                "why_it_works": "Connects to long-term memory which is often preserved",
                "conversation_starter": "I was thinking about when we used to...",
                "adaptations": "Use photos as prompts if they struggle to recall" if has_dementia else "Listen and validate their memories",
            },
            {
                "topic": "Daily activities",
                "why_it_works": "Gives them something positive to share",
                "conversation_starter": "What have you been doing today?",
                "adaptations": "Staff can help prompt if needed" if has_dementia else "Show genuine interest",
            },
        ],
        "activities_during_visit": [
            {
                "activity": "Looking at photos together",
                "duration": "15-20 minutes",
                "materials_needed": ["Photo album or digital photos"],
                "benefits": "Stimulates memory and provides emotional connection",
            },
        ],
        "communication_tips": [
            "Speak slowly and clearly",
            "Use their preferred name",
            "Be patient with responses",
            "Non-verbal communication (touch, smile) is powerful",
        ],
        "emotional_support": {
            "what_to_expect": "Visits can vary day to day. Some days they may be more engaged than others.",
            "if_they_dont_recognise_you": "Introduce yourself gently. Don't force recognition. Focus on the moment.",
            "if_they_become_upset": "Stay calm. Validate their feelings. Ask staff for support if needed.",
            "leaving_tips": "Say goodbye warmly but briefly. Long goodbyes can cause distress.",
        },
        "after_visit": {
            "reflection_prompts": ["What went well?", "What would you do differently next time?"],
            "when_to_visit_again": "Weekly visits are ideal if possible",
        },
        "_fallback": True,
    }


async def generate_conversation_topics(
    resident: dict[str, Any],
    family_member: dict[str, Any],
    visit_history: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Generate personalised conversation topics based on shared history.
    
    Args:
        resident: Resident profile
        family_member: Family member profile
        visit_history: Previous visit notes
    
    Returns:
        Conversation topics with starters and adaptations
    """
    shared_history = family_member.get("shared_history", [])
    resident_interests = resident.get("interests", [])
    
    prompt = f"""Generate conversation topics for {family_member.get('name', 'a family member')} visiting {resident.get('name', 'their loved one')}.

Shared history: {', '.join(shared_history)}
Resident interests: {', '.join(resident_interests)}
Resident cognitive status: {resident.get('cognitive_status', 'unknown')}

Respond with JSON:
{{
    "topics": [
        {{
            "topic": "conversation topic",
            "starter": "how to start this conversation",
            "follow_up_questions": ["questions to keep conversation going"],
            "if_they_struggle": "how to adapt if they can't recall",
            "emotional_benefit": "why this conversation matters"
        }}
    ],
    "avoid_topics": ["topics that might cause distress"],
    "general_tips": ["tips for good conversation"]
}}

Focus on positive, meaningful topics that connect to their shared history."""

    result = await complete(
        task_type=TaskType.FAMILY_UPDATE,
        prompt=prompt,
        system=FAMILY_HUB_SYSTEM_PROMPT,
    )
    
    topics = _parse_json_safely(result.text)
    
    if topics.get("parse_error"):
        topics = {
            "topics": [
                {
                    "topic": "Favourite memories",
                    "starter": "I was remembering when we used to...",
                    "follow_up_questions": ["What was your favourite part?", "Who else was there?"],
                    "if_they_struggle": "Describe the memory yourself and invite them to add details",
                    "emotional_benefit": "Connects to preserved long-term memories",
                },
            ],
            "avoid_topics": ["Recent stressful events", "Complex family issues", "Medical details"],
            "general_tips": ["Be patient", "Listen more than talk", "Validate their feelings"],
            "_fallback": True,
        }
    
    return topics


async def analyse_family_sentiment(
    family_messages: list[dict[str, Any]],
) -> dict[str, Any]:
    """Analyse sentiment in family communications to identify concerns.
    
    Args:
        family_messages: List of messages from family app
    
    Returns:
        Sentiment analysis with concern flags
    """
    if not family_messages:
        return {
            "overall_sentiment": "neutral",
            "concern_level": "low",
            "key_themes": [],
            "action_needed": False,
        }
    
    messages_text = "\n".join([
        f"[{m.get('date', 'unknown')}] {m.get('sender', 'Unknown')}: {m.get('message', '')}"
        for m in family_messages[-20:]
    ])
    
    prompt = f"""Analyse the sentiment and concerns in these family communications.

Messages:
{messages_text}

Respond with JSON:
{{
    "overall_sentiment": "positive" | "neutral" | "concerned" | "distressed",
    "concern_level": "low" | "medium" | "high",
    "key_themes": ["themes in messages"],
    "specific_concerns": ["specific worries raised"],
    "positive_feedback": ["positive comments made"],
    "action_needed": true/false,
    "recommended_response": "how the home should respond",
    "urgency": "routine" | "soon" | "immediate"
}}

Be sensitive. Flag genuine concerns but don't over-interpret neutral messages."""

    result = await complete(
        task_type=TaskType.FAMILY_UPDATE,
        prompt=prompt,
        system=FAMILY_HUB_SYSTEM_PROMPT,
    )
    
    analysis = _parse_json_safely(result.text)
    
    if analysis.get("parse_error"):
        analysis = {
            "overall_sentiment": "neutral",
            "concern_level": "low",
            "key_themes": ["General communication"],
            "specific_concerns": [],
            "positive_feedback": [],
            "action_needed": False,
            "recommended_response": "Continue regular updates",
            "urgency": "routine",
            "_fallback": True,
        }
    
    analysis["message_count"] = len(family_messages)
    analysis["analysed_at"] = datetime.now(timezone.utc).isoformat()
    
    return analysis


async def generate_family_newsletter(
    home_id: str,
    home_name: str,
    period_start: str,
    period_end: str,
    activities: list[dict[str, Any]],
    achievements: list[dict[str, Any]],
) -> dict[str, Any]:
    """Generate a monthly family newsletter for the care home.
    
    Args:
        home_id: Care home ID
        home_name: Care home name
        period_start: Start date (YYYY-MM-DD)
        period_end: End date (YYYY-MM-DD)
        activities: List of activities during period
        achievements: List of resident achievements
    
    Returns:
        Newsletter content with photos suggestions and highlights
    """
    prompt = f"""Write a warm family newsletter for {home_name} covering {period_start} to {period_end}.

Activities: {', '.join([a.get('name', '') for a in activities])}
Achievements: {', '.join([a.get('description', '') for a in achievements])}

Respond with JSON:
{{
    "title": "newsletter title",
    "introduction": "warm welcome paragraph",
    "highlights": [
        {{
            "heading": "highlight heading",
            "content": "description of activity or achievement",
            "photo_suggestion": "what photo would accompany this"
        }}
    ],
    "resident_spotlight": {{
        "name": "resident name (anonymised if preferred)",
        "story": "positive story about their month"
    }},
    "upcoming_events": ["events planned for next month"],
    "staff_news": ["positive staff updates"],
    "closing": "warm closing message",
    "photo_captions": ["suggested photo captions"]
}}

Write in a warm, family-friendly tone. Focus on positive moments and community."""

    result = await complete(
        task_type=TaskType.FAMILY_UPDATE,
        prompt=prompt,
        system=FAMILY_HUB_SYSTEM_PROMPT,
    )
    
    newsletter = _parse_json_safely(result.text)
    
    if newsletter.get("parse_error"):
        newsletter = {
            "title": f"{home_name} Newsletter",
            "introduction": f"Welcome to our monthly update from {home_name}.",
            "highlights": [{"heading": "Monthly Activities", "content": "We had a wonderful month of activities.", "photo_suggestion": "Group activity photo"}],
            "resident_spotlight": {"name": "A Resident", "story": "Enjoyed participating in daily activities."},
            "upcoming_events": ["More activities planned"],
            "staff_news": ["Team continuing to provide excellent care"],
            "closing": "Thank you for your continued trust in us.",
            "photo_captions": ["Residents enjoying activities"],
            "_fallback": True,
        }
    
    newsletter["home_id"] = home_id
    newsletter["period"] = f"{period_start} to {period_end}"
    newsletter["generated_at"] = datetime.now(timezone.utc).isoformat()
    
    return newsletter


def _parse_json_safely(text: str) -> dict[str, Any]:
    """Extract JSON from text safely."""
    import json
    text = text.strip()
    if "```json" in text:
        start = text.find("```json") + 7
        end = text.find("```", start)
        text = text[start:end].strip()
    elif "```" in text:
        start = text.find("```") + 3
        end = text.find("```", start)
        text = text[start:end].strip()
    
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end])
            except json.JSONDecodeError:
                pass
        return {"raw_response": text, "parse_error": True}
