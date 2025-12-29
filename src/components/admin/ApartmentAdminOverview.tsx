import { useState, useEffect } from 'react';
import {
  Building2,
  Home,
  FileText,
  Clock,
  Shield,
  FileSearch,
  TrendingUp,
  Mail,
  Users,
  QrCode,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  BarChart3,
  Info,
  Activity
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

function Tooltip({ text, children }: TooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {show && (
        <div className="absolute z-50 w-64 p-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg -top-2 left-full ml-2 pointer-events-none">
          {text}
          <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45 -left-1 top-3" />
        </div>
      )}
    </div>
  );
}

export default function ApartmentAdminOverview() {
  const { adminData } = useAuth();
  const [stats, setStats] = useState({
    buildings: 0,
    flats: 0,
    totalPayments: 0,
    pendingPayments: 0,
    approvedPayments: 0,
    fraudDetected: 0,
    classifiedDocuments: 0,
    occupants: 0,
    activeCollections: 0,
  });
  const [apartmentName, setApartmentName] = useState('');
  const [loading, setLoading] = useState(true);

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
      setLoading(true);

      // Get building IDs for this apartment
      const { data: buildings } = await supabase
        .from('buildings_blocks_phases')
        .select('id')
        .eq('apartment_id', adminData.apartment_id);

      const buildingIds = buildings?.map((b) => b.id) || [];

      const [
        buildingsResult,
        flatsResult,
        paymentsResult,
        pendingResult,
        approvedResult,
        fraudResult,
        classifiedResult,
        occupantsResult,
        collectionsResult,
      ] = await Promise.all([
        supabase
          .from('buildings_blocks_phases')
          .select('id', { count: 'exact', head: true })
          .eq('apartment_id', adminData.apartment_id),
        supabase
          .from('flat_numbers')
          .select('id', { count: 'exact', head: true })
          .in('block_id', buildingIds.length > 0 ? buildingIds : [-1]),
        supabase
          .from('payment_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('apartment_id', adminData.apartment_id),
        supabase
          .from('payment_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('apartment_id', adminData.apartment_id)
          .eq('status', 'Received'),
        supabase
          .from('payment_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('apartment_id', adminData.apartment_id)
          .eq('status', 'Approved'),
        supabase
          .from('payment_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('apartment_id', adminData.apartment_id)
          .eq('fraud_detected', true),
        supabase
          .from('payment_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('apartment_id', adminData.apartment_id)
          .not('document_type', 'is', null),
        supabase
          .from('flat_email_mappings')
          .select('id', { count: 'exact', head: true })
          .in('flat_id', buildingIds.length > 0 ? buildingIds : [-1]),
        supabase
          .from('expected_collections')
          .select('id', { count: 'exact', head: true })
          .eq('apartment_id', adminData.apartment_id)
          .eq('is_active', true),
      ]);

      setStats({
        buildings: buildingsResult.count || 0,
        flats: flatsResult.count || 0,
        totalPayments: paymentsResult.count || 0,
        pendingPayments: pendingResult.count || 0,
        approvedPayments: approvedResult.count || 0,
        fraudDetected: fraudResult.count || 0,
        classifiedDocuments: classifiedResult.count || 0,
        occupants: occupantsResult.count || 0,
        activeCollections: collectionsResult.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }

  const primaryStats = [
    {
      label: 'Buildings/Blocks',
      value: stats.buildings,
      icon: Building2,
      color: 'blue',
      tooltip: 'Total number of buildings, blocks, or phases in your apartment complex'
    },
    {
      label: 'Total Flats',
      value: stats.flats,
      icon: Home,
      color: 'green',
      tooltip: 'Total number of flat units across all buildings'
    },
    {
      label: 'Total Payments',
      value: stats.totalPayments,
      icon: FileText,
      color: 'purple',
      tooltip: 'Total payment submissions received across all time'
    },
    {
      label: 'Pending Review',
      value: stats.pendingPayments,
      icon: Clock,
      color: 'orange',
      tooltip: 'Payments that need your review and approval'
    },
  ];

  const aiFeatureStats = [
    {
      label: 'AI Classified',
      value: stats.classifiedDocuments,
      icon: FileSearch,
      color: 'indigo',
      tooltip: 'Documents automatically classified by AI (UPI, bank transfer, cheque, etc.)'
    },
    {
      label: 'Fraud Alerts',
      value: stats.fraudDetected,
      icon: Shield,
      color: 'red',
      tooltip: 'Payments flagged by AI fraud detection for potential issues'
    },
    {
      label: 'Approved',
      value: stats.approvedPayments,
      icon: CheckCircle,
      color: 'emerald',
      tooltip: 'Payments that have been reviewed and approved'
    },
    {
      label: 'Active Collections',
      value: stats.activeCollections,
      icon: DollarSign,
      color: 'amber',
      tooltip: 'Currently active collection types (maintenance, corpus fund, etc.)'
    },
  ];

  const managementStats = [
    {
      label: 'Registered Occupants',
      value: stats.occupants,
      icon: Users,
      color: 'teal',
      tooltip: 'Occupants who can view their payment history and make submissions'
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
    orange: 'bg-orange-100 text-orange-600',
    purple: 'bg-purple-100 text-purple-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    red: 'bg-red-100 text-red-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    teal: 'bg-teal-100 text-teal-600',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
        <p className="text-gray-600 mt-1">{apartmentName}</p>
      </div>

      {/* Primary Stats */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Core Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {primaryStats.map((stat, index) => {
            const Icon = stat.icon;

            return (
              <div key={index} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                      <Tooltip text={stat.tooltip}>
                        <Info className="w-4 h-4 text-gray-400" />
                      </Tooltip>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Features Stats */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          AI-Powered Features
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {aiFeatureStats.map((stat, index) => {
            const Icon = stat.icon;

            return (
              <div key={index} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                      <Tooltip text={stat.tooltip}>
                        <Info className="w-4 h-4 text-gray-400" />
                      </Tooltip>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Management Stats */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          User Management
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {managementStats.map((stat, index) => {
            const Icon = stat.icon;

            return (
              <div key={index} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                      <Tooltip text={stat.tooltip}>
                        <Info className="w-4 h-4 text-gray-400" />
                      </Tooltip>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Features */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Activity className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">AI-Powered Automation</h3>
          </div>
          <ul className="space-y-3 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <FileSearch className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Document Classification:</strong> AI automatically identifies payment types (UPI, bank transfer, cheque, cash)
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Fraud Detection:</strong> Advanced AI analyzes images and text to detect duplicate, altered, or suspicious payments
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Mail className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Smart Reminders:</strong> Automated email reminders for pending payments based on expected collections
              </div>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Payment Acknowledgment:</strong> Automatic email confirmations when payments are approved
              </div>
            </li>
          </ul>
        </div>

        {/* Admin Capabilities */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Management Tools</h3>
          </div>
          <ul className="space-y-3 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <Building2 className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Buildings & Flats:</strong> Comprehensive management of buildings, blocks, phases, and flat numbers
              </div>
            </li>
            <li className="flex items-start gap-2">
              <DollarSign className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Collection Management:</strong> Set up multiple collection types with flexible frequencies (monthly, quarterly, etc.)
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Users className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Occupant Portal:</strong> Give residents secure access to view their payment history and make submissions
              </div>
            </li>
            <li className="flex items-start gap-2">
              <QrCode className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>QR Codes:</strong> Generate unique QR codes for each flat for easy payment submission
              </div>
            </li>
            <li className="flex items-start gap-2">
              <BarChart3 className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Advanced Analytics:</strong> Executive summaries, collection performance, fraud patterns, and time-based analytics
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Quick Actions Guide */}
      <div className="bg-white border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
            <Info className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Getting Started</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <p className="font-semibold text-gray-900 mb-2">Essential Setup:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Add buildings/blocks in Building Management</li>
                  <li>Configure expected collections for each type</li>
                  <li>Register occupants and assign flats</li>
                  <li>Generate QR codes for easy submissions</li>
                </ol>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-2">Daily Operations:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Review pending payments in Payment Management</li>
                  <li>Check AI fraud alerts and classifications</li>
                  <li>Monitor collection performance in Analytics</li>
                  <li>Export reports for meetings and audits</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {stats.fraudDetected > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-red-900 mb-2">Action Required</h3>
              <p className="text-red-800">
                You have <strong>{stats.fraudDetected} payment{stats.fraudDetected !== 1 ? 's' : ''}</strong> flagged by fraud detection.
                Please review these submissions in the Payment Management section to verify authenticity.
              </p>
            </div>
          </div>
        </div>
      )}

      {stats.pendingPayments > 0 && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <Clock className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-orange-900 mb-2">Pending Reviews</h3>
              <p className="text-orange-800">
                You have <strong>{stats.pendingPayments} payment{stats.pendingPayments !== 1 ? 's' : ''}</strong> waiting for your review.
                Navigate to Payment Management to approve or request corrections.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
