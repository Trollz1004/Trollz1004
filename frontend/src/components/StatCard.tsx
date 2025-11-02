import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  change: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change }) => {
  const isPositive = change.startsWith('+');
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg">
      <h4 className="text-gray-400 text-sm">{title}</h4>
      <p className="text-3xl font-bold">{value}</p>
      <p className={`text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>{change}</p>
    </div>
  );
};

export default StatCard;
