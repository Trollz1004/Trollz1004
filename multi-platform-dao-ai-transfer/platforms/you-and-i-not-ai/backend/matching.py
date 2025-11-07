"""
You and I Not AI - Matching Algorithm
Powered by Claude Code 💙

The smartest matching algorithm in dating apps.
Uses Claude AI to find REAL compatibility, not just swipes.

FOR THE KIDS!
"""

import anthropic
import asyncpg
import uuid
import json
from typing import List, Dict
from datetime import datetime
import os

CLAUDE_API_KEY = os.getenv("ANTHROPIC_API_KEY")
claude_client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)

# ============================================================================
# CLAUDE-POWERED MATCHING
# ============================================================================

async def calculate_compatibility(user1: dict, user2: dict) -> Dict:
    """
    Use Claude AI to calculate deep compatibility between two users.

    This is what makes "You and I Not AI" different from Tinder/Bumble:
    - Not just age/location/photos
    - Actual personality compatibility
    - Conversation style matching
    - Values alignment
    - Long-term potential

    Returns:
        {
            "score": 0.0-1.0 (compatibility score),
            "reasons": ["reason 1", "reason 2", ...],
            "conversation_starters": ["opener 1", "opener 2", ...]
        }
    """

    prompt = f"""You are the matching algorithm for "You and I Not AI", a dating app that finds REAL compatibility.

Analyze these two people for genuine compatibility:

Person 1:
- Name: {user1.get('name')}
- Age: {user1.get('age')}
- Gender: {user1.get('gender')}
- Bio: {user1.get('bio', 'No bio yet')}
- Interests: {user1.get('interests', [])}

Person 2:
- Name: {user2.get('name')}
- Age: {user2.get('age')}
- Gender: {user2.get('gender')}
- Bio: {user2.get('bio', 'No bio yet')}
- Interests: {user2.get('interests', [])}

Analyze for:
1. Personality compatibility (complementary or similar traits)
2. Value alignment (life goals, priorities)
3. Conversation potential (common interests, engaging topics)
4. Long-term potential (relationship sustainability)
5. Red flags (if any)

Respond with JSON:
{{
    "score": 0.0-1.0,
    "confidence": "low/medium/high",
    "reasons": [
        "Specific reason 1",
        "Specific reason 2",
        "Specific reason 3"
    ],
    "conversation_starters": [
        "Personalized opener 1",
        "Personalized opener 2",
        "Personalized opener 3"
    ],
    "long_term_potential": "low/medium/high",
    "notes": "Any additional insights"
}}

Be honest. A score of 0.3 is better than a false 0.9.
Quality matches > quantity matches.
"""

    try:
        message = await claude_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )

        result = json.loads(message.content[0].text)
        return result

    except Exception as e:
        print(f"Error in compatibility calculation: {e}")
        # Return default low score on error
        return {
            "score": 0.1,
            "confidence": "low",
            "reasons": ["Unable to calculate compatibility"],
            "conversation_starters": ["Hi! How's your day going?"],
            "long_term_potential": "unknown",
            "notes": "Error in AI analysis"
        }


async def find_matches_for_user(db_pool, user_id: uuid.UUID, limit: int = 20) -> List[Dict]:
    """
    Find potential matches for a user.

    Algorithm:
    1. Filter by basic criteria (age range, gender preference, location)
    2. Exclude already matched/rejected users
    3. Exclude banned/unverified users
    4. Calculate Claude AI compatibility for each candidate
    5. Sort by compatibility score (highest first)
    6. Return top N matches

    IMPORTANT: Only show VERIFIED users (no bots!)
    """

    async with db_pool.acquire() as conn:
        # Get current user details
        user = await conn.fetchrow(
            "SELECT * FROM users WHERE id = $1 AND is_banned = FALSE",
            user_id
        )

        if not user:
            return []

        # Get potential matches (basic filtering)
        # TODO: Add gender preference, age range, location filtering
        candidates = await conn.fetch("""
            SELECT *
            FROM users
            WHERE id != $1
                AND is_banned = FALSE
                AND deleted_at IS NULL
                AND is_verified = TRUE  -- ONLY VERIFIED USERS!
                AND id NOT IN (
                    -- Exclude already matched users
                    SELECT user2_id FROM matches WHERE user1_id = $1
                    UNION
                    SELECT user1_id FROM matches WHERE user2_id = $1
                )
            LIMIT 50  -- Get 50 candidates, we'll score and return top 20
        """, user_id)

        # Calculate compatibility for each candidate
        matches_with_scores = []

        for candidate in candidates:
            compatibility = await calculate_compatibility(
                dict(user),
                dict(candidate)
            )

            matches_with_scores.append({
                "user": dict(candidate),
                "compatibility_score": compatibility["score"],
                "compatibility_reasons": compatibility["reasons"],
                "conversation_starters": compatibility["conversation_starters"],
                "long_term_potential": compatibility.get("long_term_potential", "unknown")
            })

        # Sort by compatibility score (highest first)
        matches_with_scores.sort(key=lambda x: x["compatibility_score"], reverse=True)

        # Return top N
        return matches_with_scores[:limit]


