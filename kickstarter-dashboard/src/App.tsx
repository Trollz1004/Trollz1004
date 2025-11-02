import { useState, useMemo } from 'react';
import KickstarterFilters from './components/KickstarterFilters';
import KickstarterChart from './components/KickstarterChart';
import KickstarterTable from './components/KickstarterTable';
import { mockProjects } from './data/mockData';
import { FilterState } from './types';

function App() {
  // State management for filters
  const [filters, setFilters] = useState<FilterState>({
    nameFilter: '',
    minGoal: '',
    maxGoal: ''
  });

  // Efficient filtering logic using useMemo
  const filteredProjects = useMemo(() => {
    return mockProjects.filter(project => {
      // Name filter (case-insensitive)
      const matchesName = filters.nameFilter === '' || 
        project.name.toLowerCase().includes(filters.nameFilter.toLowerCase()) ||
        project.creator.toLowerCase().includes(filters.nameFilter.toLowerCase());

      // Min goal filter
      const minGoal = filters.minGoal === '' ? 0 : parseFloat(filters.minGoal);
      const matchesMinGoal = project.goal >= minGoal;

      // Max goal filter
      const maxGoal = filters.maxGoal === '' ? Infinity : parseFloat(filters.maxGoal);
      const matchesMaxGoal = project.goal <= maxGoal;

      return matchesName && matchesMinGoal && matchesMaxGoal;
    });
  }, [filters, mockProjects]);

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({
      nameFilter: '',
      minGoal: '',
      maxGoal: ''
    });
  };

  // Statistics for the header
  const stats = useMemo(() => {
    const totalPledged = filteredProjects.reduce((sum, p) => sum + p.pledged, 0);
    const totalBackers = filteredProjects.reduce((sum, p) => sum + p.backers, 0);
    const successfulProjects = filteredProjects.filter(p => p.pledged >= p.goal).length;

    return {
      totalProjects: filteredProjects.length,
      totalPledged,
      totalBackers,
      successfulProjects,
      successRate: filteredProjects.length > 0 
        ? Math.round((successfulProjects / filteredProjects.length) * 100)
        : 0
    };
  }, [filteredProjects]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Kickstarter Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Production-ready multi-platform dashboard
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-500">Total Projects</div>
                <div className="text-2xl font-bold text-gray-900">{stats.totalProjects}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Success Rate</div>
                <div className="text-2xl font-bold text-green-600">{stats.successRate}%</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Pledged</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  ${stats.totalPledged.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Backers</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {stats.totalBackers.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Successful</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {stats.successfulProjects} / {stats.totalProjects}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <KickstarterFilters
          filters={filters}
          onFilterChange={setFilters}
          onClear={handleClearFilters}
        />

        {/* Chart */}
        <KickstarterChart projects={filteredProjects} />

        {/* Table */}
        <KickstarterTable projects={filteredProjects} />
      </main>

      {/* Footer */}
      <footer className="bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            © 2024 Kickstarter Dashboard. Built with React, TypeScript, and Tailwind CSS.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
