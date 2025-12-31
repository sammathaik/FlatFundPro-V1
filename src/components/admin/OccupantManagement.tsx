import React, { useState, useEffect, useMemo } from 'react';
import { Users, Edit2, Trash2, Plus, ChevronDown, ChevronUp, X, Save, Building, Mail, Phone, User, Home, Download, Search, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  maintenance: 'Maintenance',
  contingency: 'Contingency',
  emergency: 'Emergency',
};

interface Occupant {
  id: string;
  apartment_id: string;
  apartment_name: string;
  block_id: string;
  block_name: string;
  block_type: string;
  flat_id: string;
  flat_number: string;
  email: string;
  mobile: string | null;
  name: string | null;
  occupant_name: string | null;
  occupant_type: 'Owner' | 'Tenant';
  whatsapp_opt_in: boolean | null;
  created_at: string;
  updated_at: string;
}

interface BlockGroup {
  block_id: string;
  block_name: string;
  block_type: string;
  apartment_name: string;
  occupants: Occupant[];
}

interface Payment {
  id: string;
  name: string;
  payment_amount: number | null;
  payment_date: string | null;
  payment_type: string;
  payment_quarter: string;
  created_at: string;
  status: string;
}

interface EditModalData {
  occupant: Occupant;
  isNew: boolean;
}

