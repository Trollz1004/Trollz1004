import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { KickstarterProject } from '../types';

interface KickstarterChartProps {
  projects: KickstarterProject[];
}

interface ChartDataPoint {
  name: string;
  goal: number;
  pledged: number;
  backers: number;
}

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <p className="font-bold text-gray-800 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            <span className="font-semibold">{entry.name}:</span>{' '}
            {entry.name === 'Backers' 
              ? entry.value?.toLocaleString()
              : `$${entry.value?.toLocaleString()}`
            }
          </p>
        ))}
        {payload[0] && payload[1] && (
          <p className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-200">
            <span className="font-semibold">Progress:</span>{' '}
            {((Number(payload[1].value) / Number(payload[0].value)) * 100).toFixed(1)}%
          </p>
        )}
      </div>
    );
  }
  return null;
};

const KickstarterChart: React.FC<KickstarterChartProps> = ({ projects }) => {
  // Transform data for the chart - limit to 8 projects for readability
  const chartData: ChartDataPoint[] = projects.slice(0, 8).map(project => ({
    name: project.name.length > 20 ? project.name.substring(0, 20) + '...' : project.name,
    goal: project.goal,
    pledged: project.pledged,
    backers: project.backers
  }));

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        Project Funding Overview
      </h2>
      <div className="text-sm text-gray-600 mb-4">
        Showing {chartData.length} of {projects.length} projects
      </div>
      
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="name" 
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          <Bar 
            dataKey="goal" 
            fill="#3b82f6" 
            name="Goal"
            radius={[4, 4, 0, 0]}
          />
          <Bar 
            dataKey="pledged" 
            fill="#10b981" 
            name="Pledged"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default KickstarterChart;
