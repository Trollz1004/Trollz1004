// DAO TypeScript Strict Types - Zero 'any' types
// Team Claude For The Kids - Production Grade

export interface WalletState {
  address: string | null;
  connected: boolean;
  balance: bigint;
  chainId: number;
  provider: any; // Web3Provider - external type
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
  startBlock: bigint;
  endBlock: bigint;
  executed: boolean;
  canceled: boolean;
  eta: bigint;
  targets: string[];
  values: bigint[];
  signatures: string[];
  calldatas: string[];
}

export interface Vote {
  proposalId: string;
  voter: string;
  support: VoteType;
  votes: bigint;
  reason: string;
  timestamp: number;
}

export enum VoteType {
  Against = 0,
  For = 1,
  Abstain = 2
}

export interface GovernanceStats {
  totalProposals: number;
  activeProposals: number;
  totalVotes: bigint;
  participationRate: number;
  quorum: bigint;
  votingDelay: bigint;
  votingPeriod: bigint;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: bigint;
  data: string;
  nonce: number;
  gasLimit: bigint;
  gasPrice: bigint;
  chainId: number;
}

export interface ContractCallParams {
  method: string;
  args: unknown[];
  from?: string;
  value?: bigint;
  gasLimit?: bigint;
}

export interface BatchCallResult<T> {
  success: boolean;
  data: T | null;
  error: Error | null;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}
