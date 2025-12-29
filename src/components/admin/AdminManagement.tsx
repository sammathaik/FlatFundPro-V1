import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Download, Loader2, X, Check } from 'lucide-react';
import { supabase, Admin, Apartment } from '../../lib/supabase';
import { exportToCSV, logAudit, formatDateTime } from '../../lib/utils';

interface AdminWithApartment extends Admin {
  apartment?: Apartment;
}

export default function AdminManagement() {
  const [admins, setAdmins] = useState<AdminWithApartment[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminWithApartment | null>(null);
  const [formData, setFormData] = useState({
    admin_name: '',
    admin_email: '',
    phone: '',
    apartment_id: '',
    status: 'active' as 'active' | 'inactive',
    password: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [adminsResult, apartmentsResult] = await Promise.all([
        supabase
          .from('admins')
          .select('*, apartment:apartments(*)')
          .order('admin_name'),
        supabase
          .from('apartments')
          .select('*')
          .eq('status', 'active')
          .order('apartment_name'),
      ]);

      if (adminsResult.error) throw adminsResult.error;
      if (apartmentsResult.error) throw apartmentsResult.error;

      setAdmins(adminsResult.data || []);
      setApartments(apartmentsResult.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingAdmin(null);
    setFormData({
      admin_name: '',
      admin_email: '',
      phone: '',
      apartment_id: '',
      status: 'active',
      password: '',
    });
    setError('');
    setShowModal(true);
  }

  function openEditModal(admin: AdminWithApartment) {
    setEditingAdmin(admin);
    setFormData({
      admin_name: admin.admin_name,
      admin_email: admin.admin_email,
      phone: admin.phone || '',
      apartment_id: admin.apartment_id,
      status: admin.status,
      password: '',
    });
    setError('');
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      if (editingAdmin) {
        const updateData: any = {
          admin_name: formData.admin_name.trim(),
          admin_email: formData.admin_email.trim(),
          phone: formData.phone.trim() || null,
          apartment_id: formData.apartment_id,
          status: formData.status,
        };

        const { error } = await supabase
          .from('admins')
          .update(updateData)
          .eq('id', editingAdmin.id);

        if (error) throw error;

        if (formData.password && editingAdmin.user_id) {
          const { error: passwordError } = await supabase.auth.admin.updateUserById(
            editingAdmin.user_id,
            { password: formData.password }
          );
          if (passwordError) console.error('Password update error:', passwordError);
        }

        await logAudit('update', 'admins', editingAdmin.id, { name: formData.admin_name });
      } else {
        // Use Edge Function to create admin with proper service role permissions
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('You must be logged in to create admins');
        }

        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-admin`;
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            admin_name: formData.admin_name.trim(),
            admin_email: formData.admin_email.trim(),
            phone: formData.phone.trim() || undefined,
            apartment_id: formData.apartment_id,
            status: formData.status,
            password: formData.password,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to create admin');
        }

        await logAudit('create', 'admins', result.data.id, { name: formData.admin_name, email: formData.admin_email });
      }

      setShowModal(false);
      loadData();
    } catch (error: any) {
      setError(error.message || 'Failed to save admin');
    }
  }

  async function handleDelete(admin: AdminWithApartment) {
    if (!confirm(`Are you sure you want to delete admin "${admin.admin_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('admins')
        .delete()
        .eq('id', admin.id);

      if (error) throw error;

      if (admin.user_id) {
        await supabase.auth.admin.deleteUser(admin.user_id);
      }

      await logAudit('delete', 'admins', admin.id, { name: admin.admin_name });
      loadData();
    } catch (error: any) {
      alert('Error deleting admin: ' + error.message);
    }
  }

  function handleExport() {
    const exportData = admins.map(admin => ({
      name: admin.admin_name,
      email: admin.admin_email,
      phone: admin.phone || '',
      apartment: admin.apartment?.apartment_name || '',
      status: admin.status,
      created_at: admin.created_at,
    }));
    exportToCSV(exportData, 'admins');
    logAudit('export', 'admins', undefined, { count: admins.length });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Admin Management</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage apartment administrators (one admin per apartment)</p>
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
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors font-medium text-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Admin</span>
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
                    Admin Name
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                    Email
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                    Phone
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                    Apartment
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {admin.admin_name}
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {admin.admin_email}
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {admin.phone || '-'}
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-sm text-gray-900 font-medium whitespace-nowrap">
                      {admin.apartment?.apartment_name || '-'}
                    </td>
                    <td className="px-3 sm:px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                          admin.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {admin.status}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        <button
                          onClick={() => openEditModal(admin)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(admin)}
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

        {admins.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No admins found. Click "Add Admin" to create one.
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-gray-900">
                {editingAdmin ? 'Edit Admin' : 'Add New Admin'}
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
                  Admin Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.admin_name}
                  onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.admin_email}
                  onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="admin@example.com"
                  required
                  disabled={!!editingAdmin}
                />
                {editingAdmin && (
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed after creation</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Apartment <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.apartment_id}
                  onChange={(e) => setFormData({ ...formData, apartment_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">-- Select Apartment --</option>
                  {apartments.map((apt) => (
                    <option key={apt.id} value={apt.id}>
                      {apt.apartment_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password {!editingAdmin && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={editingAdmin ? 'Leave blank to keep current password' : 'Min. 6 characters'}
                  required={!editingAdmin}
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  <Check className="w-4 h-4" />
                  {editingAdmin ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
