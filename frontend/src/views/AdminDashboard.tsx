import React from 'react';
import StatCard from '../components/StatCard';
import UserGrowthChart from '../components/UserGrowthChart';
import RevenueBreakdownChart from '../components/RevenueBreakdownChart';
import ServicesStatus from '../components/ServicesStatus';
import RecentUsersTable from '../components/RecentUsersTable';

const AdminDashboard = () => {
  return (
    <div className="flex">
      <aside className="w-64 bg-gray-800 p-4">
        <h1 className="text-2xl font-bold mb-8">YouAndINotAI</h1>
        <nav>
          <ul>
            <li className="mb-4"><a href="#" className="text-lg">Dashboard</a></li>
            <li className="mb-4"><a href="#" className="text-lg">Users</a></li>
            <li className="mb-4"><a href="#" className="text-lg">DAO</a></li>
            <li className="mb-4"><a href="#" className="text-lg">Kickstarter</a></li>
            <li className="mb-4"><a href="#" className="text-lg">Shop</a></li>
          </ul>
        </nav>
      </aside>
      <main className="flex-1 p-8">
        <h2 className="text-3xl font-display mb-8">Admin Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Users" value="10,240" change="+5.2%" />
          <StatCard title="Monthly Revenue" value="$12,860" change="+2.1%" />
          <StatCard title="Active Matches" value="4,320" change="-1.5%" />
          <StatCard title="Engagement Rate" value="68%" change="+3.8%" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-4">User Growth</h3>
            <UserGrowthChart />
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-4">Revenue Breakdown</h3>
            <RevenueBreakdownChart />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ServicesStatus />
            <RecentUsersTable />
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
