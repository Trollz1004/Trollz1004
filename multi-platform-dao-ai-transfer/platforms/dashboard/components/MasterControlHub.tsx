/**
 * MasterControlHub - Unified Dashboard for All Platforms
 * Controls aidoesitall.org DAO, ClaudeDroid AI, and AI-Solutions.Store
 */

import React, { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface PlatformHealth {
  dao: 'healthy' | 'degraded' | 'down';
  ai: 'healthy' | 'degraded' | 'down';
  marketplace: 'healthy' | 'degraded' | 'down';
}

interface Metrics {
  totalMRR: number;
  activeUsers: number;
  daoProposals: number;
  aiRequests24h: number;
  marketplaceSales: number;
}

const MasterControlHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [platformHealth, setPlatformHealth] = useState<PlatformHealth>({
    dao: 'healthy',
    ai: 'healthy',
    marketplace: 'healthy',
  });
  const [metrics, setMetrics] = useState<Metrics>({
    totalMRR: 46050,
    activeUsers: 1247,
    daoProposals: 12,
    aiRequests24h: 15420,
    marketplaceSales: 89,
  });

  useEffect(() => {
    // WebSocket connection for real-time updates
    const ws = new WebSocket('ws://localhost:4001/metrics');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMetrics(data.metrics);
      setPlatformHealth(data.health);
    };

    return () => ws.close();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500';
      case 'degraded':
        return 'text-yellow-500';
      case 'down':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return '✓';
      case 'degraded':
        return '!';
      case 'down':
        return '✗';
      default:
        return '?';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            🎛️ MasterControlHub
          </h1>
          <p className="text-gray-600">
            Unified control for aidoesitall.org, ClaudeDroid AI, and AI-Solutions.Store
          </p>
        </div>
      </header>

      {/* Platform Health Status */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">DAO Platform</p>
                <p className="text-lg font-semibold">aidoesitall.org</p>
              </div>
              <div className={`text-2xl ${getStatusColor(platformHealth.dao)}`}>
                {getStatusIcon(platformHealth.dao)}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">AI Platform</p>
                <p className="text-lg font-semibold">ClaudeDroid AI</p>
              </div>
              <div className={`text-2xl ${getStatusColor(platformHealth.ai)}`}>
                {getStatusIcon(platformHealth.ai)}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Marketplace</p>
                <p className="text-lg font-semibold">AI-Solutions.Store</p>
              </div>
              <div className={`text-2xl ${getStatusColor(platformHealth.marketplace)}`}>
                {getStatusIcon(platformHealth.marketplace)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="bg-white rounded-lg shadow">
          <div className="flex border-b">
            {['overview', 'dao', 'ai', 'marketplace', 'kickstarter'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-medium capitalize ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-5 gap-4">
                  <MetricCard
                    title="Total MRR"
                    value={`$${metrics.totalMRR.toLocaleString()}`}
                    change="+12.5%"
                    positive
                  />
                  <MetricCard
                    title="Active Users"
                    value={metrics.activeUsers.toLocaleString()}
                    change="+8.3%"
                    positive
                  />
                  <MetricCard
                    title="DAO Proposals"
                    value={metrics.daoProposals}
                    change="+3"
                    positive
                  />
                  <MetricCard
                    title="AI Requests (24h)"
                    value={metrics.aiRequests24h.toLocaleString()}
                    change="+15.7%"
                    positive
                  />
                  <MetricCard
                    title="Marketplace Sales"
                    value={metrics.marketplaceSales}
                    change="+22.1%"
                    positive
                  />
                </div>

                {/* Revenue Chart */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Revenue Breakdown (Last 30 Days)</h3>
                  <div className="h-64">
                    <Line
                      data={{
                        labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
                        datasets: [
                          {
                            label: 'DAO',
                            data: generateMockData(30, 400, 450),
                            borderColor: 'rgb(59, 130, 246)',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          },
                          {
                            label: 'AI',
                            data: generateMockData(30, 280, 320),
                            borderColor: 'rgb(16, 185, 129)',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                          },
                          {
                            label: 'Marketplace',
                            data: generateMockData(30, 750, 850),
                            borderColor: 'rgb(249, 115, 22)',
                            backgroundColor: 'rgba(249, 115, 22, 0.1)',
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'top' },
                        },
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'dao' && <DAODashboard />}
            {activeTab === 'ai' && <AIDashboard />}
            {activeTab === 'marketplace' && <MarketplaceDashboard />}
            {activeTab === 'kickstarter' && <KickstarterDashboard />}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper components
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  change: string;
  positive: boolean;
}> = ({ title, value, change, positive }) => (
  <div className="bg-white rounded-lg shadow p-4">
    <p className="text-sm text-gray-600 mb-1">{title}</p>
    <p className="text-2xl font-bold mb-1">{value}</p>
    <p className={`text-sm ${positive ? 'text-green-600' : 'text-red-600'}`}>
      {change}
    </p>
  </div>
);

// Mock data generator
const generateMockData = (length: number, min: number, max: number): number[] => {
  return Array.from({ length }, () => Math.floor(Math.random() * (max - min + 1)) + min);
};

// Placeholder components (will be implemented separately)
const DAODashboard = () => <div>DAO Dashboard Content</div>;
const AIDashboard = () => <div>AI Dashboard Content</div>;
const MarketplaceDashboard = () => <div>Marketplace Dashboard Content</div>;
const KickstarterDashboard = () => <div>Kickstarter Dashboard Content</div>;

export default MasterControlHub;
