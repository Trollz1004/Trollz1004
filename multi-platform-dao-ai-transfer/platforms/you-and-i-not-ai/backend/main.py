"""
You and I Not AI - Dating App Backend
FOR THE KIDS! 💙

Zero tolerance for bots. Claude AI-powered verification.
Target: 1M users in Year 1

Stack:
- FastAPI (async, scales to millions)
- PostgreSQL (user data, matches, messages)
- Redis (real-time messaging, sessions)
- Claude AI (bot detection, verification)
- Stable Diffusion (photo verification)
- Stripe (payments)
"""

from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
import anthropic
import asyncpg
import redis.asyncio as redis
import jwt
import bcrypt
import uuid
from datetime import datetime, timedelta
import os
from enum import Enum
import json

# ============================================================================
# CONFIGURATION
# ============================================================================

app = FastAPI(
    title="You and I Not AI",
    description="The ONLY dating app with ZERO bots. Real humans only. 💙",
    version="1.0.0"
)

# CORS - Allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://youandinotai.com", "https://u-and-not-ai.online"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment variables (from Kubernetes secrets)
DATABASE_URL = os.getenv("DATABASE_URL")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
CLAUDE_API_KEY = os.getenv("ANTHROPIC_API_KEY")
JWT_SECRET = os.getenv("JWT_SECRET")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")

# Claude AI client
claude_client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)

# Security
security = HTTPBearer()

# ============================================================================
# DATABASE CONNECTION
# ============================================================================

db_pool = None
redis_client = None

@app.on_event("startup")
async def startup():
    """Initialize database and Redis connections"""
    global db_pool, redis_client

    # PostgreSQL connection pool
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=10, max_size=100)

    # Redis connection
    redis_client = await redis.from_url(REDIS_URL, decode_responses=True)

    # Create tables if not exist
    async with db_pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                name VARCHAR(100) NOT NULL,
                age INTEGER NOT NULL,
                gender VARCHAR(20) NOT NULL,
                bio TEXT,
                photos JSONB DEFAULT '[]'::jsonb,

                -- Verification status
                is_verified BOOLEAN DEFAULT FALSE,
                verification_method VARCHAR(50),
                verified_at TIMESTAMP,

                -- Bot detection
                bot_score FLOAT DEFAULT 0.0,
                is_banned BOOLEAN DEFAULT FALSE,
                ban_reason TEXT,

                -- Subscription
                is_premium BOOLEAN DEFAULT FALSE,
                premium_until TIMESTAMP,
                stripe_customer_id VARCHAR(255),

                -- Metadata
                created_at TIMESTAMP DEFAULT NOW(),
                last_active TIMESTAMP DEFAULT NOW(),
                deleted_at TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_users_banned ON users(is_banned);
            CREATE INDEX IF NOT EXISTS idx_users_verified ON users(is_verified);

            CREATE TABLE IF NOT EXISTS matches (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user1_id UUID REFERENCES users(id),
                user2_id UUID REFERENCES users(id),
                matched_at TIMESTAMP DEFAULT NOW(),
                is_active BOOLEAN DEFAULT TRUE,

                -- Match quality (Claude AI calculated)
                compatibility_score FLOAT,
                compatibility_reasons TEXT,

                UNIQUE(user1_id, user2_id)
            );

            CREATE INDEX IF NOT EXISTS idx_matches_user1 ON matches(user1_id);
            CREATE INDEX IF NOT EXISTS idx_matches_user2 ON matches(user2_id);

            CREATE TABLE IF NOT EXISTS messages (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                match_id UUID REFERENCES matches(id),
                sender_id UUID REFERENCES users(id),
                receiver_id UUID REFERENCES users(id),
                content TEXT NOT NULL,

                -- Bot detection (analyze every message)
                bot_score FLOAT DEFAULT 0.0,
                is_flagged BOOLEAN DEFAULT FALSE,

                created_at TIMESTAMP DEFAULT NOW(),
                read_at TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_messages_match ON messages(match_id);
            CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

            CREATE TABLE IF NOT EXISTS verification_attempts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id),
                method VARCHAR(50) NOT NULL,
                status VARCHAR(20) NOT NULL,
                data JSONB,

                -- Claude AI analysis
                ai_analysis TEXT,
                confidence_score FLOAT,

                created_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS bot_detections (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id),
                detection_type VARCHAR(50) NOT NULL,
                confidence FLOAT NOT NULL,
                evidence JSONB NOT NULL,
                action_taken VARCHAR(50),

                created_at TIMESTAMP DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_bot_detections_user ON bot_detections(user_id);
        """)

    print("✅ Database initialized")
    print("✅ You and I Not AI backend ready!")

@app.on_event("shutdown")
async def shutdown():
    """Close connections"""
    await db_pool.close()
    await redis_client.close()

# ============================================================================
# MODELS
# ============================================================================

class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    NON_BINARY = "non_binary"
    OTHER = "other"

class UserRegistration(BaseModel):
    email: EmailStr
    password: str
    name: str
    age: int
    gender: Gender

    @validator('age')
    def validate_age(cls, v):
        if v < 18:
            raise ValueError('Must be 18 or older')
        if v > 120:
            raise ValueError('Invalid age')
        return v

    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ProfileUpdate(BaseModel):
    name: Optional[str]
    bio: Optional[str]
    photos: Optional[List[str]]

class Message(BaseModel):
    match_id: str
    content: str

# ============================================================================
# AUTHENTICATION
# ============================================================================

def create_access_token(user_id: str) -> str:
    """Create JWT access token"""
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT and get current user"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload["user_id"]

        # Get user from database
        async with db_pool.acquire() as conn:
            user = await conn.fetchrow(
                "SELECT * FROM users WHERE id = $1 AND is_banned = FALSE AND deleted_at IS NULL",
                uuid.UUID(user_id)
            )

            if not user:
                raise HTTPException(status_code=401, detail="User not found or banned")

            return dict(user)

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============================================================================
# BOT DETECTION - ZERO TOLERANCE
# ============================================================================

async def analyze_user_for_bots(user_id: uuid.UUID, context: dict) -> float:
    """
    Use Claude AI to analyze user behavior for bot patterns
    Returns bot_score (0.0 = human, 1.0 = definitely bot)

    ZERO TOLERANCE: bot_score > 0.7 = instant ban
    """

    prompt = f"""You are a bot detection system for a dating app called "You and I Not AI".
