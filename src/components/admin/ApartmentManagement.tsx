import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Download, Loader2, X, Check, MapPin } from 'lucide-react';
import { supabase, Apartment } from '../../lib/supabase';
import { exportToCSV, logAudit, formatDateTime, getCountryFlag } from '../../lib/utils';

export default function ApartmentManagement() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingApartment, setEditingApartment] = useState<Apartment | null>(null);
  const [formData, setFormData] = useState({
    apartment_name: '',
    city: '',
    country: '',
    status: 'active' as 'active' | 'inactive'
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadApartments();
  }, []);

  async function loadApartments() {
    try {
      const { data, error } = await supabase
        .from('apartments')
        .select('*')
        .order('apartment_name');

      if (error) throw error;
      setApartments(data || []);
    } catch (error) {
      console.error('Error loading apartments:', error);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingApartment(null);
    setFormData({ apartment_name: '', city: '', country: '', status: 'active' });
    setError('');
    setShowModal(true);
  }

  function openEditModal(apartment: Apartment) {
    setEditingApartment(apartment);
    setFormData({
      apartment_name: apartment.apartment_name,
      city: apartment.city || '',
      country: apartment.country || '',
      status: apartment.status
    });
    setError('');
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      if (editingApartment) {
        const { error } = await supabase
          .from('apartments')
          .update({
            apartment_name: formData.apartment_name.trim(),
            city: formData.city.trim() || null,
            country: formData.country.trim() || null,
            status: formData.status,
          })
          .eq('id', editingApartment.id);

        if (error) throw error;
        await logAudit('update', 'apartments', editingApartment.id, { name: formData.apartment_name });
      } else {
        const { data, error } = await supabase
          .from('apartments')
          .insert([{
            apartment_name: formData.apartment_name.trim(),
            city: formData.city.trim() || null,
            country: formData.country.trim() || null,
            status: formData.status,
          }])
          .select()
          .single();

        if (error) throw error;
        await logAudit('create', 'apartments', data.id, { name: formData.apartment_name });
      }

      setShowModal(false);
      loadApartments();
    } catch (error: any) {
      setError(error.message || 'Failed to save apartment');
    }
  }

  async function handleDelete(apartment: Apartment) {
    if (!confirm(`Are you sure you want to delete "${apartment.apartment_name}"? This will permanently delete all associated data including admins, buildings, flats, and payment submissions.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('apartments')
        .delete()
        .eq('id', apartment.id);

      if (error) throw error;
      await logAudit('delete', 'apartments', apartment.id, { name: apartment.apartment_name });
      loadApartments();
    } catch (error: any) {
      alert('Error deleting apartment: ' + error.message);
    }
  }

  function handleExport() {
    exportToCSV(apartments, 'apartments');
    logAudit('export', 'apartments', undefined, { count: apartments.length });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Apartment Management</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage apartment societies and their settings</p>
        </div>
        <div className="flex gap-2 sm:gap-3 flex-shrink-0">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 sm:px-4 py-2 rounded-lg transition-colors font-medium text-sm"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors font-medium text-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Apartment</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                    Apartment Name
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                    Location
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                    Created Date
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {apartments.map((apartment) => (
                  <tr key={apartment.id} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {apartment.apartment_name}
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-sm text-gray-600">
                      {apartment.city || apartment.country ? (
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <span className="text-xl" title={apartment.country || ''}>
                            {getCountryFlag(apartment.country)}
                          </span>
                          <span>{[apartment.city, apartment.country].filter(Boolean).join(', ')}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                          apartment.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {apartment.status}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {formatDateTime(apartment.created_at)}
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        <button
                          onClick={() => openEditModal(apartment)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(apartment)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {apartments.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No apartments found. Click "Add Apartment" to create one.
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {editingApartment ? 'Edit Apartment' : 'Add New Apartment'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Apartment Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.apartment_name}
                  onChange={(e) => setFormData({ ...formData, apartment_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="e.g., Green Meadows"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  City/Town
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="e.g., Mumbai, New York"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Country
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="e.g., India, USA, UK"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  <Check className="w-4 h-4" />
                  {editingApartment ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
