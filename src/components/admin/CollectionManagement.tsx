import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, Bell, Save, X, Calendar, Coins, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';

interface Collection {
  id: string;
  apartment_id: string;
  payment_type: 'maintenance' | 'contingency' | 'emergency';
  payment_frequency: 'one-time' | 'monthly' | 'quarterly' | 'yearly';
  collection_name: string;
  financial_year?: string;
  quarter?: string;
  due_date: string;
  start_date?: string;
  end_date?: string;
  amount_due?: number;
  rate_per_sqft?: number;
  flat_type_rates?: Record<string, number>;
  daily_fine: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
}

interface CollectionFormData {
  payment_type: 'maintenance' | 'contingency' | 'emergency';
  payment_frequency: 'one-time' | 'monthly' | 'quarterly' | 'yearly';
  collection_name: string;
  financial_year: string;
  quarter: string;
  due_date: string;
  start_date: string;
  end_date: string;
  amount_due: string;
  rate_per_sqft: string;
  flat_type_rates: Record<string, string>;
  daily_fine: string;
  notes: string;
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  maintenance: 'Maintenance Collection',
  contingency: 'Contingency Fund',
  emergency: 'Emergency Fund',
};

const FREQUENCY_LABELS: Record<string, string> = {
  'one-time': 'One-Time Collection',
  'monthly': 'Monthly Recurring',
  'quarterly': 'Quarterly Recurring',
  'yearly': 'Annual Collection',
};

const FLAT_TYPES = ['Studio', '1BHK', '2BHK', '3BHK', '4BHK', '5BHK', 'Penthouse', 'Duplex'];

interface CollectionManagementProps {
  apartmentId: string;
  apartmentName: string;
}

