import { useState, useEffect } from 'react';
import { Building2, Home, FileText, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function ApartmentAdminOverview() {
  const { adminData } = useAuth();
  const [stats, setStats] = useState({
    buildings: 0,
    flats: 0,
    totalPayments: 0,
    pendingPayments: 0,
  });
  const [apartmentName, setApartmentName] = useState('');

  useEffect(() => {
    if (adminData?.apartment_id) {
      loadStats();
      loadApartmentName();
    }
  }, [adminData]);

  async function loadApartmentName() {
    if (!adminData?.apartment_id) return;

    const { data } = await supabase
      .from('apartments')
      .select('apartment_name')
      .eq('id', adminData.apartment_id)
      .maybeSingle();

    if (data) {
      setApartmentName(data.apartment_name);
    }
  }

  async function loadStats() {
    if (!adminData?.apartment_id) return;

    try {
      const [buildingsResult, flatsResult, paymentsResult, pendingResult] = await Promise.all([
        supabase
          .from('buildings_blocks_phases')
          .select('id', { count: 'exact', head: true })
          .eq('apartment_id', adminData.apartment_id),
        supabase
          .from('flat_numbers')
          .select('id', { count: 'exact', head: true })
          .in(
            'block_id',
            (await supabase
              .from('buildings_blocks_phases')
              .select('id')
              .eq('apartment_id', adminData.apartment_id)).data?.map((b) => b.id) || []
          ),
        supabase
          .from('payment_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('apartment_id', adminData.apartment_id),
        supabase
          .from('payment_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('apartment_id', adminData.apartment_id)
          .eq('status', 'Received'),
      ]);

      setStats({
        buildings: buildingsResult.count || 0,
        flats: flatsResult.count || 0,
        totalPayments: paymentsResult.count || 0,
        pendingPayments: pendingResult.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  const statCards = [
    { label: 'Buildings/Blocks', value: stats.buildings, icon: Building2, color: 'blue' },
    { label: 'Total Flats', value: stats.flats, icon: Home, color: 'green' },
    { label: 'Total Payments', value: stats.totalPayments, icon: FileText, color: 'amber' },
    { label: 'Pending Review', value: stats.pendingPayments, icon: Clock, color: 'orange' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
        <p className="text-gray-600 mt-1">{apartmentName}</p>
      </div>

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
        <h3 className="text-lg font-bold text-gray-900 mb-2">Admin Capabilities</h3>
        <p className="text-gray-700 mb-4">
          As the administrator for {apartmentName}, you can manage all aspects of your apartment's maintenance portal.
        </p>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start">
            <span className="text-amber-600 mr-2">•</span>
            <span><strong>Buildings & Flats:</strong> Add, edit, or remove buildings/blocks/phases and flat numbers</span>
          </li>
          <li className="flex items-start">
            <span className="text-amber-600 mr-2">•</span>
            <span><strong>Payment Submissions:</strong> Review, approve, and manage payment proofs from residents</span>
          </li>
          <li className="flex items-start">
            <span className="text-amber-600 mr-2">•</span>
            <span><strong>Status Updates:</strong> Change payment status from Received → Reviewed → Approved</span>
          </li>
          <li className="flex items-start">
            <span className="text-amber-600 mr-2">•</span>
            <span><strong>Export Data:</strong> Download payment records for meetings and audits</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
