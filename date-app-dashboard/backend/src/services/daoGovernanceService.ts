/**
 * DAO Governance Service - Decentralized Autonomous Organization
 *
 * Manages the entire $3.6M-100M+ revenue ecosystem through:
 * - Smart contract-based governance
 * - Token-based voting (quadratic voting)
 * - Treasury management
 * - Proposal submission and execution
 * - Community-driven decision making
 *
 * Governance Scope:
 * - AI marketplace commission rates
 * - Merchandise pricing strategies
 * - Grant application priorities
 * - Age verification protocol updates
 * - Revenue allocation
 * - Platform feature development
 */

import { Pool } from 'pg';
import logger from '../logger';
import crypto from 'crypto';

interface GovernanceToken {
  tokenId: string;
  holder: string; // User ID (age-verified)
  amount: number;
  votingPower: number; // sqrt(amount) for quadratic voting
  acquiredAt: Date;
  lockedUntil?: Date; // For staking
}

interface Proposal {
  id?: string;
  proposalId: string; // Blockchain proposal ID
  proposer: string; // Token holder ID
  title: string;
  description: string;
  category: 'commission_rate' | 'pricing' | 'grant_priority' | 'protocol_update' | 'treasury' | 'feature';

  // Proposal details
  proposedChanges: any; // JSON object with specific changes
  impactAnalysis: string;
  budgetRequired?: number;

  // Voting
  votingStartTime: Date;
  votingEndTime: Date;
  quorumRequired: number; // Minimum % of tokens that must vote
  approvalThreshold: number; // % of votes needed to pass

  // Results
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  totalVotingPower: number;
  status: 'draft' | 'active' | 'passed' | 'rejected' | 'executed' | 'cancelled';

  // Execution
  executionDate?: Date;
  executionTxHash?: string; // Blockchain transaction hash
  executionResults?: string;
}

interface Vote {
  id?: string;
  proposalId: string;
  voter: string; // Token holder ID
  votingPower: number; // sqrt(token holdings)
  decision: 'for' | 'against' | 'abstain';
  timestamp: Date;
  txHash?: string; // Blockchain transaction hash
}

interface Treasury {
  totalBalance: number;
  sources: {
    merchandiseRevenue: number;
    marketplaceCommissions: number;
    grantFunding: number;
    donations: number;
  };
  allocations: {
    development: number;
    marketing: number;
    operations: number;
    reserves: number;
    communityRewards: number;
  };
  pendingDisbursements: number;
}

export class DAOGovernanceService {
  private pool: Pool;

