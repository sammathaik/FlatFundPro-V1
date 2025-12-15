import { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, Shield, Coins, Calendar, Bell, AlertTriangle, Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  setting_type: string;
  description: string;
  is_public: boolean;
  updated_at: string;
}

interface SettingFormData {
  [key: string]: any;
}

export default function SystemSettings() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [formData, setFormData] = useState<SettingFormData>({});
  const [activeTab, setActiveTab] = useState<string>('general');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('setting_type', { ascending: true });

      if (error) throw error;

      setSettings(data || []);

      const initialFormData: SettingFormData = {};
      (data || []).forEach(setting => {
        initialFormData[setting.setting_key] = setting.setting_value;
      });
      setFormData(initialFormData);
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (settingKey: string, value: any) => {
    setSaving(settingKey);
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ setting_value: value })
        .eq('setting_key', settingKey);

      if (error) throw error;

      await supabase.rpc('log_audit_event', {
        p_action: 'update',
        p_table_name: 'system_settings',
        p_entity_name: settingKey,
        p_details: { old_value: formData[settingKey], new_value: value },
        p_status: 'success'
      });

      setMessage({ type: 'success', text: `${settingKey} updated successfully` });
      await fetchSettings();
    } catch (error: any) {
      console.error('Error updating setting:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleInputChange = (settingKey: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [settingKey]: {
        ...prev[settingKey],
        [field]: value
      }
    }));
  };

  const handleToggle = (settingKey: string, field: string) => {
    const newValue = {
      ...formData[settingKey],
      [field]: !formData[settingKey]?.[field]
    };
    setFormData(prev => ({
      ...prev,
      [settingKey]: newValue
    }));
    updateSetting(settingKey, newValue);
  };

  const handleSave = (settingKey: string) => {
    updateSetting(settingKey, formData[settingKey]);
  };

  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.setting_type]) {
      acc[setting.setting_type] = [];
    }
    acc[setting.setting_type].push(setting);
    return acc;
  }, {} as { [key: string]: SystemSetting[] });

  const renderSettingInput = (setting: SystemSetting) => {
    const value = formData[setting.setting_key];

    switch (setting.setting_key) {
      case 'currency':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency Code</label>
              <input
                type="text"
                value={value?.code || ''}
                onChange={(e) => handleInputChange(setting.setting_key, 'code', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="INR"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
              <input
                type="text"
                value={value?.symbol || ''}
                onChange={(e) => handleInputChange(setting.setting_key, 'symbol', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="₹"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={value?.name || ''}
                onChange={(e) => handleInputChange(setting.setting_key, 'name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Indian Rupee"
              />
            </div>
          </div>
        );

      case 'date_format':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
              <select
                value={value?.format || 'DD/MM/YYYY'}
                onChange={(e) => handleInputChange(setting.setting_key, 'format', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
        );

      case 'payment_reminder_days':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={value?.enabled || false}
                onChange={() => handleToggle(setting.setting_key, 'enabled')}
                className="h-4 w-4 text-blue-600"
              />
              <label className="text-sm font-medium text-gray-700">Enable Reminders</label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Days Before Due Date</label>
              <input
                type="text"
                value={(value?.days || []).join(', ')}
                onChange={(e) => handleInputChange(setting.setting_key, 'days', e.target.value.split(',').map((d: string) => parseInt(d.trim())).filter((d: number) => !isNaN(d)))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="7, 3, 1"
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated list of days</p>
            </div>
          </div>
        );

      case 'late_payment_fee':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={value?.enabled || false}
                onChange={() => handleToggle(setting.setting_key, 'enabled')}
                className="h-4 w-4 text-blue-600"
              />
              <label className="text-sm font-medium text-gray-700">Enable Late Fees</label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Percentage (%)</label>
              <input
                type="number"
                value={value?.percentage || 0}
                onChange={(e) => handleInputChange(setting.setting_key, 'percentage', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="0"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fixed Amount</label>
              <input
                type="number"
                value={value?.fixed_amount || 0}
                onChange={(e) => handleInputChange(setting.setting_key, 'fixed_amount', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="0"
              />
            </div>
          </div>
        );

      case 'payment_grace_period_days':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grace Period (Days)</label>
            <input
              type="number"
              value={value?.days || 0}
              onChange={(e) => handleInputChange(setting.setting_key, 'days', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="0"
            />
          </div>
        );

      case 'email_notifications_enabled':
      case 'sms_notifications_enabled':
        return (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value?.enabled || false}
              onChange={() => handleToggle(setting.setting_key, 'enabled')}
              className="h-4 w-4 text-blue-600"
            />
            <label className="text-sm font-medium text-gray-700">Enable Notifications</label>
          </div>
        );

      case 'system_name':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">System Name</label>
            <input
              type="text"
              value={value?.name || ''}
              onChange={(e) => handleInputChange(setting.setting_key, 'name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="FlatFund Pro"
            />
          </div>
        );

      case 'maintenance_mode':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={value?.enabled || false}
                onChange={() => handleToggle(setting.setting_key, 'enabled')}
                className="h-4 w-4 text-red-600"
              />
              <label className="text-sm font-medium text-gray-700">Enable Maintenance Mode</label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={value?.message || ''}
                onChange={(e) => handleInputChange(setting.setting_key, 'message', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="System is under maintenance"
              />
            </div>
          </div>
        );

      case 'max_payment_amount':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Amount</label>
            <input
              type="number"
              value={value?.amount || 0}
              onChange={(e) => handleInputChange(setting.setting_key, 'amount', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="0"
            />
          </div>
        );

      default:
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Value (JSON)</label>
            <textarea
              value={JSON.stringify(value, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setFormData(prev => ({ ...prev, [setting.setting_key]: parsed }));
                } catch (err) {
                  // Invalid JSON, don't update
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
              rows={4}
            />
          </div>
        );
    }
  };

  const getTabIcon = (type: string) => {
    switch (type) {
      case 'general':
        return Settings;
      case 'payment':
        return Coins;
      case 'notification':
        return Bell;
      default:
        return Shield;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-7 h-7 text-blue-600" />
            System Settings
          </h2>
          <p className="text-gray-600 mt-1">Configure system-wide settings and preferences</p>
        </div>
        <button
          onClick={fetchSettings}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {message && (
        <div className={`flex items-center gap-2 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <Check className="w-5 h-5" />
          ) : (
            <X className="w-5 h-5" />
          )}
          {message.text}
        </div>
      )}

      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {Object.keys(groupedSettings).map((type) => {
            const Icon = getTabIcon(type);
            return (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium transition-colors ${
                  activeTab === type
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="space-y-4">
        {groupedSettings[activeTab]?.map((setting) => (
          <div key={setting.id} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{setting.setting_key}</h3>
                <p className="text-sm text-gray-600 mt-1">{setting.description}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    setting.is_public ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {setting.is_public ? 'Public' : 'Private'}
                  </span>
                  <span className="text-xs text-gray-500">
                    Updated: {new Date(setting.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-4">
              {renderSettingInput(setting)}
            </div>

            {!['email_notifications_enabled', 'sms_notifications_enabled', 'payment_reminder_days'].includes(setting.setting_key) && (
              <button
                onClick={() => handleSave(setting.setting_key)}
                disabled={saving === setting.setting_key}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving === setting.setting_key ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
