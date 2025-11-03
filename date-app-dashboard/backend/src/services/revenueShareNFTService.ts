import { Pool } from 'pg';
import { ethers } from 'ethers';
import logger from '../logger';

interface NFTMintRequest {
  walletAddress: string;
  chain: 'ethereum' | 'polygon' | 'arbitrum';
  quantity: number;
}

/**
 * Revenue Share NFT Service - Passive Income Paradise
 * Sell 1000 NFTs at $100-500 = $100K-500K INSTANT capital
 * Each NFT gets 0.01% of ALL platform revenue FOREVER
 * Expected: $100K-500K one-time, then $50-200/NFT/year passive
 */
export class RevenueShareNFTService {
  private pool: Pool;
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;

  // Revenue Share NFT Contract ABI (simplified)
  private readonly CONTRACT_ABI = [
    'function mint(address to, uint256 tokenId) public',
    'function transfer(address to, uint256 tokenId) public',
    'function ownerOf(uint256 tokenId) public view returns (address)',
    'function totalSupply() public view returns (uint256)',
    'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
  ];

  constructor(pool: Pool) {
    this.pool = pool;
    
    // Initialize Web3 connection
    const rpcUrl = process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/your-api-key';
    const privateKey = process.env.NFT_MINTER_PRIVATE_KEY || '';
    const contractAddress = process.env.NFT_CONTRACT_ADDRESS || '';

    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.contract = new ethers.Contract(contractAddress, this.CONTRACT_ABI, this.wallet);
  }

