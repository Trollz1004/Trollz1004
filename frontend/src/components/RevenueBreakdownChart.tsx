import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Basic', value: 400 },
  { name: 'Premium', value: 300 },
  { name: 'VIP', value: 200 },
];
const COLORS = ['#8884d8', '#82ca9d', '#ffc658'];

const RevenueBreakdownChart = () => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default RevenueBreakdownChart;
