-- Grant Automation System Database Schema
-- ClaudeDroid Ecosystem - $500K-2M Annual Funding Pipeline

-- Grant Opportunities
CREATE TABLE IF NOT EXISTS grant_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(50) NOT NULL,
  agency VARCHAR(200) NOT NULL,
  program_name VARCHAR(500) NOT NULL,
  funding_min DECIMAL(12,2) NOT NULL,
  funding_max DECIMAL(12,2) NOT NULL,
  deadline TIMESTAMP NOT NULL,
  eligibility_criteria JSONB,
  priorities JSONB,
  compliance_requirements JSONB,
  match_score DECIMAL(5,2),
  opportunity_url TEXT,
  status VARCHAR(50) DEFAULT 'discovered',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(agency, program_name)
);

-- Grant Proposals
CREATE TABLE IF NOT EXISTS grant_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES grant_opportunities(id) ON DELETE CASCADE,
  narrative TEXT,
  budget JSONB,
  timeline JSONB,
  team_members JSONB,
  success_metrics JSONB,
  compliance_checklist JSONB,
  review_history JSONB DEFAULT '[]'::jsonb,
  submission_date TIMESTAMP,
  award_amount DECIMAL(12,2),
  status VARCHAR(50) DEFAULT 'drafting',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Governance Tokens
CREATE TABLE IF NOT EXISTS governance_tokens (
  token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holder VARCHAR(200) NOT NULL,
  amount DECIMAL(18,8) NOT NULL,
  voting_power DECIMAL(18,8) NOT NULL,
  acquired_at TIMESTAMP DEFAULT NOW(),
  locked_until TIMESTAMP,
  reason VARCHAR(500)
);

-- DAO Proposals
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id VARCHAR(64) UNIQUE NOT NULL,
  proposer VARCHAR(200) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  proposed_changes JSONB,
  impact_analysis TEXT,
  budget_required DECIMAL(12,2) DEFAULT 0,
  voting_start_time TIMESTAMP NOT NULL,
  voting_end_time TIMESTAMP NOT NULL,
  quorum_required DECIMAL(5,4) DEFAULT 0.10,
  approval_threshold DECIMAL(5,4) DEFAULT 0.51,
  votes_for DECIMAL(18,8) DEFAULT 0,
  votes_against DECIMAL(18,8) DEFAULT 0,
  votes_abstain DECIMAL(18,8) DEFAULT 0,
  total_voting_power DECIMAL(18,8) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft',
  execution_date TIMESTAMP,
  execution_tx_hash VARCHAR(64),
  execution_results TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Votes
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
  voter VARCHAR(200) NOT NULL,
  voting_power DECIMAL(18,8) NOT NULL,
  decision VARCHAR(20) NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  tx_hash VARCHAR(64),
  UNIQUE(proposal_id, voter)
);

-- Compliance Alerts
CREATE TABLE IF NOT EXISTS compliance_alerts (
  id VARCHAR(100) PRIMARY KEY,
  source VARCHAR(200) NOT NULL,
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  affected_grants JSONB,
  action_required TEXT,
  deadline TIMESTAMP,
  detected_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'new'
);

-- Grant Review Log
CREATE TABLE IF NOT EXISTS grant_review_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES grant_proposals(id) ON DELETE CASCADE,
  reviewer VARCHAR(200) NOT NULL,
  stage VARCHAR(100) NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Treasury Transactions
CREATE TABLE IF NOT EXISTS treasury_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL,
  amount DECIMAL(18,8) NOT NULL,
  source VARCHAR(200),
  purpose VARCHAR(500),
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_grant_opportunities_status ON grant_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_grant_opportunities_match_score ON grant_opportunities(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_grant_opportunities_deadline ON grant_opportunities(deadline);
CREATE INDEX IF NOT EXISTS idx_grant_proposals_status ON grant_proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_voting_end ON proposals(voting_end_time);
CREATE INDEX IF NOT EXISTS idx_votes_proposal ON votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_status ON compliance_alerts(status);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_severity ON compliance_alerts(severity);

-- Initial Data: Sample Grant Opportunities (for demo)
INSERT INTO grant_opportunities (
  source, agency, program_name, funding_min, funding_max, deadline,
  eligibility_criteria, priorities, compliance_requirements,
  match_score, opportunity_url, status
) VALUES (
  'federal',
  'NSF',
  'AI Research Institutes',
  500000,
  2000000,
  '2025-12-31',
  '["U.S.-based organization", "Demonstrated AI research capability", "Multi-year sustainability plan"]'::jsonb,
  '["Trustworthy AI development", "AI for social good", "Interdisciplinary collaboration"]'::jsonb,
  '["IRB approval for human subjects research", "Data management plan", "Broader impacts statement"]'::jsonb,
  92.5,
  'https://www.nsf.gov/funding/ai-institutes',
  'discovered'
) ON CONFLICT (agency, program_name) DO NOTHING;

INSERT INTO grant_opportunities (
  source, agency, program_name, funding_min, funding_max, deadline,
  eligibility_criteria, priorities, compliance_requirements,
  match_score, opportunity_url, status
) VALUES (
  'federal',
  'NSF SBIR',
  'Small Business Technology Transfer - AI/ML',
  50000,
  1000000,
  '2025-09-15',
  '["Small business (<500 employees)", "For-profit U.S. company", "Research partnership with university"]'::jsonb,
  '["Commercial AI applications", "Technology transfer", "Job creation"]'::jsonb,
  '["SBA certification", "Commercialization plan", "IP ownership documentation"]'::jsonb,
  87.3,
  'https://www.sbir.gov/topics/ai',
  'discovered'
) ON CONFLICT (agency, program_name) DO NOTHING;

-- Initial DAO Tokens: Founder allocation
INSERT INTO governance_tokens (holder, amount, voting_power, reason)
VALUES ('founder-josh', 10000, 100, 'Initial founder allocation')
ON CONFLICT DO NOTHING;

-- Initial Treasury: Seed funding
INSERT INTO treasury_transactions (type, amount, source, purpose)
VALUES ('deposit', 100000, 'Initial Seed Funding', 'DAO Treasury Initialization')
ON CONFLICT DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Grant Automation System database schema created successfully!';
  RAISE NOTICE '📊 Sample grants loaded: 2 high-match opportunities';
  RAISE NOTICE '🪙 DAO tokens initialized: 10,000 tokens to founder';
  RAISE NOTICE '💰 Treasury initialized: $100,000';
END $$;