export default function OccupantManagement() {
  const [occupants, setOccupants] = useState<Occupant[]>([]);
  const [payments, setPayments] = useState<Record<string, Payment[]>>({});
  const [expandedFlats, setExpandedFlats] = useState<Set<string>>(new Set());
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<EditModalData | null>(null);
  const [apartments, setApartments] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [flats, setFlats] = useState<any[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
    loadApartments();
  }, []);

  const loadApartments = async () => {
    const { data } = await supabase
      .from('apartments')
      .select('*')
      .eq('status', 'active')
      .order('apartment_name');
    setApartments(data || []);
  };

  const loadBlocks = async (apartmentId: string) => {
    const { data } = await supabase
      .from('buildings_blocks_phases')
      .select('*')
      .eq('apartment_id', apartmentId)
      .order('block_name');
    setBlocks(data || []);
  };

  const loadFlats = async (blockId: string) => {
    const { data } = await supabase
      .from('flat_numbers')
      .select('*')
      .eq('block_id', blockId)
      .order('flat_number');
    setFlats(data || []);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('flat_email_mappings')
        .select(`
          id,
          apartment_id,
          block_id,
          flat_id,
          email,
          mobile,
          name,
          occupant_type,
          whatsapp_opt_in,
          created_at,
          updated_at,
          apartments!inner(apartment_name),
          buildings_blocks_phases!inner(block_name, type),
          flat_numbers!inner(flat_number)
        `)
        .order('apartments(apartment_name)', { ascending: true });

      if (error) throw error;

      const flatIds = (data || []).map((item: any) => item.flat_id);

      const { data: latestPayments } = await supabase
        .from('payment_submissions')
        .select('flat_id, name, contact_number, created_at')
        .in('flat_id', flatIds)
        .order('created_at', { ascending: false });

      const nameByFlatId: Record<string, string> = {};
      const mobileByFlatId: Record<string, string> = {};
      latestPayments?.forEach((payment: any) => {
        if (!nameByFlatId[payment.flat_id]) {
          nameByFlatId[payment.flat_id] = payment.name;
        }
        if (!mobileByFlatId[payment.flat_id] && payment.contact_number) {
          mobileByFlatId[payment.flat_id] = payment.contact_number;
        }
      });

      const formattedOccupants: Occupant[] = (data || []).map((item: any) => ({
        id: item.id,
        apartment_id: item.apartment_id,
        apartment_name: item.apartments.apartment_name,
        block_id: item.block_id,
        block_name: item.buildings_blocks_phases.block_name,
        block_type: item.buildings_blocks_phases.type,
        flat_id: item.flat_id,
        flat_number: item.flat_numbers.flat_number,
        email: item.email,
        mobile: item.mobile || mobileByFlatId[item.flat_id] || null,
        name: item.name,
        occupant_name: nameByFlatId[item.flat_id] || null,
        occupant_type: item.occupant_type,
        whatsapp_opt_in: item.whatsapp_opt_in,
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));

      const sortedOccupants = formattedOccupants.sort((a, b) => {
        if (a.apartment_name !== b.apartment_name) {
          return a.apartment_name.localeCompare(b.apartment_name);
        }
        if (a.block_name !== b.block_name) {
          return a.block_name.localeCompare(b.block_name);
        }
        return a.flat_number.localeCompare(b.flat_number, undefined, { numeric: true });
      });

      setOccupants(sortedOccupants);
    } catch (error) {
      console.error('Error loading occupants:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentsForFlat = async (flatId: string) => {
    if (payments[flatId]) return;

    try {
      const { data, error } = await supabase
        .from('payment_submissions')
        .select('id, name, payment_amount, payment_date, payment_type, payment_quarter, created_at, status')
        .eq('flat_id', flatId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPayments(prev => ({
        ...prev,
        [flatId]: data || [],
      }));
    } catch (error) {
      console.error('Error loading payments:', error);
    }
  };

  const toggleFlat = async (flatId: string) => {
    const newExpanded = new Set(expandedFlats);
    if (newExpanded.has(flatId)) {
      newExpanded.delete(flatId);
    } else {
      newExpanded.add(flatId);
      await loadPaymentsForFlat(flatId);
    }
    setExpandedFlats(newExpanded);
  };

  const toggleBlock = (blockId: string) => {
    const newExpanded = new Set(expandedBlocks);
    if (newExpanded.has(blockId)) {
      newExpanded.delete(blockId);
    } else {
      newExpanded.add(blockId);
    }
    setExpandedBlocks(newExpanded);
  };

  const maskMobile = (mobile: string | null): string => {
    if (!mobile || mobile.length < 4) return 'Not provided';
    const lastFour = mobile.slice(-4);
    const maskedPart = 'X'.repeat(mobile.length - 4);
    return maskedPart + lastFour;
  };

  const handleEdit = (occupant: Occupant) => {
    setEditModal({ occupant, isNew: false });
    loadBlocks(occupant.apartment_id);
    loadFlats(occupant.block_id);
  };

  const handleAdd = () => {
    setEditModal({
      occupant: {
        id: '',
        apartment_id: apartments[0]?.id || '',
        apartment_name: '',
        block_id: '',
        block_name: '',
        block_type: '',
        flat_id: '',
        flat_number: '',
        email: '',
        mobile: null,
        name: null,
        occupant_name: null,
        occupant_type: 'Owner',
        whatsapp_opt_in: null,
        created_at: '',
        updated_at: '',
      },
      isNew: true,
    });
    if (apartments[0]?.id) {
      loadBlocks(apartments[0].id);
    }
  };

  const handleSave = async () => {
    if (!editModal) return;

    try {
      const { occupant, isNew } = editModal;

      if (isNew) {
        const { error } = await supabase
          .from('flat_email_mappings')
          .insert({
            apartment_id: occupant.apartment_id,
            block_id: occupant.block_id,
            flat_id: occupant.flat_id,
            email: occupant.email.toLowerCase().trim(),
            mobile: occupant.mobile?.trim() || null,
            name: occupant.name?.trim() || null,
            occupant_type: occupant.occupant_type,
          });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('flat_email_mappings')
          .update({
            email: occupant.email.toLowerCase().trim(),
            mobile: occupant.mobile?.trim() || null,
            name: occupant.name?.trim() || null,
            occupant_type: occupant.occupant_type,
          })
          .eq('id', occupant.id);

        if (error) throw error;
      }

      setEditModal(null);
      loadData();
    } catch (error: any) {
      console.error('Error saving occupant:', error);
      alert(error.message || 'Failed to save occupant');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('flat_email_mappings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setDeleteConfirm(null);
      loadData();
    } catch (error: any) {
      console.error('Error deleting occupant:', error);
      alert(error.message || 'Failed to delete occupant');
    }
  };

  const filteredOccupants = useMemo(() => {
    if (!searchTerm.trim()) return occupants;

    const searchLower = searchTerm.toLowerCase().trim();
    return occupants.filter(
      (occupant) =>
        occupant.apartment_name.toLowerCase().includes(searchLower) ||
        occupant.block_name.toLowerCase().includes(searchLower) ||
        occupant.flat_number.toLowerCase().includes(searchLower) ||
        occupant.email.toLowerCase().includes(searchLower) ||
        occupant.name?.toLowerCase().includes(searchLower) ||
        occupant.occupant_name?.toLowerCase().includes(searchLower) ||
        occupant.mobile?.toLowerCase().includes(searchLower) ||
        occupant.occupant_type.toLowerCase().includes(searchLower)
    );
  }, [occupants, searchTerm]);

  const blockGroups = useMemo(() => {
    const groups: Record<string, BlockGroup> = {};

    filteredOccupants.forEach((occupant) => {
      const key = `${occupant.apartment_id}-${occupant.block_id}`;
      if (!groups[key]) {
        groups[key] = {
          block_id: occupant.block_id,
          block_name: occupant.block_name,
          block_type: occupant.block_type,
          apartment_name: occupant.apartment_name,
          occupants: [],
        };
      }
      groups[key].occupants.push(occupant);
    });

    return Object.values(groups).sort((a, b) => {
      if (a.apartment_name !== b.apartment_name) {
        return a.apartment_name.localeCompare(b.apartment_name);
      }
      return a.block_name.localeCompare(b.block_name);
    });
  }, [filteredOccupants]);

  const exportToCSV = () => {
    const headers = ['Apartment', 'Building/Block', 'Type', 'Flat Number', 'Name', 'Mobile', 'Email Address', 'Occupant Type', 'Created At'];
    const rows = filteredOccupants.map((occupant) => [
      occupant.apartment_name,
      occupant.block_name,
      occupant.block_type,
      occupant.flat_number,
      occupant.name || occupant.occupant_name || 'Not specified',
      occupant.mobile || 'Not provided',
      occupant.email,
      occupant.occupant_type,
      new Date(occupant.created_at).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `occupants_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = () => {
    const headers = ['Apartment', 'Building/Block', 'Type', 'Flat Number', 'Name', 'Mobile', 'Email Address', 'Occupant Type', 'Created At'];
    const rows = filteredOccupants.map((occupant) => [
      occupant.apartment_name,
      occupant.block_name,
      occupant.block_type,
      occupant.flat_number,
      occupant.name || occupant.occupant_name || 'Not specified',
      occupant.mobile || 'Not provided',
      occupant.email,
      occupant.occupant_type,
      new Date(occupant.created_at).toLocaleDateString(),
    ]);

    const excelContent = [
      headers.join('\t'),
      ...rows.map((row) => row.join('\t')),
    ].join('\n');

    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `occupants_${new Date().toISOString().split('T')[0]}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading occupants...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Occupant Management</h2>
            <p className="text-sm text-gray-600 mt-1">
              {filteredOccupants.length} {filteredOccupants.length === 1 ? 'occupant' : 'occupants'} with system access credentials
              {searchTerm && ` (filtered from ${occupants.length})`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium transition-all shadow-md"
            title="Export to CSV"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-all shadow-md"
            title="Export to Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Add Occupant
          </button>
        </div>
      </div>

      {/* Information Banner */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">About Occupant Management</h3>
            <p className="text-sm text-blue-800 leading-relaxed">
              This module manages residents who have <strong>system access credentials</strong> (email and mobile)
              for logging in and submitting payments. Residents listed here can access the occupant portal.
            </p>
            <p className="text-sm text-blue-800 mt-2 leading-relaxed">
              <strong>Note:</strong> To add basic resident information to a flat (name and type), use the
              <strong> Building Management</strong> module. Use this module specifically to grant system access
              by providing email and mobile credentials.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by apartment, building, flat number, name, email, mobile, or type..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {blockGroups.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center text-gray-500">
            {searchTerm
              ? 'No occupants match your search criteria.'
              : 'No occupants found. Add the first occupant to get started.'}
          </div>
        ) : (
          blockGroups.map((group) => (
            <div key={group.block_id} className="bg-white rounded-xl shadow-lg overflow-hidden border-l-4 border-blue-500">
              <button
                onClick={() => toggleBlock(group.block_id)}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-100 via-indigo-100 to-blue-200 hover:from-blue-200 hover:via-indigo-200 hover:to-blue-300 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Building className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-base font-semibold">
                      <span className="text-indigo-700">{group.apartment_name}</span>
                      <span className="text-gray-500 mx-2">•</span>
                      <span className="text-blue-700">{group.block_name}</span>
                    </h3>
                    <p className="text-xs font-medium mt-0.5">
                      <span className="text-teal-700">{group.block_type}</span>
                      <span className="text-gray-400 mx-1.5">•</span>
                      <span className="text-blue-700">{group.occupants.length} {group.occupants.length === 1 ? 'flat' : 'flats'}</span>
                    </p>
                  </div>
                </div>
                {expandedBlocks.has(group.block_id) ? (
                  <ChevronUp className="w-5 h-5 text-indigo-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-indigo-600" />
                )}
              </button>

              {expandedBlocks.has(group.block_id) && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Flat #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Mobile
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          WhatsApp Opt-in
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {group.occupants.map((occupant) => (
                        <React.Fragment key={occupant.id}>
                          <tr className="hover:bg-blue-50 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg">
                                  <Home className="w-4 h-4 text-blue-700" />
                                </div>
                                <span className="text-sm font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md">
                                  {occupant.flat_number}
                                </span>
                                <button
                                  onClick={() => toggleFlat(occupant.flat_id)}
                                  className="text-blue-600 hover:text-blue-800 ml-1 transition-colors p-1 hover:bg-blue-100 rounded"
                                  title="View payment history"
                                >
                                  {expandedFlats.has(occupant.flat_id) ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="p-1 bg-gradient-to-br from-green-100 to-emerald-100 rounded">
                                  <User className="w-3.5 h-3.5 text-green-700" />
                                </div>
                                <span className="text-sm font-medium text-gray-800">
                                  {occupant.name || occupant.occupant_name || <span className="text-gray-400 italic font-normal">Not specified</span>}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="p-1 bg-gradient-to-br from-violet-100 to-purple-100 rounded">
                                  <Phone className="w-3.5 h-3.5 text-violet-700" />
                                </div>
                                <span className="text-sm font-mono font-medium text-violet-700 bg-violet-50 px-2 py-0.5 rounded">
                                  {maskMobile(occupant.mobile)}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="p-1 bg-gradient-to-br from-rose-100 to-pink-100 rounded flex-shrink-0">
                                  <Mail className="w-3.5 h-3.5 text-rose-700" />
                                </div>
                                <span className="text-sm text-gray-700 truncate max-w-xs" title={occupant.email}>
                                  {occupant.email}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                occupant.occupant_type === 'Owner'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {occupant.occupant_type}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {occupant.whatsapp_opt_in === true ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                  ✓ Opted In
                                </span>
                              ) : occupant.whatsapp_opt_in === false ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                                  Not Opted In
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-400">
                                  Unknown
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEdit(occupant)}
                                  className="text-blue-600 hover:text-blue-800 transition-colors p-1.5 hover:bg-blue-50 rounded"
                                  title="Edit occupant"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(occupant.id)}
                                  className="text-red-600 hover:text-red-800 transition-colors p-1.5 hover:bg-red-50 rounded"
                                  title="Delete occupant"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {expandedFlats.has(occupant.flat_id) && (
                            <tr>
                              <td colSpan={6} className="px-4 py-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-l-4 border-blue-400">
                                <div className="space-y-3">
                                  <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2 mb-3">
                                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                                    Payment History for Flat {occupant.flat_number}
                                  </h4>
                                  {payments[occupant.flat_id]?.length > 0 ? (
                                    <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-blue-200">
                                      <table className="min-w-full divide-y divide-blue-100 text-sm">
                                        <thead className="bg-blue-100">
                                          <tr>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-blue-900">Name</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-blue-900">Amount</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-blue-900">Type</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-blue-900">Quarter</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-blue-900">Payment Date</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-blue-900">Status</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-blue-900">Submitted</th>
                                          </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-100">
                                          {payments[occupant.flat_id].map((payment) => (
                                            <tr key={payment.id} className="hover:bg-blue-50 transition-colors">
                                              <td className="px-3 py-2 text-gray-800">{payment.name}</td>
                                              <td className="px-3 py-2 font-semibold text-gray-900">
                                                {payment.payment_amount
                                                  ? `₹${payment.payment_amount.toLocaleString()}`
                                                  : '-'}
                                              </td>
                                              <td className="px-3 py-2 text-gray-700">
                                                {payment.payment_type ? PAYMENT_TYPE_LABELS[payment.payment_type] || payment.payment_type : '-'}
                                              </td>
                                              <td className="px-3 py-2 text-gray-700">{payment.payment_quarter || '-'}</td>
                                              <td className="px-3 py-2 text-gray-700">
                                                {payment.payment_date
                                                  ? new Date(payment.payment_date).toLocaleDateString()
                                                  : '-'}
                                              </td>
                                              <td className="px-3 py-2">
                                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                                  payment.status === 'verified'
                                                    ? 'bg-green-100 text-green-800'
                                                    : payment.status === 'rejected'
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                  {payment.status || 'pending'}
                                                </span>
                                              </td>
                                              <td className="px-3 py-2 text-xs text-gray-500">
                                                {new Date(payment.created_at).toLocaleDateString()}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <div className="bg-white rounded-lg p-4 text-center border border-blue-200">
                                      <p className="text-sm text-blue-700 italic">No payment history found for this flat</p>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {editModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                {editModal.isNew ? 'Add New Occupant' : 'Edit Occupant'}
              </h3>
              <button
                onClick={() => setEditModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={editModal.occupant.name || ''}
                  onChange={(e) =>
                    setEditModal({
                      ...editModal,
                      occupant: { ...editModal.occupant, name: e.target.value },
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter occupant name"
                />
                {!editModal.isNew && editModal.occupant.occupant_name && (
                  <p className="text-xs text-gray-500 mt-1">
                    Latest payment name: <span className="font-medium">{editModal.occupant.occupant_name}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Apartment <span className="text-red-500">*</span>
                </label>
                <select
                  value={editModal.occupant.apartment_id}
                  onChange={(e) => {
                    setEditModal({
                      ...editModal,
                      occupant: {
                        ...editModal.occupant,
                        apartment_id: e.target.value,
                        block_id: '',
                        flat_id: '',
                      },
                    });
                    loadBlocks(e.target.value);
                  }}
                  disabled={!editModal.isNew}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  {apartments.map((apt) => (
                    <option key={apt.id} value={apt.id}>
                      {apt.apartment_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Building/Block/Phase <span className="text-red-500">*</span>
                </label>
                <select
                  value={editModal.occupant.block_id}
                  onChange={(e) => {
                    setEditModal({
                      ...editModal,
                      occupant: {
                        ...editModal.occupant,
                        block_id: e.target.value,
                        flat_id: '',
                      },
                    });
                    loadFlats(e.target.value);
                  }}
                  disabled={!editModal.isNew}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">Select...</option>
                  {blocks.map((block) => (
                    <option key={block.id} value={block.id}>
                      {block.block_name} ({block.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Flat Number <span className="text-red-500">*</span>
                </label>
                <select
                  value={editModal.occupant.flat_id}
                  onChange={(e) =>
                    setEditModal({
                      ...editModal,
                      occupant: { ...editModal.occupant, flat_id: e.target.value },
                    })
                  }
                  disabled={!editModal.isNew}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">Select...</option>
                  {flats.map((flat) => (
                    <option key={flat.id} value={flat.id}>
                      {flat.flat_number}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={editModal.occupant.email}
                  onChange={(e) =>
                    setEditModal({
                      ...editModal,
                      occupant: { ...editModal.occupant, email: e.target.value },
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={editModal.occupant.mobile || ''}
                  onChange={(e) =>
                    setEditModal({
                      ...editModal,
                      occupant: { ...editModal.occupant, mobile: e.target.value },
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+91 XXXXXXXXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Occupant Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={editModal.occupant.occupant_type}
                  onChange={(e) =>
                    setEditModal({
                      ...editModal,
                      occupant: {
                        ...editModal.occupant,
                        occupant_type: e.target.value as 'Owner' | 'Tenant',
                      },
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Owner">Owner</option>
                  <option value="Tenant">Tenant</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WhatsApp Opt-in Status
                </label>
                <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 flex items-center">
                  {editModal.occupant.whatsapp_opt_in === true ? (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                      ✓ Opted In
                    </span>
                  ) : editModal.occupant.whatsapp_opt_in === false ? (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-gray-200 text-gray-700">
                      Not Opted In
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-gray-100 text-gray-500">
                      Unknown
                    </span>
                  )}
                  <span className="ml-3 text-xs text-gray-500 italic">
                    (Set by occupant via their portal)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 px-6 rounded-lg font-medium transition-all"
              >
                <Save className="w-5 h-5" />
                Save
              </button>
              <button
                onClick={() => setEditModal(null)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this occupant mapping? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
