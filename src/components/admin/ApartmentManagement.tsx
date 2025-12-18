import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Download, Loader2, X, Check, MapPin, Info } from 'lucide-react';
import { supabase, Apartment, CollectionMode } from '../../lib/supabase';
import { exportToCSV, logAudit, formatDateTime, getCountryFlag } from '../../lib/utils';

export default function ApartmentManagement() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpContent, setHelpContent] = useState<{title: string; content: string} | null>(null);
  const [editingApartment, setEditingApartment] = useState<Apartment | null>(null);
  const [formData, setFormData] = useState({
    apartment_name: '',
    city: '',
    country: '',
    status: 'active' as 'active' | 'inactive',
    collection_mode: 'A' as CollectionMode
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
    setFormData({ apartment_name: '', city: '', country: '', status: 'active', collection_mode: 'A' });
    setError('');
    setShowModal(true);
  }

  function openEditModal(apartment: Apartment) {
    setEditingApartment(apartment);
    setFormData({
      apartment_name: apartment.apartment_name,
      city: apartment.city || '',
      country: apartment.country || '',
      status: apartment.status,
      collection_mode: apartment.collection_mode || 'A'
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
            collection_mode: formData.collection_mode,
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
            collection_mode: formData.collection_mode,
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

  async function loadHelpContent() {
    try {
      const { data, error } = await supabase
        .from('helpful_tips')
        .select('title, content')
        .eq('title', 'Apartment-Level Maintenance Collection Policy')
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setHelpContent(data);
        setShowHelpModal(true);
      }
    } catch (error) {
      console.error('Error loading help content:', error);
    }
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full my-8">
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

              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Maintenance Collection Mode (Apartment Policy)
                  </label>
                  <button
                    type="button"
                    onClick={loadHelpContent}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Info className="w-3.5 h-3.5" />
                    Policy Guide
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  This mode defines how maintenance will be calculated within this apartment.
                </p>

                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="radio"
                      name="collection_mode"
                      value="A"
                      checked={formData.collection_mode === 'A'}
                      onChange={(e) => setFormData({ ...formData, collection_mode: e.target.value as CollectionMode })}
                      className="mt-1 w-4 h-4 text-amber-600 border-gray-300 focus:ring-amber-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">Mode A: Equal / Flat Rate</div>
                      <div className="text-xs text-gray-600 mt-0.5">All flats pay the same amount regardless of size or type</div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="radio"
                      name="collection_mode"
                      value="B"
                      checked={formData.collection_mode === 'B'}
                      onChange={(e) => setFormData({ ...formData, collection_mode: e.target.value as CollectionMode })}
                      className="mt-1 w-4 h-4 text-amber-600 border-gray-300 focus:ring-amber-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">Mode B: Area-Based (Built-up Area)</div>
                      <div className="text-xs text-gray-600 mt-0.5">Payment calculated based on the flat's built-up area in sq.ft</div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="radio"
                      name="collection_mode"
                      value="C"
                      checked={formData.collection_mode === 'C'}
                      onChange={(e) => setFormData({ ...formData, collection_mode: e.target.value as CollectionMode })}
                      className="mt-1 w-4 h-4 text-amber-600 border-gray-300 focus:ring-amber-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">Mode C: Flat-Type Based</div>
                      <div className="text-xs text-gray-600 mt-0.5">Payment based on flat type (e.g., 1BHK, 2BHK, 3BHK, etc.)</div>
                    </div>
                  </label>
                </div>
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

      {showHelpModal && helpContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <Info className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">{helpContent.title}</h2>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="prose prose-sm max-w-none">
                {helpContent.content.split('\n\n').map((paragraph, index) => {
                  if (paragraph.startsWith('## ')) {
                    return (
                      <h2 key={index} className="text-xl font-bold text-gray-900 mt-6 mb-3 first:mt-0">
                        {paragraph.replace('## ', '')}
                      </h2>
                    );
                  } else if (paragraph.startsWith('### ')) {
                    return (
                      <h3 key={index} className="text-lg font-semibold text-gray-800 mt-5 mb-2">
                        {paragraph.replace('### ', '')}
                      </h3>
                    );
                  } else if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                    return (
                      <p key={index} className="font-semibold text-gray-900 mb-2">
                        {paragraph.replace(/\*\*/g, '')}
                      </p>
                    );
                  } else if (paragraph.startsWith('*') && paragraph.endsWith('*')) {
                    return (
                      <p key={index} className="italic text-gray-700 bg-blue-50 border-l-4 border-blue-500 p-4 my-4 rounded-r-lg">
                        {paragraph.replace(/^\*|\*$/g, '')}
                      </p>
                    );
                  } else if (paragraph.startsWith('- ')) {
                    const items = paragraph.split('\n').filter(line => line.trim());
                    return (
                      <ul key={index} className="list-disc list-inside space-y-2 mb-4 text-gray-700">
                        {items.map((item, i) => (
                          <li key={i} className="ml-4">
                            {item.replace('- ', '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').split('<strong>').map((part, j) => {
                              if (j === 0) return part;
                              const [bold, rest] = part.split('</strong>');
                              return <span key={j}><strong>{bold}</strong>{rest}</span>;
                            })}
                          </li>
                        ))}
                      </ul>
                    );
                  } else {
                    return (
                      <p key={index} className="text-gray-700 mb-3 leading-relaxed">
                        {paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').split('<strong>').map((part, i) => {
                          if (i === 0) return part;
                          const [bold, rest] = part.split('</strong>');
                          return <span key={i}><strong className="font-semibold text-gray-900">{bold}</strong>{rest}</span>;
                        })}
                      </p>
                    );
                  }
                })}
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowHelpModal(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg transition-colors font-medium"
              >
                Got it, thanks!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