export default function CollectionManagement({ apartmentId, apartmentName }: CollectionManagementProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sendingReminders, setSendingReminders] = useState<string | null>(null);
  const [showReminderConfirm, setShowReminderConfirm] = useState(false);
  const [selectedCollectionForReminder, setSelectedCollectionForReminder] = useState<string | null>(null);
  const [apartmentMode, setApartmentMode] = useState<'A' | 'B' | 'C'>('A');

  const [formData, setFormData] = useState<CollectionFormData>({
    payment_type: 'maintenance',
    payment_frequency: 'quarterly',
    collection_name: '',
    financial_year: `FY${new Date().getFullYear().toString().slice(-2)}`,
    quarter: 'Q1',
    due_date: '',
    start_date: '',
    end_date: '',
    amount_due: '',
    rate_per_sqft: '',
    flat_type_rates: FLAT_TYPES.reduce((acc, type) => ({ ...acc, [type]: '' }), {}),
    daily_fine: '0',
    notes: '',
  });

  useEffect(() => {
    loadApartmentDetails();
    loadCollections();
  }, [apartmentId]);

  async function loadApartmentDetails() {
    try {
      const { data, error } = await supabase
        .from('apartments')
        .select('default_collection_mode')
        .eq('id', apartmentId)
        .single();

      if (error) throw error;
      if (data) {
        setApartmentMode(data.default_collection_mode as 'A' | 'B' | 'C');
      }
    } catch (error) {
      console.error('Error loading apartment details:', error);
    }
  }

  async function loadCollections() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('expected_collections')
        .select('*')
        .eq('apartment_id', apartmentId)
        .order('is_active', { ascending: false })
        .order('due_date', { ascending: false });

      if (error) throw error;
      setCollections(data || []);
    } catch (error) {
      console.error('Error loading collections:', error);
      setErrorMessage('Failed to load collections');
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(collection: Collection) {
    try {
      const newActiveState = !collection.is_active;
      const { error } = await supabase
        .from('expected_collections')
        .update({ is_active: newActiveState })
        .eq('id', collection.id);

      if (error) throw error;

      setSuccessMessage(
        `Collection ${newActiveState ? 'activated' : 'deactivated'} successfully`
      );
      setTimeout(() => setSuccessMessage(null), 3000);
      loadCollections();
    } catch (error) {
      console.error('Error toggling collection:', error);
      setErrorMessage('Failed to update collection status');
      setTimeout(() => setErrorMessage(null), 3000);
    }
  }

  function openReminderConfirm(collectionId: string) {
    const collection = collections.find(c => c.id === collectionId);
    if (collection && !collection.is_active) {
      setErrorMessage('Cannot send reminder for inactive collection');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    setSelectedCollectionForReminder(collectionId);
    setShowReminderConfirm(true);
  }

  function closeReminderConfirm() {
    setShowReminderConfirm(false);
    setSelectedCollectionForReminder(null);
  }

  async function handleSendReminders() {
    if (!selectedCollectionForReminder) return;

    closeReminderConfirm();
    setSendingReminders(selectedCollectionForReminder);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-payment-reminders`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apartment_id: apartmentId,
          expected_collection_id: selectedCollectionForReminder,
          reminder_type: 'manual',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send reminders');
      }

      setSuccessMessage(result.message || `Reminders sent successfully! Sent: ${result.sent}, Failed: ${result.failed}`);
      setTimeout(() => setSuccessMessage(null), 8000);
    } catch (error) {
      console.error('Error sending reminders:', error);
      const message = error instanceof Error ? error.message : 'Failed to send reminders';
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(null), 8000);
    } finally {
      setSendingReminders(null);
    }
  }

  function openForm(collection?: Collection) {
    if (collection) {
      setEditingId(collection.id);
      setFormData({
        payment_type: collection.payment_type,
        payment_frequency: collection.payment_frequency,
        collection_name: collection.collection_name,
        financial_year: collection.financial_year || '',
        quarter: collection.quarter || '',
        due_date: collection.due_date,
        start_date: collection.start_date || '',
        end_date: collection.end_date || '',
        amount_due: collection.amount_due?.toString() || '',
        rate_per_sqft: collection.rate_per_sqft?.toString() || '',
        flat_type_rates: collection.flat_type_rates
          ? Object.fromEntries(Object.entries(collection.flat_type_rates).map(([k, v]) => [k, v.toString()]))
          : FLAT_TYPES.reduce((acc, type) => ({ ...acc, [type]: '' }), {}),
        daily_fine: collection.daily_fine.toString(),
        notes: collection.notes || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        payment_type: 'maintenance',
        payment_frequency: 'quarterly',
        collection_name: '',
        financial_year: `FY${new Date().getFullYear().toString().slice(-2)}`,
        quarter: 'Q1',
        due_date: '',
        start_date: '',
        end_date: '',
        amount_due: '',
        rate_per_sqft: '',
        flat_type_rates: FLAT_TYPES.reduce((acc, type) => ({ ...acc, [type]: '' }), {}),
        daily_fine: '0',
        notes: '',
      });
    }
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validation based on apartment mode
    if (!formData.collection_name || !formData.due_date) {
      setErrorMessage('Please fill in all required fields');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    if (apartmentMode === 'A' && !formData.amount_due) {
      setErrorMessage('Amount Due per Flat is required for Mode A');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    if (apartmentMode === 'B' && !formData.rate_per_sqft) {
      setErrorMessage('Rate per Square Foot is required for Mode B');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    if (apartmentMode === 'C') {
      const hasAllRates = FLAT_TYPES.every(type => formData.flat_type_rates[type] && parseFloat(formData.flat_type_rates[type]) > 0);
      if (!hasAllRates) {
        setErrorMessage('Please enter rates for all flat types for Mode C');
        setTimeout(() => setErrorMessage(null), 3000);
        return;
      }
    }

    try {
      setSaving(true);

      const collectionData: any = {
        apartment_id: apartmentId,
        payment_type: formData.payment_type,
        payment_frequency: formData.payment_frequency,
        collection_name: formData.collection_name,
        financial_year: formData.financial_year || null,
        quarter: formData.quarter || null,
        due_date: formData.due_date,
        start_date: formData.start_date || formData.due_date,
        end_date: formData.end_date || null,
        daily_fine: parseFloat(formData.daily_fine),
        is_active: false,
        notes: formData.notes || null,
      };

      // Add pricing based on apartment mode
      if (apartmentMode === 'A') {
        collectionData.amount_due = parseFloat(formData.amount_due);
      } else if (apartmentMode === 'B') {
        collectionData.rate_per_sqft = parseFloat(formData.rate_per_sqft);
      } else if (apartmentMode === 'C') {
        collectionData.flat_type_rates = Object.fromEntries(
          Object.entries(formData.flat_type_rates)
            .map(([k, v]) => [k, parseFloat(v)])
        );
      }

      if (editingId) {
        const { error } = await supabase
          .from('expected_collections')
          .update(collectionData)
          .eq('id', editingId);

        if (error) throw error;
        setSuccessMessage('Collection updated successfully');
      } else {
        const { error } = await supabase
          .from('expected_collections')
          .insert([collectionData]);

        if (error) throw error;
        setSuccessMessage('Collection created successfully (inactive by default)');
      }

      setTimeout(() => setSuccessMessage(null), 3000);
      closeForm();
      loadCollections();
    } catch (error: any) {
      console.error('Error saving collection:', error);
      setErrorMessage(error.message || 'Failed to save collection');
      setTimeout(() => setErrorMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function deleteCollection(id: string) {
    if (!confirm('Are you sure you want to delete this collection? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('expected_collections')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSuccessMessage('Collection deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      loadCollections();
    } catch (error) {
      console.error('Error deleting collection:', error);
      setErrorMessage('Failed to delete collection');
      setTimeout(() => setErrorMessage(null), 3000);
    }
  }

  const getFrequencyFields = () => {
    switch (formData.payment_frequency) {
      case 'one-time':
        return (
          <>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Collection Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Collection End Date
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        );
      case 'monthly':
        return (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Monthly Due Day <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max="31"
              placeholder="Day of month (e.g., 5 for 5th of each month)"
              value={formData.start_date ? new Date(formData.start_date).getDate() : ''}
              onChange={(e) => {
                const day = parseInt(e.target.value);
                if (day >= 1 && day <= 31) {
                  const date = new Date();
                  date.setDate(day);
                  setFormData({ ...formData, start_date: date.toISOString().split('T')[0] });
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Payments due on this day every month</p>
          </div>
        );
      case 'quarterly':
        return (
          <>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Financial Year <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.financial_year}
                onChange={(e) => setFormData({ ...formData, financial_year: e.target.value })}
                placeholder="e.g., FY25"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Quarter <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.quarter}
                onChange={(e) => setFormData({ ...formData, quarter: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="Q1">Q1 (Apr-Jun)</option>
                <option value="Q2">Q2 (Jul-Sep)</option>
                <option value="Q3">Q3 (Oct-Dec)</option>
                <option value="Q4">Q4 (Jan-Mar)</option>
              </select>
            </div>
          </>
        );
      case 'yearly':
        return (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Financial Year <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.financial_year}
              onChange={(e) => setFormData({ ...formData, financial_year: e.target.value })}
              placeholder="e.g., FY25, 2025"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-green-800 font-medium">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-800 font-medium">{errorMessage}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Collections</h2>
          <p className="text-gray-600 mt-1">Manage payment collections for {apartmentName}</p>
        </div>
        <button
          onClick={() => openForm()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Collection
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Important:</strong> Collections are created as <strong>inactive</strong> by default.
          Activate a collection to make it visible to residents for payment submission.
          Use the reminder feature to notify residents about pending payments.
        </p>
      </div>

      {/* Collections List */}
      <div className="space-y-4">
        {collections.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No collections created yet</p>
            <p className="text-sm text-gray-500 mt-1">Create your first payment collection to get started</p>
          </div>
        ) : (
          collections.map((collection) => (
            <div
              key={collection.id}
              className={`border-2 rounded-lg p-4 transition-all ${
                collection.is_active
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {collection.collection_name}
                    </h3>
                    {collection.is_active && (
                      <span className="px-2 py-1 bg-green-600 text-white text-xs font-semibold rounded-full">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <p className="font-medium text-gray-900">
                        {PAYMENT_TYPE_LABELS[collection.payment_type]}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Frequency:</span>
                      <p className="font-medium text-gray-900">
                        {FREQUENCY_LABELS[collection.payment_frequency]}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Pricing:</span>
                      {collection.amount_due && (
                        <p className="font-medium text-gray-900">
                          ₹{collection.amount_due.toLocaleString()} per flat
                        </p>
                      )}
                      {collection.rate_per_sqft && (
                        <p className="font-medium text-gray-900">
                          ₹{collection.rate_per_sqft}/sq.ft
                        </p>
                      )}
                      {collection.flat_type_rates && (
                        <p className="font-medium text-gray-900">
                          Type-Based Rates
                        </p>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-500">Due Date:</span>
                      <p className="font-medium text-gray-900">
                        {formatDate(collection.due_date)}
                      </p>
                    </div>
                    {collection.daily_fine > 0 && (
                      <div>
                        <span className="text-gray-500">Daily Fine:</span>
                        <p className="font-medium text-gray-900">
                          ₹{collection.daily_fine}/day
                        </p>
                      </div>
                    )}
                    {collection.quarter && (
                      <div>
                        <span className="text-gray-500">Period:</span>
                        <p className="font-medium text-gray-900">
                          {collection.quarter} {collection.financial_year}
                        </p>
                      </div>
                    )}
                  </div>
                  {collection.notes && (
                    <p className="text-sm text-gray-600 mt-2 italic">{collection.notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {collection.is_active && (
                    <button
                      onClick={() => openReminderConfirm(collection.id)}
                      disabled={sendingReminders === collection.id}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Send Reminder"
                    >
                      {sendingReminders === collection.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Bell className="w-5 h-5" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => toggleActive(collection)}
                    className={`p-2 rounded-lg transition-colors ${
                      collection.is_active
                        ? 'text-green-600 hover:bg-green-100'
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={collection.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {collection.is_active ? (
                      <ToggleRight className="w-6 h-6" />
                    ) : (
                      <ToggleLeft className="w-6 h-6" />
                    )}
                  </button>
                  <button
                    onClick={() => openForm(collection)}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => deleteCollection(collection.id)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingId ? 'Edit Collection' : 'Create New Collection'}
              </h3>
              <button
                onClick={closeForm}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Collection Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.collection_name}
                  onChange={(e) => setFormData({ ...formData, collection_name: e.target.value })}
                  placeholder="e.g., Annual Maintenance 2025, Emergency Repair Fund"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.payment_type}
                    onChange={(e) =>
                      setFormData({ ...formData, payment_type: e.target.value as any })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="maintenance">Maintenance</option>
                    <option value="contingency">Contingency Fund</option>
                    <option value="emergency">Emergency Fund</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Frequency <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.payment_frequency}
                    onChange={(e) =>
                      setFormData({ ...formData, payment_frequency: e.target.value as any })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="one-time">One-Time</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              {/* Frequency-specific fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getFrequencyFields()}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Payment Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Apartment Collection Mode Info */}
              <div className="border-t border-gray-200 pt-4 pb-2">
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      Apartment Collection Policy: Mode {apartmentMode}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {apartmentMode === 'A' && 'Equal/Flat Rate - All flats pay the same amount'}
                      {apartmentMode === 'B' && 'Area-Based - Payment calculated based on built-up area'}
                      {apartmentMode === 'C' && 'Type-Based - Payment based on flat type (1BHK, 2BHK, etc.)'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mode A: Flat Rate */}
              {apartmentMode === 'A' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Amount Due per Flat <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.amount_due}
                        onChange={(e) => setFormData({ ...formData, amount_due: e.target.value })}
                        placeholder="5000"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Fixed amount charged to all flats</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Daily Fine (optional)
                    </label>
                    <div className="relative">
                      <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.daily_fine}
                        onChange={(e) => setFormData({ ...formData, daily_fine: e.target.value })}
                        placeholder="0"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Mode B: Area-Based */}
              {apartmentMode === 'B' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Rate per Square Foot <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.rate_per_sqft}
                        onChange={(e) => setFormData({ ...formData, rate_per_sqft: e.target.value })}
                        placeholder="5.00"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Amount multiplied by flat's built-up area</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Daily Fine (optional)
                    </label>
                    <div className="relative">
                      <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.daily_fine}
                        onChange={(e) => setFormData({ ...formData, daily_fine: e.target.value })}
                        placeholder="0"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Mode C: Type-Based */}
              {apartmentMode === 'C' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Flat Type Rates <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    {FLAT_TYPES.map((flatType) => (
                      <div key={flatType}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {flatType}
                        </label>
                        <div className="relative">
                          <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.flat_type_rates[flatType]}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                flat_type_rates: {
                                  ...formData.flat_type_rates,
                                  [flatType]: e.target.value,
                                },
                              })
                            }
                            placeholder="0"
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                            required
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 mt-2">Enter amount for each flat type</p>
                  <div className="mt-3">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Daily Fine (optional)
                    </label>
                    <div className="relative max-w-xs">
                      <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.daily_fine}
                        onChange={(e) => setFormData({ ...formData, daily_fine: e.target.value })}
                        placeholder="0"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional information or instructions for residents..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This collection will be created as <strong>inactive</strong>.
                  You can activate it later from the collections list.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingId ? 'Update' : 'Create'} Collection
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reminder Confirmation Modal */}
      {showReminderConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Bell className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Send Payment Reminders</h3>
              </div>
              <p className="text-gray-600 mb-6">
                This will send email reminders to all occupants who haven't submitted their payment confirmation for this collection. Do you want to continue?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={closeReminderConfirm}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendReminders}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  <Bell className="w-4 h-4" />
                  Send Reminders
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
