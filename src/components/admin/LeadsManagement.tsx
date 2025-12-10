import { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Mail,
  Phone,
  Building2,
  MapPin,
  Calendar,
  Edit2,
  Trash2,
  X,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Star
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';

type LeadStatus = 'new' | 'cold_lead' | 'hot_lead' | 'approved_lead' | 'contacted' | 'converted' | 'closed';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  apartment_name: string;
  city: string;
  message: string | null;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface LeadFormData {
  name: string;
  email: string;
  phone: string;
  apartment_name: string;
  city: string;
  message: string;
  status: LeadStatus;
  notes: string;
}

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bgColor: string; icon: any }> = {
  new: { label: 'New', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: Star },
  cold_lead: { label: 'Cold Lead', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: TrendingDown },
  hot_lead: { label: 'Hot Lead', color: 'text-red-700', bgColor: 'bg-red-100', icon: TrendingUp },
  approved_lead: { label: 'Approved Lead', color: 'text-green-700', bgColor: 'bg-green-100', icon: CheckCircle2 },
  contacted: { label: 'Contacted', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: Phone },
  converted: { label: 'Converted', color: 'text-emerald-700', bgColor: 'bg-emerald-100', icon: CheckCircle2 },
  closed: { label: 'Closed', color: 'text-slate-700', bgColor: 'bg-slate-100', icon: X },
};

export default function LeadsManagement() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<LeadFormData>({
    name: '',
    email: '',
    phone: '',
    apartment_name: '',
    city: '',
    message: '',
    status: 'new',
    notes: '',
  });

  useEffect(() => {
    loadLeads();
  }, []);

  useEffect(() => {
    filterLeads();
  }, [leads, searchQuery, statusFilter]);

  async function loadLeads() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('marketing_leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setLeads(data || []);
    } catch (err) {
      console.error('Error loading leads:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }

  function filterLeads() {
    let filtered = [...leads];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(lead =>
        lead.name.toLowerCase().includes(query) ||
        lead.email.toLowerCase().includes(query) ||
        lead.apartment_name.toLowerCase().includes(query) ||
        lead.city.toLowerCase().includes(query) ||
        (lead.phone && lead.phone.toLowerCase().includes(query))
      );
    }

    setFilteredLeads(filtered);
  }

  function handleEdit(lead: Lead) {
    setEditingLead(lead);
    setFormData({
      name: lead.name,
      email: lead.email,
      phone: lead.phone || '',
      apartment_name: lead.apartment_name,
      city: lead.city,
      message: lead.message || '',
      status: lead.status,
      notes: lead.notes || '',
    });
    setShowForm(true);
  }

  function resetForm() {
    setFormData({
      name: '',
      email: '',
      phone: '',
      apartment_name: '',
      city: '',
      message: '',
      status: 'new',
      notes: '',
    });
    setEditingLead(null);
    setShowForm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingLead) {
        // Update existing lead
        const { error: updateError } = await supabase
          .from('marketing_leads')
          .update({
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim() || null,
            apartment_name: formData.apartment_name.trim(),
            city: formData.city.trim(),
            message: formData.message.trim() || null,
            status: formData.status,
            notes: formData.notes.trim() || null,
          })
          .eq('id', editingLead.id);

        if (updateError) throw updateError;
        setSuccessMessage('Lead updated successfully');
      } else {
        // Create new lead
        const { error: insertError } = await supabase
          .from('marketing_leads')
          .insert([{
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim() || null,
            apartment_name: formData.apartment_name.trim(),
            city: formData.city.trim(),
            message: formData.message.trim() || null,
            status: formData.status,
            notes: formData.notes.trim() || null,
          }]);

        if (insertError) throw insertError;
        setSuccessMessage('Lead created successfully');
      }

      await loadLeads();
      resetForm();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error saving lead:', err);
      setError(err instanceof Error ? err.message : 'Failed to save lead');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
      return;
    }

    setDeleting(id);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('marketing_leads')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setSuccessMessage('Lead deleted successfully');
      await loadLeads();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error deleting lead:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete lead');
    } finally {
      setDeleting(null);
    }
  }

  async function quickStatusUpdate(leadId: string, newStatus: LeadStatus) {
    try {
      const { error: updateError } = await supabase
        .from('marketing_leads')
        .update({ status: newStatus })
        .eq('id', leadId);

      if (updateError) throw updateError;

      await loadLeads();
      setSuccessMessage('Status updated successfully');
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  const statusCounts = leads.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-amber-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="w-7 h-7 sm:w-8 sm:h-8 text-amber-600" />
            Lead Management
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Manage and track all potential customers
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add New Lead
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const Icon = config.icon;
          const count = statusCounts[status] || 0;
          return (
            <div
              key={status}
              className={`${config.bgColor} rounded-lg p-3 sm:p-4 cursor-pointer hover:shadow-md transition-shadow`}
              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status as LeadStatus)}
            >
              <div className="flex items-center justify-between mb-1">
                <Icon className={`w-4 h-4 ${config.color}`} />
                <span className={`text-xl sm:text-2xl font-bold ${config.color}`}>{count}</span>
              </div>
              <p className={`text-xs font-medium ${config.color}`}>{config.label}</p>
            </div>
          );
        })}
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, apartment, or phone..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as LeadStatus | 'all')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="all">All Status ({leads.length})</option>
              {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                <option key={status} value={status}>
                  {config.label} ({statusCounts[status] || 0})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Lead Info</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden md:table-cell">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden lg:table-cell">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden sm:table-cell">Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    {searchQuery || statusFilter !== 'all'
                      ? 'No leads found matching your filters'
                      : 'No leads yet. Add your first lead to get started!'}
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const statusConfig = STATUS_CONFIG[lead.status];
                  const StatusIcon = statusConfig.icon;
                  return (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-semibold text-gray-900">{lead.name}</p>
                          <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                            <Building2 className="w-3 h-3" />
                            {lead.apartment_name}
                          </p>
                          {lead.message && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">{lead.message}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <div className="space-y-1">
                          <p className="text-sm text-gray-900 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-gray-400" />
                            {lead.email}
                          </p>
                          {lead.phone && (
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-gray-400" />
                              {lead.phone}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <div className="flex items-center gap-1 text-sm text-gray-700">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          {lead.city}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <select
                          value={lead.status}
                          onChange={(e) => quickStatusUpdate(lead.id, e.target.value as LeadStatus)}
                          className={`${statusConfig.bgColor} ${statusConfig.color} text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-amber-500`}
                        >
                          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                            <option key={status} value={status}>
                              {config.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {formatDate(lead.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(lead)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit lead"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(lead.id)}
                            disabled={deleting === lead.id}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete lead"
                          >
                            {deleting === lead.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => resetForm()}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingLead ? 'Edit Lead' : 'Add New Lead'}
              </h2>
              <button
                onClick={() => resetForm()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as LeadStatus })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                      <option key={status} value={status}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Apartment Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.apartment_name}
                    onChange={(e) => setFormData({ ...formData, apartment_name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Society name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="City name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Lead's message or inquiry..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Internal Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Internal notes for follow-up..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => resetForm()}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingLead ? 'Update Lead' : 'Create Lead'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