async def create_match(db_pool, user1_id: uuid.UUID, user2_id: uuid.UUID) -> Dict:
    """
    Create a match between two users.

    Both users must have liked each other (mutual like = match).
    Calculate and store compatibility score.
    """

    async with db_pool.acquire() as conn:
        # Get both users
        user1 = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user1_id)
        user2 = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user2_id)

        if not user1 or not user2:
            raise ValueError("User not found")

        # Verify both are verified (no bots!)
        if not user1['is_verified'] or not user2['is_verified']:
            raise ValueError("Both users must be verified")

        # Calculate compatibility
        compatibility = await calculate_compatibility(dict(user1), dict(user2))

        # Create match
        match = await conn.fetchrow("""
            INSERT INTO matches (user1_id, user2_id, compatibility_score, compatibility_reasons)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        """, user1_id, user2_id, compatibility["score"],
        json.dumps(compatibility["reasons"]))

        return {
            "match": dict(match),
            "compatibility": compatibility
        }


async def suggest_conversation_opener(db_pool, match_id: uuid.UUID, user_id: uuid.UUID) -> str:
    """
    Suggest a personalized conversation opener for a match.

    Uses Claude AI to analyze both profiles and suggest an engaging,
    personalized opening message (not generic "hi").
    """

    async with db_pool.acquire() as conn:
        # Get match details
        match = await conn.fetchrow("""
            SELECT m.*, u1.*, u2.*
            FROM matches m
            JOIN users u1 ON m.user1_id = u1.id
            JOIN users u2 ON m.user2_id = u2.id
            WHERE m.id = $1 AND (m.user1_id = $2 OR m.user2_id = $2)
        """, match_id, user_id)

        if not match:
            return "Hi! How's it going?"

        # Determine who is sending and who is receiving
        sender = match if match['user1_id'] == user_id else match
        receiver = match if match['user2_id'] != user_id else match

        prompt = f"""You are helping someone start a conversation on "You and I Not AI", a dating app.

Sender:
- Name: {sender.get('name')}
- Bio: {sender.get('bio', 'No bio')}

Receiver:
- Name: {receiver.get('name')}
- Bio: {receiver.get('bio', 'No bio')}

Compatibility notes: {match.get('compatibility_reasons', [])}

Suggest ONE personalized, engaging opening message that:
1. References something specific from their profile
2. Asks an open-ended question
3. Is friendly and authentic (not cheesy)
4. Is 1-2 sentences max
5. Shows genuine interest

Respond with ONLY the message text, nothing else.
"""

        try:
            message = await claude_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}]
            )

            return message.content[0].text.strip()

        except Exception as e:
            print(f"Error generating conversation opener: {e}")
            return f"Hi {receiver.get('name')}! I noticed we matched - excited to chat!"


# ============================================================================
# MATCH QUALITY SCORING (ONGOING)
# ============================================================================

async def update_match_quality(db_pool, match_id: uuid.UUID):
    """
    Update match quality based on actual conversation.

    Over time, learn if Claude's initial compatibility score was accurate.
    Use this to improve future matching.

    Factors:
    - Number of messages exchanged
    - Response rate
    - Conversation length
    - Time between messages
    - Report if match led to date/relationship
    """

    async with db_pool.acquire() as conn:
        # Get match and messages
        messages = await conn.fetch("""
            SELECT * FROM messages
            WHERE match_id = $1
            ORDER BY created_at ASC
        """, match_id)

        if not messages:
            return

        # Analyze conversation quality
        prompt = f"""Analyze this dating app conversation to determine match quality.

Number of messages: {len(messages)}
Conversation excerpt (last 10 messages):
{json.dumps([{"sender": str(m['sender_id']), "content": m['content'][:100]} for m in messages[-10:]], indent=2)}

Rate the match quality (0.0-1.0) based on:
1. Engagement level (are both people responding?)
2. Conversation depth (surface level or meaningful?)
3. Reciprocation (balanced or one-sided?)
4. Positive indicators (plans to meet, exchanged contact info?)

Respond with JSON:
{{
    "quality_score": 0.0-1.0,
    "engagement_level": "low/medium/high",
    "notes": "Brief assessment"
}}
"""

        try:
            message = await claude_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )

            result = json.loads(message.content[0].text)

            # Store quality score (could use for ML training later)
            await conn.execute("""
                UPDATE matches
                SET
                    match_quality = $1,
                    match_quality_updated = NOW()
                WHERE id = $2
            """, result["quality_score"], match_id)

        except Exception as e:
            print(f"Error updating match quality: {e}")


if __name__ == "__main__":
    print("You and I Not AI - Matching Algorithm")
    print("Powered by Claude Code 💙")
    print("FOR THE KIDS!")
