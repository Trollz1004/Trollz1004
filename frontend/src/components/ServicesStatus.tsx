import React from 'react';

interface ServiceStatusProps {
    name: string;
    status: 'ok' | 'error';
}

const ServiceStatus: React.FC<ServiceStatusProps> = ({ name, status }) => {
    const isOk = status === 'ok';
    return (
        <div className="flex justify-between items-center mb-2">
            <span>{name}</span>
            <span className={`px-2 py-1 rounded-full text-xs ${isOk ? 'bg-green-500' : 'bg-red-500'}`}>{status}</span>
        </div>
    )
}

const ServicesStatus = () => {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg">
      <h3 className="text-xl font-bold mb-4">Services Status</h3>
      <ServiceStatus name="Gemini AI" status="ok" />
      <ServiceStatus name="Square Payments" status="ok" />
      <ServiceStatus name="Database" status="ok" />
    </div>
  );
};

export default ServicesStatus;
