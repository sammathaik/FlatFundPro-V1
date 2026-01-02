import React, { useState, useEffect } from 'react';
import { Calculator, Plus, TrendingUp, Calendar, FileText, Archive } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import CreateForecastWizard from './CreateForecastWizard';
import ViewForecast from './ViewForecast';

interface Forecast {
  id: string;
  forecast_name: string;
  forecast_period: string;
  forecast_year: number;
  total_forecast_amount: number;
  status: string;
  created_at: string;
  created_by: string;
}

interface BudgetPlanningDashboardProps {
  user: any;
  apartments: any[];
}

const BudgetPlanningDashboard: React.FC<BudgetPlanningDashboardProps> = ({ user, apartments }) => {
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedForecast, setSelectedForecast] = useState<string | null>(null);

  useEffect(() => {
    loadForecasts();
  }, [user]);

  const loadForecasts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('budget_forecasts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setForecasts(data || []);
    } catch (error) {
      console.error('Error loading forecasts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-yellow-100 text-yellow-800',
      proposed: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      archived: 'bg-gray-100 text-gray-800'
    };
    return styles[status as keyof typeof styles] || styles.draft;
  };

  const getPeriodLabel = (period: string) => {
    const labels = {
      quarterly: 'Quarterly',
      'semi-annual': 'Semi-Annual',
      annual: 'Annual'
    };
    return labels[period as keyof typeof labels] || period;
  };

  if (showWizard) {
    return (
      <CreateForecastWizard
        user={user}
        apartments={apartments}
        onClose={() => {
          setShowWizard(false);
          loadForecasts();
        }}
      />
    );
  }

  if (selectedForecast) {
    return (
      <ViewForecast
        forecastId={selectedForecast}
        user={user}
        onClose={() => {
          setSelectedForecast(null);
          loadForecasts();
        }}
      />
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <Calculator className="w-8 h-8 text-blue-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Budget Planning</h1>
            <p className="text-gray-600">
              Plan expenses, forecast collections, and build financial confidence for your society
            </p>
          </div>
          <button
            onClick={() => setShowWizard(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create New Forecast
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : forecasts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="inline-flex p-4 bg-blue-50 rounded-full mb-4">
            <TrendingUp className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No forecasts yet</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Start planning your society's financial future
          </p>
          <div className="bg-blue-50 rounded-lg p-6 mb-6 max-w-lg mx-auto text-left">
            <p className="font-medium text-gray-900 mb-3">Budget forecasting helps you:</p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Plan expenses before they occur</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Set realistic maintenance collections</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Build trust through transparency</span>
              </li>
            </ul>
          </div>
          <button
            onClick={() => setShowWizard(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Your First Forecast
          </button>
        </div>
      ) : (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Forecasts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {forecasts.map((forecast) => (
              <div
                key={forecast.id}
                onClick={() => setSelectedForecast(forecast.id)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(forecast.status)}`}>
                      {forecast.status.charAt(0).toUpperCase() + forecast.status.slice(1)}
                    </span>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{forecast.forecast_name}</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{getPeriodLabel(forecast.forecast_period)} - {forecast.forecast_year}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    <span className="font-medium">₹{forecast.total_forecast_amount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                  Created {new Date(forecast.created_at).toLocaleDateString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetPlanningDashboard;
