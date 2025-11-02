import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Day 1', users: 400 },
  { name: 'Day 2', users: 600 },
  { name: 'Day 3', users: 500 },
  { name: 'Day 4', users: 800 },
  { name: 'Day 5', users: 700 },
  { name: 'Day 6', users: 900 },
  { name: 'Day 7', users: 1200 },
];

const UserGrowthChart = () => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
        <YAxis stroke="rgba(255,255,255,0.5)" />
        <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} />
        <Line type="monotone" dataKey="users" stroke="#8884d8" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default UserGrowthChart;
