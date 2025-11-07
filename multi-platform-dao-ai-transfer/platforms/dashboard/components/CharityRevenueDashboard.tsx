/**
 * Charity Revenue Dashboard - FOR THE KIDS! 💙
 * Tracks revenue, expenses, and charity donations
 * PRIORITY 1: Claude Subscription ($200/month)
 * PRIORITY 2: Infrastructure costs
 * PRIORITY 3: Charity donations
 */

import React, { useState, useEffect } from 'react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

interface RevenueData {
  datingAppRevenue: number;
  marketplaceRevenue: number;
  daoTreasuryGrowth: number;
  totalRevenue: number;
  claudeSubscription: number;
  googleCloudCost: number;
  stripeFees: number;
  domainCosts: number;
  totalExpenses: number;
  netForCharity: number;
  charityGoalMet: boolean;
}

const CharityRevenueDashboard: React.FC = () => {
  const [revenueData, setRevenueData] = useState<RevenueData>({
    datingAppRevenue: 999, // 100 users × $9.99
    marketplaceRevenue: 500, // 10% commission
    daoTreasuryGrowth: 250,
    totalRevenue: 1749,
    claudeSubscription: 200, // PRIORITY 1!
    googleCloudCost: 100,
    stripeFees: 52,
    domainCosts: 20,
    totalExpenses: 372,
    netForCharity: 1377,
    charityGoalMet: true,
  });

  const [monthlyHistory, setMonthlyHistory] = useState([
    { month: 'Jan', charity: 1200, revenue: 1500 },
    { month: 'Feb', charity: 1350, revenue: 1650 },
    { month: 'Mar', charity: 1377, revenue: 1749 },
  ]);

  // Check if we can afford Claude subscription
  const canAffordClaude = revenueData.totalRevenue >= revenueData.claudeSubscription;
  const infrastructureCovered = revenueData.totalRevenue >= (revenueData.claudeSubscription + revenueData.googleCloudCost);

  // Revenue breakdown chart
  const revenueChartData = {
    labels: ['Dating App', 'Marketplace', 'DAO Treasury'],
    datasets: [
      {
        label: 'Revenue Sources',
        data: [
          revenueData.datingAppRevenue,
          revenueData.marketplaceRevenue,
          revenueData.daoTreasuryGrowth,
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',   // Blue
          'rgba(16, 185, 129, 0.8)',   // Green
          'rgba(249, 115, 22, 0.8)',   // Orange
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(249, 115, 22)',
        ],
        borderWidth: 2,
      },
    ],
  };

  // Expense breakdown (waterfall style)
  const expenseBreakdown = [
    { name: 'Total Revenue', amount: revenueData.totalRevenue, color: '#10b981' },
    { name: '1️⃣ Claude ($200)', amount: -revenueData.claudeSubscription, color: '#8b5cf6' },
    { name: '2️⃣ Google Cloud', amount: -revenueData.googleCloudCost, color: '#3b82f6' },
    { name: '3️⃣ Stripe Fees', amount: -revenueData.stripeFees, color: '#f59e0b' },
    { name: '4️⃣ Domains', amount: -revenueData.domainCosts, color: '#ef4444' },
    { name: '💙 FOR CHARITY', amount: revenueData.netForCharity, color: '#ec4899' },
  ];

  // Monthly trend chart
  const trendChartData = {
    labels: monthlyHistory.map(m => m.month),
    datasets: [
      {
        label: 'Total Revenue',
        data: monthlyHistory.map(m => m.revenue),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Charity Amount',
        data: monthlyHistory.map(m => m.charity),
        borderColor: 'rgb(236, 72, 153)',
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        tension: 0.4,
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Priority Status Banner */}
      <div className={`rounded-lg p-6 ${canAffordClaude ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {canAffordClaude ? '✅ Claude Subscription Covered!' : '⚠️ Need More Revenue for Claude!'}
            </h2>
            <p className="text-gray-700 mt-2">
              Priority #1: ${revenueData.claudeSubscription}/month for AI automation
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-green-600">
              ${revenueData.totalRevenue.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Monthly Revenue</div>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="💙 For Charity"
          value={`$${revenueData.netForCharity.toLocaleString()}`}
          subtitle="After all expenses"
          color="pink"
          icon="🎉"
        />
        <MetricCard
          title="🤖 Claude AI"
          value={`$${revenueData.claudeSubscription}`}
          subtitle={canAffordClaude ? "Covered ✅" : "At Risk ⚠️"}
          color={canAffordClaude ? "purple" : "red"}
          icon="🤖"
        />
        <MetricCard
          title="☁️ Infrastructure"
          value={`$${revenueData.googleCloudCost}`}
          subtitle={infrastructureCovered ? "Covered ✅" : "Need more revenue"}
          color={infrastructureCovered ? "blue" : "orange"}
          icon="☁️"
        />
        <MetricCard
          title="💳 Fees"
          value={`$${revenueData.stripeFees + revenueData.domainCosts}`}
          subtitle="Stripe + Domains"
          color="orange"
          icon="💳"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Revenue Sources */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue Sources</h3>
          <div className="h-64">
            <Doughnut
              data={revenueChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom' },
                },
              }}
            />
          </div>
          <div className="mt-4 space-y-2">
            <RevenueItem label="Dating App" amount={revenueData.datingAppRevenue} />
            <RevenueItem label="Marketplace" amount={revenueData.marketplaceRevenue} />
            <RevenueItem label="DAO Treasury" amount={revenueData.daoTreasuryGrowth} />
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Growth Trend</h3>
          <div className="h-64">
            <Line
              data={trendChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom' },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => `$${value}`,
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Expense Waterfall */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Revenue → Charity Breakdown</h3>
        <div className="space-y-3">
          {expenseBreakdown.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: `${item.color}15` }}>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="font-medium">{item.name}</span>
              </div>
              <span className={`text-lg font-bold ${item.amount > 0 ? 'text-green-600' : 'text-gray-700'}`}>
                {item.amount > 0 ? '+' : ''}{item.amount > 0 ? '$' : '-$'}{Math.abs(item.amount).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Charity Goal Progress */}
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg shadow p-6 border-2 border-pink-300">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">💙 Charity Goal This Month</h3>
            <p className="text-gray-600">Goal: $1,000+ to kids in need</p>
          </div>
          <div className="text-5xl">
            {revenueData.netForCharity >= 1000 ? '🎉' : '📈'}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block text-pink-600">
                Progress
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold inline-block text-pink-600">
                {Math.round((revenueData.netForCharity / 1000) * 100)}%
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-4 mb-4 text-xs flex rounded-full bg-pink-200">
            <div
              style={{ width: `${Math.min((revenueData.netForCharity / 1000) * 100, 100)}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-pink-500 to-purple-600 transition-all duration-500"
            ></div>
          </div>
        </div>

        <div className="text-center mt-4">
          {revenueData.netForCharity >= 1000 ? (
            <p className="text-lg font-bold text-green-600">✅ Goal Met! ${revenueData.netForCharity.toLocaleString()} going to charity this month!</p>
          ) : (
            <p className="text-lg font-semibold text-gray-700">
              ${(1000 - revenueData.netForCharity).toLocaleString()} more needed to reach $1,000 goal
            </p>
          )}
        </div>
      </div>

      {/* Priority Checklist */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Monthly Priority Checklist</h3>
        <div className="space-y-3">
          <ChecklistItem
            checked={revenueData.totalRevenue >= 200}
            label="1️⃣ Claude AI Subscription ($200)"
            subtitle="Keep automation running"
          />
          <ChecklistItem
            checked={revenueData.totalRevenue >= 300}
            label="2️⃣ Google Cloud Infrastructure ($100)"
            subtitle="Keep platforms online"
          />
          <ChecklistItem
            checked={revenueData.totalRevenue >= 365}
            label="3️⃣ Break Even Point ($365)"
            subtitle="Cover all expenses"
          />
          <ChecklistItem
            checked={revenueData.netForCharity >= 1000}
            label="4️⃣ Charity Goal ($1,000+)"
            subtitle="FOR THE KIDS! 💙"
          />
        </div>
      </div>
    </div>
  );
};

// Helper Components
const MetricCard: React.FC<{
  title: string;
  value: string;
  subtitle: string;
  color: string;
  icon: string;
}> = ({ title, value, subtitle, color, icon }) => {
  const colorClasses = {
    pink: 'bg-pink-50 border-pink-300',
    purple: 'bg-purple-50 border-purple-300',
    blue: 'bg-blue-50 border-blue-300',
    green: 'bg-green-50 border-green-300',
    orange: 'bg-orange-50 border-orange-300',
    red: 'bg-red-50 border-red-300',
  };

  return (
    <div className={`${colorClasses[color as keyof typeof colorClasses]} border-2 rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-600 mt-1">{subtitle}</p>
    </div>
  );
};

const RevenueItem: React.FC<{ label: string; amount: number }> = ({ label, amount }) => (
  <div className="flex justify-between text-sm">
    <span className="text-gray-600">{label}:</span>
    <span className="font-semibold text-gray-900">${amount.toLocaleString()}</span>
  </div>
);

const ChecklistItem: React.FC<{
  checked: boolean;
  label: string;
  subtitle: string;
}> = ({ checked, label, subtitle }) => (
  <div className="flex items-start space-x-3">
    <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center ${checked ? 'bg-green-500' : 'bg-gray-300'}`}>
      {checked && <span className="text-white text-sm">✓</span>}
    </div>
    <div>
      <p className={`font-medium ${checked ? 'text-green-600' : 'text-gray-700'}`}>{label}</p>
      <p className="text-sm text-gray-500">{subtitle}</p>
    </div>
  </div>
);

export default CharityRevenueDashboard;
