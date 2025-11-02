import React from 'react';

const users = [
    { avatar: '', email: 'user1@example.com', plan: 'Premium', score: 85 },
    { avatar: '', email: 'user2@example.com', plan: 'Basic', score: 60 },
    { avatar: '', email: 'user3@example.com', plan: 'VIP', score: 95 },
];

interface PlanBadgeProps {
    plan: 'Premium' | 'Basic' | 'VIP';
}

const PlanBadge: React.FC<PlanBadgeProps> = ({plan}) => {
    const color = {
        'Premium': 'bg-purple-500',
        'Basic': 'bg-blue-500',
        'VIP': 'bg-yellow-500',
    }[plan];
    return <span className={`px-2 py-1 rounded-full text-xs ${color}`}>{plan}</span>
}

const RecentUsersTable = () => {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg">
      <h3 className="text-xl font-bold mb-4">Recent Users</h3>
      <table className="w-full text-left">
        <thead>
          <tr>
            <th className="pb-2">User</th>
            <th className="pb-2">Plan</th>
            <th className="pb-2">Trust Score</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => (
            <tr key={index} className="border-b border-gray-700">
              <td className="py-2">{user.email}</td>
              <td className="py-2"><PlanBadge plan={user.plan as 'Premium' | 'Basic' | 'VIP'} /></td>
              <td className="py-2">{user.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RecentUsersTable;
