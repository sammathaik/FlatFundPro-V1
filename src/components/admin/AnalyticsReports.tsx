import React, { useState } from 'react';
import { BarChart3, Shield, TrendingUp, Users, Clock, FileText, AlertTriangle, Target } from 'lucide-react';
import ExecutiveSummaryDashboard from './analytics/ExecutiveSummaryDashboard';
import CollectionPerformanceDashboard from './analytics/CollectionPerformanceDashboard';
import FraudPatternAnalysis from './analytics/FraudPatternAnalysis';
import FlatPaymentHistory from './analytics/FlatPaymentHistory';
import CollectionEfficiencyMetrics from './analytics/CollectionEfficiencyMetrics';
import TimeBasedAnalytics from './analytics/TimeBasedAnalytics';
import SecurityComplianceReports from './analytics/SecurityComplianceReports';
import OccupantEngagementAnalytics from './analytics/OccupantEngagementAnalytics';

interface Props {
  buildingId: string;
}

type TabType = 'executive' | 'collection' | 'fraud' | 'flats' | 'efficiency' | 'time' | 'security' | 'engagement';

export default function AnalyticsReports({ buildingId }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('executive');

  const tabs = [
    { id: 'executive' as TabType, name: 'Executive Summary', icon: Target },
    { id: 'collection' as TabType, name: 'Collection Performance', icon: TrendingUp },
    { id: 'fraud' as TabType, name: 'Fraud Analysis', icon: AlertTriangle },
    { id: 'flats' as TabType, name: 'Flat History', icon: FileText },
    { id: 'efficiency' as TabType, name: 'Efficiency Metrics', icon: BarChart3 },
    { id: 'time' as TabType, name: 'Time Analytics', icon: Clock },
    { id: 'security' as TabType, name: 'Security & Audit', icon: Shield },
    { id: 'engagement' as TabType, name: 'Engagement', icon: Users }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
        <p className="text-gray-600 mt-2">
          Comprehensive insights into your building's financial performance and operations
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex space-x-1 p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="hidden sm:inline">{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'executive' && <ExecutiveSummaryDashboard buildingId={buildingId} />}
          {activeTab === 'collection' && <CollectionPerformanceDashboard buildingId={buildingId} />}
          {activeTab === 'fraud' && <FraudPatternAnalysis buildingId={buildingId} />}
          {activeTab === 'flats' && <FlatPaymentHistory buildingId={buildingId} />}
          {activeTab === 'efficiency' && <CollectionEfficiencyMetrics buildingId={buildingId} />}
          {activeTab === 'time' && <TimeBasedAnalytics buildingId={buildingId} />}
          {activeTab === 'security' && <SecurityComplianceReports buildingId={buildingId} />}
          {activeTab === 'engagement' && <OccupantEngagementAnalytics buildingId={buildingId} />}
        </div>
      </div>
    </div>
  );
}
