// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

/**
 * @title AntiAI Platform Governance Token
 * @dev ERC-20 token for DAO governance of Anti-AI Dating + Marketplace ecosystem
 * 
 * Key Features:
 * - 1 billion token supply (1,000,000,000 * 10^18)
 * - Community voting on platform decisions
 * - Treasury management (collects 5% of all platform revenue)
 * - Creator rewards distribution
 * - Staking for voting power
 * 
 * Revenue Flows:
 * 1. Dating App Subscriptions: $180K/year → 5% → DAO Treasury
 * 2. Marketplace Commissions: $240K/year → 5% → DAO Treasury  
 * 3. Merch Store Margin: $420K/year → 5% → DAO Treasury
 * 4. Total Annual DAO Revenue: ~$44,700/year (grows with platform)
 */

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract AntiAIToken is ERC20, Ownable, Pausable {
    
    // Constants
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    uint256 public constant PLATFORM_REVENUE_ALLOCATION = 500; // 5% (denominator 10000)
    
    // State variables
    mapping(address => uint256) public lockedTokens;
    mapping(address => uint256) public stakingBalance;
    mapping(address => uint256) public lastStakingTimestamp;
    
    address public treasuryAddress;
    address public platformAddress; // Main platform contract
    
    uint256 public totalStaked;
    uint256 public stakingRewardRate = 500; // 5% annual reward (denominator 10000)
    
    // Events
    event TokensStaked(address indexed user, uint256 amount);
    event TokensUnstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event TreasuryFunded(uint256 amount, string source);
    event GovernanceVote(address indexed voter, string proposal, bool support);
    
    constructor(address _treasuryAddress, address _platformAddress) ERC20("Anti-AI Platform", "ANTIAID") {
        // Mint total supply to platform (for distribution)
        _mint(msg.sender, TOTAL_SUPPLY);
        
        treasuryAddress = _treasuryAddress;
        platformAddress = _platformAddress;
    }
    
    /**
     * @dev Allow platform to send revenue to treasury
     * Called by platform smart contract with revenue percentages
     */
    function fundTreasuryFromRevenue(
        uint256 platformRevenue,
        string memory source
    ) external onlyOwner {
        uint256 treasuryAllocation = (platformRevenue * PLATFORM_REVENUE_ALLOCATION) / 10000;
        
        // Transfer from platform to treasury
        transferFrom(platformAddress, treasuryAddress, treasuryAllocation);
        
        emit TreasuryFunded(treasuryAllocation, source);
    }
    
    /**
     * @dev Stake tokens to earn voting power and rewards
     */
    function stakeTokens(uint256 amount) external {
        require(amount > 0, "Cannot stake 0 tokens");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // Claim any pending rewards first
        if (stakingBalance[msg.sender] > 0) {
            _claimRewards(msg.sender);
        }
        
        // Transfer tokens to this contract
        transferFrom(msg.sender, address(this), amount);
        
        // Update staking info
        stakingBalance[msg.sender] += amount;
        lastStakingTimestamp[msg.sender] = block.timestamp;
        totalStaked += amount;
        
        emit TokensStaked(msg.sender, amount);
    }
    
    /**
     * @dev Unstake tokens (7-day lockup period)
     */
    function unstakeTokens(uint256 amount) external {
        require(amount > 0, "Cannot unstake 0 tokens");
        require(stakingBalance[msg.sender] >= amount, "Insufficient staked balance");
        
        // Claim rewards before unstaking
        _claimRewards(msg.sender);
        
        // Enforce lockup period (7 days from last stake)
        require(
            block.timestamp >= lastStakingTimestamp[msg.sender] + 7 days,
            "Tokens are locked for 7 days"
        );
        
        // Update staking info
        stakingBalance[msg.sender] -= amount;
        totalStaked -= amount;
        
        // Transfer tokens back
        transfer(msg.sender, amount);
        
        emit TokensUnstaked(msg.sender, amount);
    }
    
    /**
     * @dev Calculate staking rewards (5% annual APY)
     */
    function calculateRewards(address staker) public view returns (uint256) {
        uint256 balance = stakingBalance[staker];
        if (balance == 0) return 0;
        
        uint256 stakingDuration = block.timestamp - lastStakingTimestamp[staker];
        
        // Calculate annual reward: balance * (stakingRewardRate / 10000)
        // Prorate by time staked
        uint256 annualReward = (balance * stakingRewardRate) / 10000;
        uint256 timeReward = (annualReward * stakingDuration) / (365 days);
        
        return timeReward;
    }
    
    /**
     * @dev Claim staking rewards
     */
    function claimRewards() external {
        _claimRewards(msg.sender);
    }
    
    function _claimRewards(address staker) internal {
        uint256 rewards = calculateRewards(staker);
        
        if (rewards > 0) {
            // Update timestamp
            lastStakingTimestamp[staker] = block.timestamp;
            
            // Mint rewards (treasury must have sufficient tokens)
            _mint(staker, rewards);
            
            emit RewardsClaimed(staker, rewards);
        }
    }
    
    /**
     * @dev Get voting power (1 token = 1 vote while staked)
     */
    function getVotingPower(address voter) public view returns (uint256) {
        return stakingBalance[voter];
    }
    
    /**
     * @dev Community vote on proposal
     * Example proposals:
     * - "increase_dating_app_features"
     * - "add_marketplace_category"
     * - "change_commission_split"
     * - "fund_marketing_campaign"
     */
    function voteOnProposal(
        string memory proposal,
        bool support
    ) external {
        uint256 votingPower = getVotingPower(msg.sender);
        require(votingPower > 0, "No voting power (must stake tokens)");
        
        emit GovernanceVote(msg.sender, proposal, support);
    }
    
    /**
     * @dev Pause/unpause token transfers (emergency only)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }
}

/**
 * @title AntiAI Treasury
 * @dev Manages DAO treasury (collects 5% of platform revenue)
 * 
 * Treasury Uses:
 * - Community grants (funding user-created features/campaigns)
 * - Creator rewards pool (bonus payments to top creators)
 * - Marketing & growth budget
 * - Security audits & maintenance
 * - Strategic partnerships
 */

contract AntiAITreasury is Ownable {
    
    AntiAIToken public antiAIToken;
    
    // Treasury balance tracking
    uint256 public totalRevenue;
    uint256 public totalSpent;
    
    // Spending proposals
    enum ProposalStatus { Pending, Approved, Rejected, Executed }
    
    struct Proposal {
        uint256 id;
        string description;
        uint256 amount;
        address recipient;
        string category; // "grant" | "creator_reward" | "marketing" | "security" | "partnership"
        ProposalStatus status;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 deadline;
        bool executed;
    }
    
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    
    uint256 public proposalCount;
    uint256 public proposalVotingPeriod = 7 days;
    uint256 public minQuorumPercentage = 500; // 5% of staked tokens
    
    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        string description,
        uint256 amount,
        address recipient
    );
    event VotedOnProposal(uint256 indexed proposalId, address indexed voter, bool support);
    event ProposalExecuted(uint256 indexed proposalId, uint256 amount, address recipient);
    event GrantIssued(uint256 amount, address recipient, string purpose);
    
    constructor(address tokenAddress) {
        antiAIToken = AntiAIToken(tokenAddress);
    }
    
    /**
     * @dev Create proposal to spend treasury funds
     * 
     * Example proposals:
     * - Creator bonus pool: $5,000 to top 10 creators
     * - Feature development: $10,000 for community-voted feature
     * - Security audit: $20,000 for professional audit
     * - Marketing campaign: $15,000 for growth initiative
     */
    function createProposal(
        string memory description,
        uint256 amount,
        address recipient,
        string memory category
    ) external onlyOwner returns (uint256) {
        require(amount > 0, "Amount must be > 0");
        require(recipient != address(0), "Invalid recipient");
        
        uint256 proposalId = proposalCount++;
        
        proposals[proposalId] = Proposal({
            id: proposalId,
            description: description,
            amount: amount,
            recipient: recipient,
            category: category,
            status: ProposalStatus.Pending,
            votesFor: 0,
            votesAgainst: 0,
            deadline: block.timestamp + proposalVotingPeriod,
            executed: false
        });
        
        emit ProposalCreated(proposalId, description, amount, recipient);
        
        return proposalId;
    }
    
    /**
     * @dev Vote on treasury proposal (1 staked token = 1 vote)
     */
    function voteOnProposal(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];
        
        require(block.timestamp <= proposal.deadline, "Voting period ended");
        require(!hasVoted[proposalId][msg.sender], "Already voted");
        
        uint256 votingPower = antiAIToken.getVotingPower(msg.sender);
        require(votingPower > 0, "No voting power");
        
        hasVoted[proposalId][msg.sender] = true;
        
        if (support) {
            proposal.votesFor += votingPower;
        } else {
            proposal.votesAgainst += votingPower;
        }
        
        emit VotedOnProposal(proposalId, msg.sender, support);
    }
    
    /**
     * @dev Execute approved proposal (transfer funds)
     */
    function executeProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        
        require(!proposal.executed, "Already executed");
        require(block.timestamp > proposal.deadline, "Voting still ongoing");
        require(proposal.votesFor > proposal.votesAgainst, "Proposal rejected");
        require(
            antiAIToken.balanceOf(address(this)) >= proposal.amount,
            "Insufficient treasury balance"
        );
        
        proposal.executed = true;
        proposal.status = ProposalStatus.Executed;
        totalSpent += proposal.amount;
        
        // Transfer tokens to recipient
        antiAIToken.transfer(proposal.recipient, proposal.amount);
        
        emit ProposalExecuted(proposalId, proposal.amount, proposal.recipient);
    }
    
    /**
     * @dev Issue grant directly (for time-sensitive grants)
     */
    function issueGrant(
        uint256 amount,
        address recipient,
        string memory purpose
    ) external onlyOwner {
        require(amount > 0, "Amount must be > 0");
        require(recipient != address(0), "Invalid recipient");
        require(
            antiAIToken.balanceOf(address(this)) >= amount,
            "Insufficient treasury balance"
        );
        
        totalSpent += amount;
        antiAIToken.transfer(recipient, amount);
        
        emit GrantIssued(amount, recipient, purpose);
    }
    
    /**
     * @dev Receive tokens to treasury
     */
    function receiveFunds(uint256 amount) external {
        antiAIToken.transferFrom(msg.sender, address(this), amount);
        totalRevenue += amount;
    }
    
    /**
     * @dev Get treasury balance
     */
    function getTreasuryBalance() external view returns (uint256) {
        return antiAIToken.balanceOf(address(this));
    }
    
    /**
     * @dev Get proposal details
     */
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }
}