Your job is to analyze user behavior and determine if they are a bot or scammer.

User Context:
{json.dumps(context, indent=2)}

Analyze for:
1. Message patterns (generic, copy-paste, too perfect grammar)
2. Photo authenticity (stolen photos, AI-generated)
3. Profile completeness (bot profiles are often generic)
4. Behavior patterns (spam, rapid messaging, link sharing)
5. Time patterns (bot accounts active 24/7)

Respond with JSON:
{{
    "bot_score": 0.0-1.0,
    "confidence": "low/medium/high",
    "reasons": ["reason 1", "reason 2"],
    "recommended_action": "allow/warn/ban"
}}

Be strict. False positives are better than letting bots through.
"""

    try:
        message = await claude_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )

        response = json.loads(message.content[0].text)
        bot_score = response["bot_score"]

        # Log detection attempt
        async with db_pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO bot_detections (user_id, detection_type, confidence, evidence, action_taken)
                VALUES ($1, $2, $3, $4, $5)
            """, user_id, "behavioral_analysis", bot_score, json.dumps(response),
            "banned" if bot_score > 0.7 else "monitoring")

            # ZERO TOLERANCE: Auto-ban if bot_score > 0.7
            if bot_score > 0.7:
                await conn.execute("""
                    UPDATE users
                    SET is_banned = TRUE, ban_reason = $1
                    WHERE id = $2
                """, f"Bot detected: {', '.join(response['reasons'])}", user_id)

                print(f"🚫 BANNED USER {user_id}: Bot score {bot_score}")

        return bot_score

    except Exception as e:
        print(f"Error in bot detection: {e}")
        return 0.0  # Default to allowing on error

async def analyze_message_for_spam(sender_id: uuid.UUID, content: str) -> bool:
    """
    Analyze every message for spam/bot patterns
    Returns True if spam detected (message rejected)
    """

    prompt = f"""Analyze this dating app message for spam/bot behavior:

Message: "{content}"

Check for:
1. External links or URLs
2. Contact info (phone, email, social media)
3. Money requests or financial scams
4. Generic/copy-paste text
5. Inappropriate content
6. Phishing attempts

Respond with JSON:
{{
    "is_spam": true/false,
    "confidence": 0.0-1.0,
    "reason": "brief explanation"
}}
"""

    try:
        message = await claude_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )

        response = json.loads(message.content[0].text)

        if response["is_spam"] and response["confidence"] > 0.7:
            # Log spam attempt
            async with db_pool.acquire() as conn:
                await conn.execute("""
                    INSERT INTO bot_detections (user_id, detection_type, confidence, evidence, action_taken)
                    VALUES ($1, $2, $3, $4, $5)
                """, sender_id, "spam_message", response["confidence"],
                json.dumps({"message": content, "analysis": response}), "message_blocked")

                # Increase user's bot score
                await conn.execute("""
                    UPDATE users
                    SET bot_score = bot_score + 0.2
                    WHERE id = $1
                """, sender_id)

                # Check if bot_score now exceeds threshold
                user = await conn.fetchrow("SELECT bot_score FROM users WHERE id = $1", sender_id)
                if user['bot_score'] > 0.7:
                    await conn.execute("""
                        UPDATE users
                        SET is_banned = TRUE, ban_reason = 'Multiple spam messages detected'
                        WHERE id = $1
                    """, sender_id)
                    print(f"🚫 BANNED USER {sender_id}: Spam accumulation")

            return True

        return False

    except Exception as e:
        print(f"Error in spam detection: {e}")
        return False  # Allow message on error

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.post("/api/auth/register")
async def register(user_data: UserRegistration, background_tasks: BackgroundTasks):
    """Register new user (NOT verified yet)"""

    # Hash password
    password_hash = bcrypt.hashpw(user_data.password.encode(), bcrypt.gensalt()).decode()

    try:
        async with db_pool.acquire() as conn:
            user = await conn.fetchrow("""
                INSERT INTO users (email, password_hash, name, age, gender)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id, email, name, age, gender, is_verified
            """, user_data.email, password_hash, user_data.name, user_data.age, user_data.gender.value)

            # Schedule bot analysis in background
            background_tasks.add_task(
                analyze_user_for_bots,
                user['id'],
                {
                    "email": user['email'],
                    "name": user['name'],
                    "age": user['age'],
                    "registration_time": datetime.utcnow().isoformat()
                }
            )

            # Create JWT token
            token = create_access_token(str(user['id']))

            return {
                "user": dict(user),
                "token": token,
                "message": "Account created! Please verify to start matching."
            }

    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=400, detail="Email already registered")

