import { useState, useEffect } from 'react';
import { Building2, Users, Home, UserCheck, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function SuperAdminOverview() {
  const [stats, setStats] = useState({
    apartments: 0,
    admins: 0,
    buildings: 0,
    flats: 0,
    occupants: 0,
    activeCollections: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const [apartmentsResult, adminsResult, buildingsResult, flatsResult, occupantsResult, collectionsResult] = await Promise.all([
        supabase.from('apartments').select('id', { count: 'exact', head: true }),
        supabase.from('admins').select('id', { count: 'exact', head: true }),
        supabase.from('building_block_phase').select('id', { count: 'exact', head: true }),
        supabase.from('flat_numbers').select('id', { count: 'exact', head: true }),
        supabase.from('flat_email_mappings').select('id', { count: 'exact', head: true }),
        supabase.from('expected_collections').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ]);

      setStats({
        apartments: apartmentsResult.count || 0,
        admins: adminsResult.count || 0,
        buildings: buildingsResult.count || 0,
        flats: flatsResult.count || 0,
        occupants: occupantsResult.count || 0,
        activeCollections: collectionsResult.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  const statCards = [
    { label: 'Total Apartments', value: stats.apartments, icon: Building2, color: 'blue' },
    { label: 'Active Admins', value: stats.admins, icon: Users, color: 'green' },
    { label: 'Buildings/Blocks', value: stats.buildings, icon: Home, color: 'purple' },
    { label: 'Total Flats', value: stats.flats, icon: Home, color: 'indigo' },
    { label: 'Registered Occupants', value: stats.occupants, icon: UserCheck, color: 'teal' },
    { label: 'Active Collections', value: stats.activeCollections, icon: DollarSign, color: 'amber' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">System Overview</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: 'bg-blue-100 text-blue-600',
            green: 'bg-green-100 text-green-600',
            amber: 'bg-amber-100 text-amber-600',
            orange: 'bg-orange-100 text-orange-600',
            purple: 'bg-purple-100 text-purple-600',
            indigo: 'bg-indigo-100 text-indigo-600',
            teal: 'bg-teal-100 text-teal-600',
          }[stat.color];

          return (
            <div key={index} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Super Admin Capabilities</h3>
          <p className="text-gray-700 mb-4">
            You have full system access to manage the entire FlatFund Pro platform.
          </p>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="text-amber-600 mr-2">•</span>
              <span><strong>Apartments:</strong> Create and manage apartment societies</span>
            </li>
            <li className="flex items-start">
              <span className="text-amber-600 mr-2">•</span>
              <span><strong>Admins:</strong> Assign and manage apartment administrators</span>
            </li>
            <li className="flex items-start">
              <span className="text-amber-600 mr-2">•</span>
              <span><strong>Lead Generation:</strong> Track and manage new apartment inquiries</span>
            </li>
            <li className="flex items-start">
              <span className="text-amber-600 mr-2">•</span>
              <span><strong>System Monitoring:</strong> Monitor platform usage and activity</span>
            </li>
          </ul>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Quick Insights</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-blue-100">
              <span className="text-gray-700 font-medium">Avg Flats per Building</span>
              <span className="text-lg font-bold text-blue-900">
                {stats.buildings > 0 ? Math.round(stats.flats / stats.buildings) : 0}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-blue-100">
              <span className="text-gray-700 font-medium">Occupancy Coverage</span>
              <span className="text-lg font-bold text-blue-900">
                {stats.flats > 0 ? Math.round((stats.occupants / stats.flats) * 100) : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-blue-100">
              <span className="text-gray-700 font-medium">Avg Collections/Apartment</span>
              <span className="text-lg font-bold text-blue-900">
                {stats.apartments > 0 ? Math.round(stats.activeCollections / stats.apartments) : 0}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-700 font-medium">Buildings per Apartment</span>
              <span className="text-lg font-bold text-blue-900">
                {stats.apartments > 0 ? Math.round(stats.buildings / stats.apartments) : 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