/**
 * @title AntiAI Marketplace Commission Tracker
 * @dev Automatically calculates and distributes commissions to creators
 * 
 * Commission Split:
 * - Creator: 45% of transaction
 * - Platform: 50% of transaction
 * - DAO Treasury: 5% of transaction
 * 
 * Example:
 * - AI Agent sells for $100
 * - Creator gets: $45
 * - Platform gets: $50
 * - DAO Treasury gets: $5
 */

contract CommissionTracker is Ownable {
    
    AntiAIToken public antiAIToken;
    AntiAITreasury public treasury;
    
    struct Transaction {
        uint256 id;
        address creator;
        uint256 amount;
        uint256 creatorCut;
        uint256 platformCut;
        uint256 treasuryCut;
        uint256 timestamp;
        string itemType; // "agent" | "automation" | "integration"
    }
    
    mapping(uint256 => Transaction) public transactions;
    mapping(address => uint256) public creatorEarnings;
    
    uint256 public transactionCount;
    uint256 public totalVolume;
    
    // Commission percentages (denominator 10000)
    uint256 public constant CREATOR_COMMISSION = 4500; // 45%
    uint256 public constant PLATFORM_COMMISSION = 5000; // 50%
    uint256 public constant DAO_COMMISSION = 500; // 5%
    
    event CommissionPaid(
        uint256 indexed transactionId,
        address indexed creator,
        uint256 totalAmount,
        uint256 creatorEarnings,
        uint256 platformEarnings,
        uint256 daoEarnings
    );
    
    constructor(address tokenAddress, address treasuryAddress) {
        antiAIToken = AntiAIToken(tokenAddress);
        treasury = AntiAITreasury(treasuryAddress);
    }
    
    /**
     * @dev Process marketplace transaction and distribute commissions
     * Called by marketplace backend after sale completes
     */
    function processTransaction(
        address creator,
        uint256 amount,
        string memory itemType
    ) external onlyOwner returns (uint256) {
        require(creator != address(0), "Invalid creator");
        require(amount > 0, "Amount must be > 0");
        
        uint256 creatorCut = (amount * CREATOR_COMMISSION) / 10000;
        uint256 platformCut = (amount * PLATFORM_COMMISSION) / 10000;
        uint256 treasuryCut = (amount * DAO_COMMISSION) / 10000;
        
        uint256 txId = transactionCount++;
        
        transactions[txId] = Transaction({
            id: txId,
            creator: creator,
            amount: amount,
            creatorCut: creatorCut,
            platformCut: platformCut,
            treasuryCut: treasuryCut,
            timestamp: block.timestamp,
            itemType: itemType
        });
        
        creatorEarnings[creator] += creatorCut;
        totalVolume += amount;
        
        // Transfer creator's share
        antiAIToken.transfer(creator, creatorCut);
        
        // Transfer treasury's share
        antiAIToken.transfer(address(treasury), treasuryCut);
        
        // Platform keeps their cut
        // (Should be transferred to platform treasury)
        
        emit CommissionPaid(
            txId,
            creator,
            amount,
            creatorCut,
            platformCut,
            treasuryCut
        );
        
        return txId;
    }
    
    /**
     * @dev Get creator's total earnings
     */
    function getCreatorEarnings(address creator) external view returns (uint256) {
        return creatorEarnings[creator];
    }
    
    /**
     * @dev Get marketplace statistics
     */
    function getMarketplaceStats() external view returns (
        uint256 totalTransactions,
        uint256 volume,
        uint256 averageValue
    ) {
        return (
            transactionCount,
            totalVolume,
            transactionCount > 0 ? totalVolume / transactionCount : 0
        );
    }
}
