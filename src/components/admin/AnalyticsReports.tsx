import React from 'react';
import ExecutiveSummaryDashboard from './analytics/ExecutiveSummaryDashboard';

interface Props {
  buildingId: string;
}

export default function AnalyticsReports({ buildingId }: Props) {
  return (
    <div className="space-y-6">
      <ExecutiveSummaryDashboard buildingId={buildingId} />
    </div>
  );
}