  // DAO Constitution
  private constitution = {
    votingPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    executionDelay: 2 * 24 * 60 * 60 * 1000, // 2 days after passing
    quorumRequirement: 0.10, // 10% of tokens must vote
    approvalThreshold: 0.51, // 51% of votes to pass
    proposalDeposit: 100, // Tokens required to submit proposal
    maxActiveProposals: 10,

    // Conviction voting parameters
    convictionHalfLife: 3 * 24 * 60 * 60 * 1000, // 3 days
    minConviction: 0.1,

    // Treasury limits
    maxSingleDisbursement: 0.10, // Max 10% of treasury in single proposal
  };

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * TOKEN DISTRIBUTION
   * Allocate governance tokens to stakeholders
   */
  async distributeTokens(userId: string, amount: number, reason: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      // Verify user is age-verified (DAO admission requirement)
      const userResult = await client.query(
        'SELECT age_verified FROM users WHERE id = $1',
        [userId]
      );

      if (!userResult.rows[0]?.age_verified) {
        throw new Error('DAO admission requires age verification');
      }

      // Calculate voting power (quadratic voting: sqrt of tokens)
      const votingPower = Math.sqrt(amount);

      const tokenId = crypto.randomUUID();

      await client.query(
        `INSERT INTO governance_tokens (
          token_id, holder, amount, voting_power, acquired_at, reason
        ) VALUES ($1, $2, $3, $4, NOW(), $5)`,
        [tokenId, userId, amount, votingPower, reason]
      );

      logger.info(`🪙 Distributed ${amount} governance tokens to ${userId} (voting power: ${votingPower.toFixed(2)})`);

    } finally {
      client.release();
    }
  }

  /**
   * SUBMIT PROPOSAL
   * Token holders can propose changes to the ecosystem
   */
  async submitProposal(proposal: Omit<Proposal, 'id' | 'votesFor' | 'votesAgainst' | 'votesAbstain' | 'totalVotingPower'>): Promise<string> {
    const client = await this.pool.connect();

    try {
      // Check proposer has enough tokens
      const tokensResult = await client.query(
        'SELECT SUM(amount) as total FROM governance_tokens WHERE holder = $1',
        [proposal.proposer]
      );

      const totalTokens = parseFloat(tokensResult.rows[0]?.total || '0');

      if (totalTokens < this.constitution.proposalDeposit) {
        throw new Error(`Insufficient tokens. Need ${this.constitution.proposalDeposit}, have ${totalTokens}`);
      }

      // Check max active proposals
      const activeResult = await client.query(
        "SELECT COUNT(*) as count FROM proposals WHERE status = 'active'"
      );

      if (parseInt(activeResult.rows[0].count) >= this.constitution.maxActiveProposals) {
        throw new Error(`Maximum ${this.constitution.maxActiveProposals} active proposals reached`);
      }

      // Treasury limit check
      if (proposal.budgetRequired && proposal.budgetRequired > 0) {
        const treasuryBalance = await this.getTreasuryBalance();
        const maxDisbursement = treasuryBalance * this.constitution.maxSingleDisbursement;

        if (proposal.budgetRequired > maxDisbursement) {
          throw new Error(`Proposal exceeds max disbursement (${maxDisbursement.toFixed(2)})`);
        }
      }

      // Generate blockchain proposal ID
      const proposalId = crypto.createHash('sha256')
        .update(`${proposal.proposer}-${proposal.title}-${Date.now()}`)
        .digest('hex');

      // Set voting period
      const votingStartTime = new Date();
      const votingEndTime = new Date(votingStartTime.getTime() + this.constitution.votingPeriod);

      // Insert proposal
      const result = await client.query(
        `INSERT INTO proposals (
          proposal_id, proposer, title, description, category,
          proposed_changes, impact_analysis, budget_required,
          voting_start_time, voting_end_time, quorum_required, approval_threshold,
          votes_for, votes_against, votes_abstain, total_voting_power,
          status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0, 0, 0, 0, 'active', NOW())
        RETURNING id`,
        [
          proposalId,
          proposal.proposer,
          proposal.title,
          proposal.description,
          proposal.category,
          JSON.stringify(proposal.proposedChanges),
          proposal.impactAnalysis,
          proposal.budgetRequired || 0,
          votingStartTime,
          votingEndTime,
          proposal.quorumRequired || this.constitution.quorumRequirement,
          proposal.approvalThreshold || this.constitution.approvalThreshold
        ]
      );

      const id = result.rows[0].id;

      logger.info(`📜 Proposal submitted: ${id} - ${proposal.title}`);

      return id;

    } finally {
      client.release();
    }
  }

  /**
   * CAST VOTE
   * Quadratic voting: voting power = sqrt(token holdings)
   */
  async castVote(
    proposalId: string,
    voterId: string,
    decision: 'for' | 'against' | 'abstain'
  ): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get proposal
      const proposalResult = await client.query(
        'SELECT * FROM proposals WHERE id = $1',
        [proposalId]
      );

      if (proposalResult.rows.length === 0) {
        throw new Error('Proposal not found');
      }

      const proposal = proposalResult.rows[0];

      // Check proposal is active
      if (proposal.status !== 'active') {
        throw new Error('Proposal is not active');
      }

      // Check voting period
      const now = new Date();
      if (now < proposal.voting_start_time || now > proposal.voting_end_time) {
        throw new Error('Voting period has ended');
      }

      // Check voter hasn't already voted
      const existingVote = await client.query(
        'SELECT id FROM votes WHERE proposal_id = $1 AND voter = $2',
        [proposalId, voterId]
      );

      if (existingVote.rows.length > 0) {
        throw new Error('Already voted on this proposal');
      }

      // Get voter's voting power (quadratic: sqrt of token holdings)
      const tokensResult = await client.query(
        'SELECT SUM(voting_power) as power FROM governance_tokens WHERE holder = $1',
        [voterId]
      );

      const votingPower = parseFloat(tokensResult.rows[0]?.power || '0');

      if (votingPower === 0) {
        throw new Error('No voting power (no governance tokens)');
      }

      // Record vote
      const voteId = crypto.randomUUID();
      const txHash = crypto.randomBytes(32).toString('hex'); // Mock blockchain tx

      await client.query(
        `INSERT INTO votes (
          id, proposal_id, voter, voting_power, decision, timestamp, tx_hash
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
        [voteId, proposalId, voterId, votingPower, decision, txHash]
      );

      // Update proposal vote counts
      const updateField = decision === 'for' ? 'votes_for' :
                         decision === 'against' ? 'votes_against' :
                         'votes_abstain';

      await client.query(
        `UPDATE proposals
         SET ${updateField} = ${updateField} + $1,
             total_voting_power = total_voting_power + $1
         WHERE id = $2`,
        [votingPower, proposalId]
      );

      await client.query('COMMIT');

      logger.info(`🗳️ Vote cast: ${voterId} voted ${decision} on proposal ${proposalId} (power: ${votingPower.toFixed(2)})`);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * EXECUTE PROPOSAL
   * Automatically execute passed proposals after delay period
   */
  async executeProposal(proposalId: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      const proposalResult = await client.query(
        'SELECT * FROM proposals WHERE id = $1',
        [proposalId]
      );

      if (proposalResult.rows.length === 0) {
        throw new Error('Proposal not found');
      }

      const proposal: Proposal = proposalResult.rows[0];

      // Check proposal passed
      if (proposal.status !== 'passed') {
        throw new Error('Proposal has not passed');
      }

      // Check execution delay has passed
      const executionTime = new Date(proposal.votingEndTime.getTime() + this.constitution.executionDelay);
      if (new Date() < executionTime) {
        throw new Error('Execution delay period has not elapsed');
      }

      // Execute based on category
      let executionResults = '';
      const txHash = crypto.randomBytes(32).toString('hex'); // Mock blockchain tx

      switch (proposal.category) {
        case 'commission_rate':
          executionResults = await this.executeCommissionRateChange(proposal);
          break;

        case 'pricing':
          executionResults = await this.executePricingChange(proposal);
          break;

        case 'grant_priority':
          executionResults = await this.executeGrantPriorityChange(proposal);
          break;

        case 'treasury':
          executionResults = await this.executeTreasuryDisbursement(proposal);
          break;

        case 'feature':
          executionResults = await this.executeFeatureChange(proposal);
          break;

        default:
          throw new Error(`Unknown proposal category: ${proposal.category}`);
      }

      // Update proposal status
      await client.query(
        `UPDATE proposals
         SET status = 'executed',
             execution_date = NOW(),
             execution_tx_hash = $1,
             execution_results = $2
         WHERE id = $3`,
        [txHash, executionResults, proposalId]
      );

      logger.info(`⚡ Proposal executed: ${proposalId} - ${executionResults}`);

    } finally {
      client.release();
    }
  }

  /**
   * Execute commission rate change
   */
  private async executeCommissionRateChange(proposal: Proposal): Promise<string> {
    const changes = proposal.proposedChanges;
    // In production, update actual marketplace commission rates
    logger.info(`💰 Commission rate changed to ${changes.newRate}%`);
    return `Commission rate updated to ${changes.newRate}%`;
  }

  /**
   * Execute pricing change
   */
  private async executePricingChange(proposal: Proposal): Promise<string> {
    const changes = proposal.proposedChanges;
    // In production, update merchandise pricing
    logger.info(`🏷️ Pricing updated for ${changes.category}`);
    return `Pricing updated for ${changes.category}`;
  }

  /**
   * Execute grant priority change
   */
  private async executeGrantPriorityChange(proposal: Proposal): Promise<string> {
    const changes = proposal.proposedChanges;
    // In production, update grant application priorities
    logger.info(`📋 Grant priorities updated: ${changes.newPriorities.join(', ')}`);
    return `Grant priorities updated`;
  }

  /**
   * Execute treasury disbursement
   */
  private async executeTreasuryDisbursement(proposal: Proposal): Promise<string> {
    const amount = proposal.budgetRequired || 0;
    const recipient = proposal.proposedChanges.recipient;
    const purpose = proposal.proposedChanges.purpose;

    // In production, execute actual blockchain transaction
    logger.info(`💸 Treasury disbursement: $${amount.toLocaleString()} to ${recipient} for ${purpose}`);

    return `Disbursed $${amount.toLocaleString()} to ${recipient}`;
  }

  /**
   * Execute feature change
   */
  private async executeFeatureChange(proposal: Proposal): Promise<string> {
    const changes = proposal.proposedChanges;
    // In production, trigger feature deployment
    logger.info(`🚀 Feature deployment: ${changes.featureName}`);
    return `Feature deployed: ${changes.featureName}`;
  }

  /**
   * FINALIZE VOTING
   * Check if proposal passed/rejected after voting period ends
   */
  async finalizeVoting(proposalId: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      const proposalResult = await client.query(
        'SELECT * FROM proposals WHERE id = $1',
        [proposalId]
      );

      if (proposalResult.rows.length === 0) {
        throw new Error('Proposal not found');
      }

      const proposal: Proposal = proposalResult.rows[0];

      // Check voting period has ended
      if (new Date() < proposal.votingEndTime) {
        throw new Error('Voting period has not ended');
      }

      // Get total token supply for quorum calculation
      const supplyResult = await client.query(
        'SELECT SUM(voting_power) as total FROM governance_tokens'
      );

      const totalSupply = parseFloat(supplyResult.rows[0]?.total || '0');

      // Check quorum
      const quorumMet = (proposal.totalVotingPower / totalSupply) >= proposal.quorumRequired;

      if (!quorumMet) {
        await client.query(
          "UPDATE proposals SET status = 'rejected' WHERE id = $1",
          [proposalId]
        );

        logger.info(`❌ Proposal ${proposalId} rejected: Quorum not met (${((proposal.totalVotingPower / totalSupply) * 100).toFixed(1)}% < ${(proposal.quorumRequired * 100).toFixed(0)}%)`);
        return;
      }

      // Check approval threshold
      const approvalRate = proposal.votesFor / proposal.totalVotingPower;
      const passed = approvalRate >= proposal.approvalThreshold;

      const newStatus = passed ? 'passed' : 'rejected';

      await client.query(
        'UPDATE proposals SET status = $1 WHERE id = $2',
        [newStatus, proposalId]
      );

      logger.info(`${passed ? '✅' : '❌'} Proposal ${proposalId} ${newStatus}: ${(approvalRate * 100).toFixed(1)}% approval`);

    } finally {
      client.release();
    }
  }

  /**
   * Get treasury balance
   */
  private async getTreasuryBalance(): Promise<number> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        'SELECT COALESCE(SUM(amount), 0) as balance FROM treasury_transactions WHERE type = \'deposit\''
      );

      const deposits = parseFloat(result.rows[0]?.balance || '0');

      const disbursements = await client.query(
        'SELECT COALESCE(SUM(amount), 0) as balance FROM treasury_transactions WHERE type = \'disbursement\''
      );

      const spent = parseFloat(disbursements.rows[0]?.balance || '0');

      return deposits - spent;

    } finally {
      client.release();
    }
  }

  /**
   * Get comprehensive treasury status
   */
  async getTreasuryStatus(): Promise<Treasury> {
    const client = await this.pool.connect();

    try {
      const balance = await this.getTreasuryBalance();

      // Mock revenue sources (in production, pull from actual revenue tracking)
      const treasury: Treasury = {
        totalBalance: balance,
        sources: {
          merchandiseRevenue: balance * 0.30,
          marketplaceCommissions: balance * 0.40,
          grantFunding: balance * 0.25,
          donations: balance * 0.05
        },
        allocations: {
          development: balance * 0.35,
          marketing: balance * 0.25,
          operations: balance * 0.20,
          reserves: balance * 0.15,
          communityRewards: balance * 0.05
        },
        pendingDisbursements: 0
      };

      // Calculate pending disbursements
      const pendingResult = await client.query(
        "SELECT COALESCE(SUM(budget_required), 0) as pending FROM proposals WHERE status = 'passed'"
      );

      treasury.pendingDisbursements = parseFloat(pendingResult.rows[0]?.pending || '0');

      return treasury;

    } finally {
      client.release();
    }
  }

  /**
   * Get DAO governance statistics
   */
  async getGovernanceStats(): Promise<{
    totalTokenHolders: number;
    totalTokenSupply: number;
    totalVotingPower: number;
    activeProposals: number;
    passedProposals: number;
    rejectedProposals: number;
    executedProposals: number;
    treasuryBalance: number;
    participationRate: number;
  }> {
    const client = await this.pool.connect();

    try {
      const stats = await client.query(`
        SELECT
          COUNT(DISTINCT holder) as total_holders,
          SUM(amount) as total_supply,
          SUM(voting_power) as total_power
        FROM governance_tokens
      `);

      const proposals = await client.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE status = 'passed') as passed,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
          COUNT(*) FILTER (WHERE status = 'executed') as executed
        FROM proposals
      `);

      const participation = await client.query(`
        SELECT
          COUNT(DISTINCT voter) as voters
        FROM votes
        WHERE timestamp > NOW() - INTERVAL '30 days'
      `);

      const totalHolders = parseInt(stats.rows[0]?.total_holders || '0');
      const voters = parseInt(participation.rows[0]?.voters || '0');

      return {
        totalTokenHolders: totalHolders,
        totalTokenSupply: parseFloat(stats.rows[0]?.total_supply || '0'),
        totalVotingPower: parseFloat(stats.rows[0]?.total_power || '0'),
        activeProposals: parseInt(proposals.rows[0]?.active || '0'),
        passedProposals: parseInt(proposals.rows[0]?.passed || '0'),
        rejectedProposals: parseInt(proposals.rows[0]?.rejected || '0'),
        executedProposals: parseInt(proposals.rows[0]?.executed || '0'),
        treasuryBalance: await this.getTreasuryBalance(),
        participationRate: totalHolders > 0 ? (voters / totalHolders) * 100 : 0
      };

    } finally {
      client.release();
    }
  }
}

export default DAOGovernanceService;
