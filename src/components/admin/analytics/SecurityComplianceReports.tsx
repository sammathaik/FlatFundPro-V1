import React, { useEffect, useState } from 'react';
import { Download, Shield, Search, Filter } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { formatDate, exportToCSV, exportToExcel, exportToPDF } from '../../../lib/exportUtils';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values: any;
  new_values: any;
  admin_id: string;
  admin_email: string;
  created_at: string;
}

interface Props {
  buildingId: string;
}

export default function SecurityComplianceReports({ buildingId }: Props) {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadAuditLogs();
  }, [buildingId, dateRange]);

  useEffect(() => {
    filterLogs();
  }, [auditLogs, searchTerm, filterAction, filterEntity]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          admins!inner(email, building_id)
        `)
        .eq('admins.building_id', buildingId)
        .gte('created_at', dateRange.startDate)
        .lte('created_at', dateRange.endDate + 'T23:59:59')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      const formattedLogs = (data || []).map((log: any) => ({
        id: log.id,
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        old_values: log.old_values,
        new_values: log.new_values,
        admin_id: log.admin_id,
        admin_email: log.admins?.email || 'Unknown',
        created_at: log.created_at
      }));

      setAuditLogs(formattedLogs);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...auditLogs];

    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.admin_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entity_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterAction !== 'all') {
      filtered = filtered.filter(log => log.action === filterAction);
    }

    if (filterEntity !== 'all') {
      filtered = filtered.filter(log => log.entity_type === filterEntity);
    }

    setFilteredLogs(filtered);
  };

  const uniqueActions = Array.from(new Set(auditLogs.map(log => log.action)));
  const uniqueEntities = Array.from(new Set(auditLogs.map(log => log.entity_type)));

  const actionCounts = {
    create: auditLogs.filter(log => log.action === 'create').length,
    update: auditLogs.filter(log => log.action === 'update').length,
    delete: auditLogs.filter(log => log.action === 'delete').length,
    verify: auditLogs.filter(log => log.action === 'verify' || log.action === 'reject').length
  };

  const handleExportCSV = () => {
    if (!filteredLogs.length) return;
    const exportData = filteredLogs.map(log => ({
      'Date': formatDate(log.created_at),
      'Time': new Date(log.created_at).toLocaleTimeString(),
      'Admin': log.admin_email,
      'Action': log.action,
      'Entity Type': log.entity_type,
      'Entity ID': log.entity_id
    }));
    exportToCSV(exportData, 'audit_logs');
  };

  const handleExportExcel = () => {
    if (!filteredLogs.length) return;
    const exportData = filteredLogs.map(log => ({
      'Date': formatDate(log.created_at),
      'Time': new Date(log.created_at).toLocaleTimeString(),
      'Admin': log.admin_email,
      'Action': log.action,
      'Entity Type': log.entity_type,
      'Entity ID': log.entity_id
    }));
    exportToExcel(exportData, 'audit_logs');
  };

  const handleExportPDF = () => {
    exportToPDF('security-compliance-report', 'Security & Compliance Report');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Security & Compliance Reports</h2>
          <p className="text-gray-600 mt-1">Track all administrative actions and system changes</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 no-print"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      <div id="security-compliance-report" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Total Actions</div>
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{auditLogs.length}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-2">Creates</div>
            <div className="text-2xl font-bold text-green-600">{actionCounts.create}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-2">Updates</div>
            <div className="text-2xl font-bold text-blue-600">{actionCounts.update}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-2">Verifications</div>
            <div className="text-2xl font-bold text-purple-600">{actionCounts.verify}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Actions</option>
                {uniqueActions.map(action => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={filterEntity}
                onChange={(e) => setFilterEntity(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Entity Types</option>
                {uniqueEntities.map(entity => (
                  <option key={entity} value={entity}>{entity}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Date & Time</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Admin</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Action</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Entity Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-700">
                      <div>{formatDate(log.created_at)}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">{log.admin_email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        log.action === 'create' ? 'bg-green-100 text-green-800' :
                        log.action === 'update' ? 'bg-blue-100 text-blue-800' :
                        log.action === 'delete' ? 'bg-red-100 text-red-800' :
                        log.action === 'verify' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 capitalize">
                      {log.entity_type.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      <div className="max-w-xs truncate">
                        {log.new_values && typeof log.new_values === 'object' ? (
                          <div className="text-xs">
                            {Object.entries(log.new_values).slice(0, 2).map(([key, value]) => (
                              <div key={key}>
                                <span className="font-medium">{key}:</span> {String(value)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">No details</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No audit logs found matching your criteria</p>
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Security Best Practices</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• All administrative actions are automatically logged and cannot be deleted</li>
                <li>• Regular audit reviews help identify unusual activity patterns</li>
                <li>• Export logs regularly for compliance and backup purposes</li>
                <li>• Monitor verification actions to ensure payment integrity</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