  /**
   * Mint revenue share NFT to buyer
   * Each NFT = 0.01% of revenue (1000 NFTs total = 10% revenue share)
   */
  async mintNFT(request: NFTMintRequest): Promise<any[]> {
    const client = await this.pool.connect();
    const mintedNFTs = [];

    try {
      await client.query('BEGIN');

      // Check total minted (max 1000)
      const countResult = await client.query(
        `SELECT COUNT(*) as count FROM revenue_share_nfts`
      );
      const currentCount = parseInt(countResult.rows[0].count);

      if (currentCount + request.quantity > 1000) {
        throw new Error(`Only ${1000 - currentCount} NFTs remaining`);
      }

      // Dynamic pricing based on scarcity
      const priceUsd = this.calculateNFTPrice(currentCount);

      for (let i = 0; i < request.quantity; i++) {
        const tokenId = currentCount + i + 1;

        // Mint on-chain
        const tx = await this.contract.mint(request.walletAddress, tokenId);
        await tx.wait(); // Wait for confirmation

        logger.info(`⛓️ NFT minted on-chain: Token #${tokenId}`);

        // Get native currency price
        const nativePrice = await this.convertToNative(priceUsd, request.chain);

        // Store in database
        const result = await client.query(
          `INSERT INTO revenue_share_nfts (
            token_id, contract_address, chain, owner_wallet,
            revenue_share_percentage, mint_price_usd, mint_price_native
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *`,
          [
            tokenId,
            this.contract.address,
            request.chain,
            request.walletAddress.toLowerCase(),
            0.01, // 0.01% per NFT
            priceUsd,
            nativePrice
          ]
        );

        mintedNFTs.push(result.rows[0]);
      }

      await client.query('COMMIT');

      logger.info(`💎 ${request.quantity} Revenue Share NFTs minted - Total: $${priceUsd * request.quantity}`);

      return mintedNFTs;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('NFT mint failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Calculate NFT price based on scarcity
   * First 100: $100, Next 400: $200, Next 400: $350, Last 100: $500
   */
  private calculateNFTPrice(currentCount: number): number {
    if (currentCount < 100) return 100;
    if (currentCount < 500) return 200;
    if (currentCount < 900) return 350;
    return 500;
  }

  /**
   * Convert USD to native currency (ETH, MATIC, etc.)
   */
  private async convertToNative(usd: number, chain: string): Promise<number> {
    // In production, fetch real-time price from Chainlink or CoinGecko
    const prices: any = {
      ethereum: 3000, // ETH ~$3000
      polygon: 0.80,  // MATIC ~$0.80
      arbitrum: 3000  // ARB uses ETH
    };

    return usd / prices[chain];
  }

  /**
   * Calculate and distribute NFT revenue payouts (runs monthly)
   * THIS IS THE PASSIVE INCOME MONEY PRINTER
   */
  async calculateMonthlyPayouts(): Promise<any> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Calculate period
      const periodEnd = new Date();
      const periodStart = new Date(periodEnd);
      periodStart.setMonth(periodStart.getMonth() - 1);

      // Calculate total platform revenue for the month
      const revenueResult = await client.query(
        `SELECT
          -- Subscriptions
          COALESCE((SELECT SUM(amount) FROM payments 
            WHERE status = 'succeeded' AND created_at BETWEEN $1 AND $2), 0) +
          
          -- Personalized Videos
          COALESCE((SELECT SUM(price_usd) FROM personalized_video_orders 
            WHERE status = 'completed' AND created_at BETWEEN $1 AND $2), 0) +
          
          -- Guaranteed Boosts (net of refunds)
          COALESCE((SELECT SUM(price_usd) - COALESCE(SUM(refund_amount_usd), 0) 
            FROM guaranteed_boosts WHERE created_at BETWEEN $1 AND $2), 0) +
          
          -- Shop Orders
          COALESCE((SELECT SUM(total_amount) FROM shop_orders 
            WHERE status = 'completed' AND created_at BETWEEN $1 AND $2), 0) +
          
          -- Fundraising
          COALESCE((SELECT SUM(amount) FROM donations 
            WHERE created_at BETWEEN $1 AND $2), 0) as total_revenue
        `,
        [periodStart, periodEnd]
      );

      const totalRevenue = parseFloat(revenueResult.rows[0].total_revenue);

      logger.info(`💰 Total platform revenue for period: $${totalRevenue}`);

      // Get all active NFTs
      const nftsResult = await client.query(
        `SELECT * FROM revenue_share_nfts WHERE is_active = true ORDER BY token_id`
      );

      const payouts = [];

      for (const nft of nftsResult.rows) {
        const nftShare = totalRevenue * (nft.revenue_share_percentage / 100);

        // Create payout record
        await client.query(
          `INSERT INTO nft_revenue_payouts (
            nft_id, period_start, period_end, 
            total_revenue_usd, nft_share_usd, payout_status
          ) VALUES ($1, $2, $3, $4, $5, 'pending')`,
          [nft.id, periodStart, periodEnd, totalRevenue, nftShare]
        );

        // Update NFT total earnings
        await client.query(
          `UPDATE revenue_share_nfts
          SET total_earnings_usd = total_earnings_usd + $1,
              last_payout_at = NOW()
          WHERE id = $2`,
          [nftShare, nft.id]
        );

        payouts.push({
          tokenId: nft.token_id,
          ownerWallet: nft.owner_wallet,
          payoutAmount: nftShare,
          revenueSharePct: nft.revenue_share_percentage
        });
      }

      await client.query('COMMIT');

      logger.info(`🎁 Calculated payouts for ${payouts.length} NFTs - Total: $${payouts.reduce((sum, p) => sum + p.payoutAmount, 0)}`);

      return {
        periodStart,
        periodEnd,
        totalRevenue,
        nftCount: payouts.length,
        totalPaidOut: payouts.reduce((sum, p) => sum + p.payoutAmount, 0),
        payouts
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Process pending payouts (send crypto to wallets)
   */
  async processPendingPayouts(maxPayouts: number = 50): Promise<any> {
    const client = await this.pool.connect();

    try {
      // Get pending payouts
      const payoutsResult = await client.query(
        `SELECT 
          nrp.*,
          rsn.owner_wallet,
          rsn.chain
        FROM nft_revenue_payouts nrp
        JOIN revenue_share_nfts rsn ON nrp.nft_id = rsn.id
        WHERE nrp.payout_status = 'pending'
        ORDER BY nrp.created_at ASC
        LIMIT $1`,
        [maxPayouts]
      );

      const processed = [];

      for (const payout of payoutsResult.rows) {
        try {
          // Convert USD to native currency
          const nativeAmount = await this.convertToNative(
            parseFloat(payout.nft_share_usd),
            payout.chain
          );

          // Send transaction
          const tx = await this.wallet.sendTransaction({
            to: payout.owner_wallet,
            value: ethers.utils.parseEther(nativeAmount.toString())
          });

          await tx.wait();

          // Update payout status
          await client.query(
            `UPDATE nft_revenue_payouts
            SET payout_status = 'completed',
                payout_tx_hash = $1,
                paid_at = NOW()
            WHERE id = $2`,
            [tx.hash, payout.id]
          );

          processed.push({
            payoutId: payout.id,
            ownerWallet: payout.owner_wallet,
            amount: nativeAmount,
            txHash: tx.hash
          });

          logger.info(`✅ Payout sent: $${payout.nft_share_usd} -> ${payout.owner_wallet} (${tx.hash})`);
        } catch (error) {
          logger.error(`Failed to process payout ${payout.id}:`, error);
          
          await client.query(
            `UPDATE nft_revenue_payouts
            SET payout_status = 'failed'
            WHERE id = $1`,
            [payout.id]
          );
        }
      }

      return {
        processed: processed.length,
        payouts: processed
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get NFT holder stats
   */
  async getNFTHolderStats(walletAddress: string): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT
          COUNT(*) as nfts_owned,
          SUM(revenue_share_percentage) as total_revenue_share_pct,
          SUM(total_earnings_usd) as lifetime_earnings,
          AVG(total_earnings_usd) as avg_earnings_per_nft,
          MAX(last_payout_at) as last_payout_date,
          COALESCE(json_agg(
            json_build_object(
              'tokenId', token_id,
              'revenueSharePct', revenue_share_percentage,
              'totalEarnings', total_earnings_usd,
              'mintPrice', mint_price_usd
            ) ORDER BY token_id
          ) FILTER (WHERE token_id IS NOT NULL), '[]') as nfts
        FROM revenue_share_nfts
        WHERE owner_wallet = $1 AND is_active = true
        GROUP BY owner_wallet`,
        [walletAddress.toLowerCase()]
      );

      if (result.rows.length === 0) {
        return { nftsOwned: 0, nfts: [] };
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Get revenue share analytics
   */
  async getRevenueShareAnalytics(): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT
          COUNT(*) as total_nfts_minted,
          SUM(mint_price_usd) as total_mint_revenue,
          SUM(total_earnings_usd) as lifetime_payouts,
          AVG(total_earnings_usd) as avg_payout_per_nft,
          COUNT(DISTINCT owner_wallet) as unique_holders
        FROM revenue_share_nfts
        WHERE is_active = true`
      );

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Sync NFT ownership from blockchain
   * Run periodically to detect transfers
   */
  async syncNFTOwnership(): Promise<void> {
    const client = await this.pool.connect();
    try {
      const nftsResult = await client.query(
        `SELECT token_id, owner_wallet FROM revenue_share_nfts WHERE is_active = true`
      );

      for (const nft of nftsResult.rows) {
        const onChainOwner = await this.contract.ownerOf(nft.token_id);
        
        if (onChainOwner.toLowerCase() !== nft.owner_wallet) {
          await client.query(
            `UPDATE revenue_share_nfts
            SET owner_wallet = $1
            WHERE token_id = $2`,
            [onChainOwner.toLowerCase(), nft.token_id]
          );

          logger.info(`🔄 NFT #${nft.token_id} ownership synced: ${onChainOwner}`);
        }
      }
    } finally {
      client.release();
    }
  }
}
