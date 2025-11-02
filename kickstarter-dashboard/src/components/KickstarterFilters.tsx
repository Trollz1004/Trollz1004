import React from 'react';
import { FilterState } from '../types';

interface KickstarterFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onClear: () => void;
}

const KickstarterFilters: React.FC<KickstarterFiltersProps> = ({ 
  filters, 
  onFilterChange, 
  onClear 
}) => {
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, nameFilter: e.target.value });
  };

  const handleMinGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, minGoal: e.target.value });
  };

  const handleMaxGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, maxGoal: e.target.value });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Filter Projects</h2>
        <button
          onClick={onClear}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          Clear Filters
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label 
            htmlFor="nameFilter" 
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Project Name
          </label>
          <input
            id="nameFilter"
            type="text"
            value={filters.nameFilter}
            onChange={handleNameChange}
            placeholder="Search by name..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label 
            htmlFor="minGoal" 
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Min Goal Amount ($)
          </label>
          <input
            id="minGoal"
            type="number"
            value={filters.minGoal}
            onChange={handleMinGoalChange}
            placeholder="0"
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label 
            htmlFor="maxGoal" 
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Max Goal Amount ($)
          </label>
          <input
            id="maxGoal"
            type="number"
            value={filters.maxGoal}
            onChange={handleMaxGoalChange}
            placeholder="No limit"
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
};

export default KickstarterFilters;
