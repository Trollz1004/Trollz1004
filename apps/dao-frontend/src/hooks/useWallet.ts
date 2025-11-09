// Wallet Management Hook - Extracted from monolithic component
// Reduces DAO component from 450 to 150 lines (70% reduction)
// Team Claude For The Kids

import { useState, useEffect, useCallback } from 'react';
import { WalletState } from '../types/dao.types';

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    connected: false,
    balance: 0n,
    chainId: 1,
    provider: null
  });

  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Connect wallet
  const connect = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setError(new Error('MetaMask not installed'));
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      const chainId = await window.ethereum.request({
        method: 'eth_chainId'
      });

      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [accounts[0], 'latest']
      });

      setWallet({
        address: accounts[0],
        connected: true,
        balance: BigInt(balance),
        chainId: parseInt(chainId, 16),
        provider: window.ethereum
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to connect'));
    } finally {
      setConnecting(false);
    }
  }, []);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setWallet({
      address: null,
      connected: false,
      balance: 0n,
      chainId: 1,
      provider: null
    });
  }, []);

  // Update balance
  const updateBalance = useCallback(async () => {
    if (!wallet.address || !wallet.provider) return;

    try {
      const balance = await wallet.provider.request({
        method: 'eth_getBalance',
        params: [wallet.address, 'latest']
      });

      setWallet(prev => ({
        ...prev,
        balance: BigInt(balance)
      }));
    } catch (err) {
      console.error('Failed to update balance:', err);
    }
  }, [wallet.address, wallet.provider]);

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setWallet(prev => ({
          ...prev,
          address: accounts[0]
        }));
        updateBalance();
      }
    };

    const handleChainChanged = (chainId: string) => {
      setWallet(prev => ({
        ...prev,
        chainId: parseInt(chainId, 16)
      }));
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [disconnect, updateBalance]);

  // Auto-connect if previously connected
  useEffect(() => {
    const autoConnect = async () => {
      if (typeof window === 'undefined' || !window.ethereum) return;

      try {
        const accounts = await window.ethereum.request({
          method: 'eth_accounts'
        });

        if (accounts.length > 0) {
          await connect();
        }
      } catch (err) {
        console.error('Auto-connect failed:', err);
      }
    };

    autoConnect();
  }, [connect]);

  return {
    wallet,
    connecting,
    error,
    connect,
    disconnect,
    updateBalance
  };
}

// Type augmentation for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<any>;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}
