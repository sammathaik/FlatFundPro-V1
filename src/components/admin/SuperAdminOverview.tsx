import { useState, useEffect } from 'react';
import { Building2, Users, FileText, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function SuperAdminOverview() {
  const [stats, setStats] = useState({
    apartments: 0,
    admins: 0,
    totalPayments: 0,
    pendingPayments: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const [apartmentsResult, adminsResult, paymentsResult, pendingResult] = await Promise.all([
        supabase.from('apartments').select('id', { count: 'exact', head: true }),
        supabase.from('admins').select('id', { count: 'exact', head: true }),
        supabase.from('payment_submissions').select('id', { count: 'exact', head: true }),
        supabase.from('payment_submissions').select('id', { count: 'exact', head: true }).eq('status', 'Received'),
      ]);

      setStats({
        apartments: apartmentsResult.count || 0,
        admins: adminsResult.count || 0,
        totalPayments: paymentsResult.count || 0,
        pendingPayments: pendingResult.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  const statCards = [
    { label: 'Total Apartments', value: stats.apartments, icon: Building2, color: 'blue' },
    { label: 'Active Admins', value: stats.admins, icon: Users, color: 'green' },
    { label: 'Total Payments', value: stats.totalPayments, icon: FileText, color: 'amber' },
    { label: 'Pending Review', value: stats.pendingPayments, icon: TrendingUp, color: 'orange' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: 'bg-blue-100 text-blue-600',
            green: 'bg-green-100 text-green-600',
            amber: 'bg-amber-100 text-amber-600',
            orange: 'bg-orange-100 text-orange-600',
          }[stat.color];

          return (
            <div key={index} className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${colorClasses}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Welcome to FlatFund Pro</h3>
        <p className="text-gray-700 mb-4">
          You have full administrative access to manage all apartments, admins, and view all payment submissions.
        </p>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start">
            <span className="text-amber-600 mr-2">•</span>
            <span><strong>Apartments:</strong> Create and manage apartment societies</span>
          </li>
          <li className="flex items-start">
            <span className="text-amber-600 mr-2">•</span>
            <span><strong>Admins:</strong> Assign one admin per apartment with unique credentials</span>
          </li>
          <li className="flex items-start">
            <span className="text-amber-600 mr-2">•</span>
            <span><strong>Payments:</strong> View all payment submissions (read-only)</span>
          </li>
          <li className="flex items-start">
            <span className="text-amber-600 mr-2">•</span>
            <span><strong>Export:</strong> Download CSV reports for audits and meetings</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
