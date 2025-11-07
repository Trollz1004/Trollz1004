-- YouAndINotAI Database Schema

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender VARCHAR(50),
  looking_for VARCHAR(50),
  bio TEXT,
  location VARCHAR(255),
  interests TEXT[],
  photos TEXT[],
  verified BOOLEAN DEFAULT false,
  premium_tier VARCHAR(50) DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Swipes table
CREATE TABLE swipes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  target_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, target_id)
);

-- Matches table
CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  user1_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  user2_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'active',
  matched_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

-- Messages table
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
  from_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  to_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP
);

-- Subscriptions table
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  tier VARCHAR(50) NOT NULL,
  square_customer_id VARCHAR(255),
  square_subscription_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  start_date TIMESTAMP DEFAULT NOW(),
  end_date TIMESTAMP
);

-- Icebreakers table
CREATE TABLE icebreakers (
  id SERIAL PRIMARY KEY,
  match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  generated_by_ai BOOLEAN DEFAULT false,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Manus AI Task Automation tables
CREATE TABLE manus_tasks (
  id SERIAL PRIMARY KEY,
  task_id VARCHAR(255) UNIQUE NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'running',
  message TEXT,
  stop_reason VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE manus_attachments (
  id SERIAL PRIMARY KEY,
  task_id VARCHAR(255) REFERENCES manus_tasks(task_id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  url TEXT NOT NULL,
  size_bytes INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_swipes_user ON swipes(user_id);
CREATE INDEX idx_messages_match ON messages(match_id);
CREATE INDEX idx_matches_users ON matches(user1_id, user2_id);
CREATE INDEX idx_manus_tasks_status ON manus_tasks(status);
CREATE INDEX idx_manus_attachments_task ON manus_attachments(task_id);
