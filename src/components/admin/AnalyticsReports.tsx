import React, { useState } from 'react';
import { BarChart3, TrendingUp, Target } from 'lucide-react';
import ExecutiveSummaryDashboard from './analytics/ExecutiveSummaryDashboard';
import CollectionPerformanceDashboard from './analytics/CollectionPerformanceDashboard';
import CollectionEfficiencyMetrics from './analytics/CollectionEfficiencyMetrics';

interface Props {
  buildingId: string;
}

type TabType = 'executive' | 'collection' | 'efficiency';

export default function AnalyticsReports({ buildingId }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('executive');

  const tabs = [
    { id: 'executive' as TabType, name: 'Executive Summary', icon: Target, description: 'Overall financial health and key metrics' },
    { id: 'collection' as TabType, name: 'Collection Performance', icon: TrendingUp, description: 'Track collection trends and defaulters' },
    { id: 'efficiency' as TabType, name: 'Efficiency Metrics', icon: BarChart3, description: 'Payment timeliness and collection rates' }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Analytics & Reports</h1>
        <p className="text-blue-100">
          Comprehensive financial insights and collection performance metrics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-6 rounded-lg border-2 transition-all text-left ${
                isActive
                  ? 'border-blue-600 bg-blue-50 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-3 rounded-lg ${
                  isActive ? 'bg-blue-600' : 'bg-gray-100'
                }`}>
                  <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                </div>
                <h3 className={`text-lg font-semibold ${
                  isActive ? 'text-blue-900' : 'text-gray-900'
                }`}>
                  {tab.name}
                </h3>
              </div>
              <p className={`text-sm ${isActive ? 'text-blue-700' : 'text-gray-600'}`}>
                {tab.description}
              </p>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6">
          {activeTab === 'executive' && <ExecutiveSummaryDashboard buildingId={buildingId} />}
          {activeTab === 'collection' && <CollectionPerformanceDashboard buildingId={buildingId} />}
          {activeTab === 'efficiency' && <CollectionEfficiencyMetrics buildingId={buildingId} />}
        </div>
      </div>
    </div>
  );
}
