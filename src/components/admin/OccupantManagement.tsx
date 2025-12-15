import { useState, useEffect, useMemo } from 'react';
import { Users, Edit2, Trash2, Plus, ChevronDown, ChevronUp, X, Save, Building, Mail, Phone, User, Home, Download, Search, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../../lib/supabase';

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
  occupant_type: 'Owner' | 'Tenant';
  created_at: string;
  updated_at: string;
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
          occupant_type,
          created_at,
          updated_at,
          apartments!inner(apartment_name),
          buildings_blocks_phases!inner(block_name, type),
          flat_numbers!inner(flat_number)
        `)
        .order('apartments(apartment_name)', { ascending: true });

      if (error) throw error;

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
        occupant_type: item.occupant_type,
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
        occupant_type: 'Owner',
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
            occupant_type: occupant.occupant_type,
          });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('flat_email_mappings')
          .update({
            email: occupant.email.toLowerCase().trim(),
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
        occupant.occupant_type.toLowerCase().includes(searchLower)
    );
  }, [occupants, searchTerm]);

  const exportToCSV = () => {
    const headers = ['Apartment', 'Building/Block', 'Type', 'Flat Number', 'Email Address', 'Occupant Type', 'Created At'];
    const rows = filteredOccupants.map((occupant) => [
      occupant.apartment_name,
      occupant.block_name,
      occupant.block_type,
      occupant.flat_number,
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
    const headers = ['Apartment', 'Building/Block', 'Type', 'Flat Number', 'Email Address', 'Occupant Type', 'Created At'];
    const rows = filteredOccupants.map((occupant) => [
      occupant.apartment_name,
      occupant.block_name,
      occupant.block_type,
      occupant.flat_number,
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
          <Users className="w-8 h-8 text-amber-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Occupant Management</h2>
            <p className="text-sm text-gray-600 mt-1">
              {filteredOccupants.length} {filteredOccupants.length === 1 ? 'occupant' : 'occupants'}
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
            className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Add Occupant
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by apartment, building, flat number, email, or type..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-amber-50 to-orange-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Apartment
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Building/Block
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Flat Number
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Email Address
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOccupants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    {searchTerm
                      ? 'No occupants match your search criteria.'
                      : 'No occupants found. Add the first occupant to get started.'}
                  </td>
                </tr>
              ) : (
                filteredOccupants.map((occupant) => (
                  <>
                    <tr key={occupant.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {occupant.apartment_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {occupant.block_name}
                          <span className="text-xs text-gray-500 ml-2">({occupant.block_type})</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Home className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{occupant.flat_number}</span>
                          <button
                            onClick={() => toggleFlat(occupant.flat_id)}
                            className="text-amber-600 hover:text-amber-700 ml-2"
                          >
                            {expandedFlats.has(occupant.flat_id) ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{occupant.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          occupant.occupant_type === 'Owner'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {occupant.occupant_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(occupant)}
                            className="text-amber-600 hover:text-amber-700 transition-colors p-2 hover:bg-amber-50 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(occupant.id)}
                            className="text-red-600 hover:text-red-700 transition-colors p-2 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedFlats.has(occupant.flat_id) && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-gray-50">
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">
                              Payment History for {occupant.flat_number}
                            </h4>
                            {payments[occupant.flat_id]?.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                  <thead className="bg-gray-100">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Name</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Amount</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Type</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Quarter</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Payment Date</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Status</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Submitted</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {payments[occupant.flat_id].map((payment) => (
                                      <tr key={payment.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2">{payment.name}</td>
                                        <td className="px-4 py-2">
                                          {payment.payment_amount
                                            ? `₹${payment.payment_amount.toLocaleString()}`
                                            : '-'}
                                        </td>
                                        <td className="px-4 py-2">{payment.payment_type}</td>
                                        <td className="px-4 py-2">{payment.payment_quarter || '-'}</td>
                                        <td className="px-4 py-2">
                                          {payment.payment_date
                                            ? new Date(payment.payment_date).toLocaleDateString()
                                            : '-'}
                                        </td>
                                        <td className="px-4 py-2">
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
                                        <td className="px-4 py-2 text-xs text-gray-500">
                                          {new Date(payment.created_at).toLocaleDateString()}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 italic">No payment history found</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-100"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-100"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-100"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="user@example.com"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="Owner">Owner</option>
                  <option value="Tenant">Tenant</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white py-3 px-6 rounded-lg font-medium transition-all"
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