@app.post("/api/auth/login")
async def login(credentials: UserLogin):
    """Login user"""

    async with db_pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT * FROM users WHERE email = $1 AND is_banned = FALSE AND deleted_at IS NULL",
            credentials.email
        )

        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Verify password
        if not bcrypt.checkpw(credentials.password.encode(), user['password_hash'].encode()):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Update last active
        await conn.execute(
            "UPDATE users SET last_active = NOW() WHERE id = $1",
            user['id']
        )

        # Create token
        token = create_access_token(str(user['id']))

        # Remove sensitive data
        user_dict = dict(user)
        del user_dict['password_hash']

        return {
            "user": user_dict,
            "token": token
        }

@app.get("/api/users/me")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    user = current_user.copy()
    del user['password_hash']
    return user

@app.put("/api/users/me")
async def update_profile(
    profile_data: ProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update user profile"""

    async with db_pool.acquire() as conn:
        # Build update query dynamically
        updates = []
        values = []
        param_count = 1

        if profile_data.name:
            updates.append(f"name = ${param_count}")
            values.append(profile_data.name)
            param_count += 1

        if profile_data.bio:
            updates.append(f"bio = ${param_count}")
            values.append(profile_data.bio)
            param_count += 1

        if profile_data.photos is not None:
            updates.append(f"photos = ${param_count}")
            values.append(json.dumps(profile_data.photos))
            param_count += 1

        if not updates:
            raise HTTPException(status_code=400, detail="No updates provided")

        values.append(current_user['id'])

        query = f"""
            UPDATE users
            SET {', '.join(updates)}
            WHERE id = ${param_count}
            RETURNING *
        """

        user = await conn.fetchrow(query, *values)
        user_dict = dict(user)
        del user_dict['password_hash']

        return user_dict

@app.post("/api/messages")
async def send_message(
    message_data: Message,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Send message (with spam detection)"""

    # Check if spam
    is_spam = await analyze_message_for_spam(current_user['id'], message_data.content)

    if is_spam:
        raise HTTPException(status_code=400, detail="Message blocked: Spam detected. Repeated violations will result in ban.")

    async with db_pool.acquire() as conn:
        # Verify match exists
        match = await conn.fetchrow("""
            SELECT * FROM matches
            WHERE id = $1 AND (user1_id = $2 OR user2_id = $2) AND is_active = TRUE
        """, uuid.UUID(message_data.match_id), current_user['id'])

        if not match:
            raise HTTPException(status_code=404, detail="Match not found")

        # Determine receiver
        receiver_id = match['user2_id'] if match['user1_id'] == current_user['id'] else match['user1_id']

        # Insert message
        msg = await conn.fetchrow("""
            INSERT INTO messages (match_id, sender_id, receiver_id, content)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        """, uuid.UUID(message_data.match_id), current_user['id'], receiver_id, message_data.content)

        # Publish to Redis for real-time delivery
        await redis_client.publish(
            f"messages:{receiver_id}",
            json.dumps({
                "id": str(msg['id']),
                "match_id": str(msg['match_id']),
                "sender_id": str(msg['sender_id']),
                "content": msg['content'],
                "created_at": msg['created_at'].isoformat()
            })
        )

        return dict(msg)

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "app": "You and I Not AI",
        "message": "Real humans only. Zero bots tolerated. 💙"
    }

# ============================================================================
# WEBSOCKET - REAL-TIME MESSAGING
# ============================================================================

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket for real-time messaging"""
    await websocket.accept()

    # Subscribe to user's message channel
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(f"messages:{user_id}")

    try:
        async for message in pubsub.listen():
            if message['type'] == 'message':
                await websocket.send_text(message['data'])

    except WebSocketDisconnect:
        await pubsub.unsubscribe(f"messages:{user_id}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
