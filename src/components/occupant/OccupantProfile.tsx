import { useState } from 'react';
import { User, Building, Mail, Phone, Edit2, Save, X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import MobileNumberInput from '../MobileNumberInput';
import { normalizeMobileNumber } from '../../lib/mobileNumberUtils';

interface OccupantProfileProps {
  occupant: any;
  apartmentInfo: { apartment_name: string; block_name: string; flat_number: string } | null;
  onProfileUpdate?: () => void;
}

export default function OccupantProfile({ occupant, apartmentInfo, onProfileUpdate }: OccupantProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMobile, setEditedMobile] = useState(occupant.mobile || '');
  const [editedEmail, setEditedEmail] = useState(occupant.email || '');
  const [editedName, setEditedName] = useState(occupant.name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    setSuccessMessage(null);

    const normalizedMobile = normalizeMobileNumber(editedMobile);

    if (editedMobile && (!normalizedMobile.localNumber || normalizedMobile.localNumber.length !== 10)) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (editedEmail && !emailRegex.test(editedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setSaving(true);

    try {
      // Get session token from sessionStorage
      const sessionData = sessionStorage.getItem('occupant_session');
      if (!sessionData) {
        throw new Error('Session not found. Please log in again.');
      }
      const sessionObj = JSON.parse(sessionData);

      const { data, error: updateError } = await supabase.rpc('update_occupant_profile', {
        p_session_token: sessionObj.sessionToken,
        p_flat_id: occupant.flat_id,
        p_email: editedEmail || null,
        p_name: editedName || null,
        p_mobile: editedMobile || null
      });

      if (updateError) throw updateError;

      if (!data) {
        throw new Error('Failed to update profile. Please try again.');
      }

      occupant.mobile = editedMobile;
      occupant.email = editedEmail;
      occupant.name = editedName;

      sessionStorage.setItem('occupant_session', JSON.stringify(occupant));

      setSuccessMessage('Profile updated successfully!');
      setIsEditing(false);

      if (onProfileUpdate) {
        onProfileUpdate();
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedMobile(occupant.mobile || '');
    setEditedEmail(occupant.email || '');
    setEditedName(occupant.name || '');
    setError(null);
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Your Profile</h2>
            <p className="text-blue-100 text-sm">Manage your personal information</p>
          </div>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-all backdrop-blur-sm font-medium"
          >
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </button>
        )}
      </div>

      <div className="p-6">
        {successMessage && (
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-start gap-3 mb-6">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800 font-medium">{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3 mb-6">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-500" />
                  <label className="text-sm font-semibold text-gray-700">Name</label>
                </div>
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="Enter your name"
                />
              ) : (
                <p className="font-medium text-gray-900 mt-1">{occupant.name || 'Not provided'}</p>
              )}
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Building className="w-5 h-5 text-blue-600" />
                <label className="text-sm font-semibold text-gray-700">Occupant Type</label>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-blue-600 text-white text-sm font-semibold rounded-full">
                  {occupant.occupant_type}
                </span>
                <div className="relative group">
                  <Info className="w-4 h-4 text-blue-600 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded-lg p-2 z-10">
                    This field is managed by your committee. Contact them for any changes.
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Building className="w-5 h-5 text-blue-600" />
                <label className="text-sm font-semibold text-gray-700">Apartment & Block</label>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900">
                  {apartmentInfo?.apartment_name} - {apartmentInfo?.block_name}
                </p>
                <div className="relative group">
                  <Info className="w-4 h-4 text-blue-600 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded-lg p-2 z-10">
                    This field is managed by your committee. Contact them for any changes.
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Building className="w-5 h-5 text-blue-600" />
                <label className="text-sm font-semibold text-gray-700">Flat Number</label>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900">{apartmentInfo?.flat_number}</p>
                <div className="relative group">
                  <Info className="w-4 h-4 text-blue-600 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded-lg p-2 z-10">
                    This field is managed by your committee. Contact them for any changes.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-gray-500" />
                  <label className="text-sm font-semibold text-gray-700">Email Address</label>
                </div>
                {!isEditing && (
                  <div className="relative group">
                    <Info className="w-4 h-4 text-gray-500 cursor-help" />
                    <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded-lg p-2 z-10">
                      Your email is used for payment acknowledgments and important updates.
                    </div>
                  </div>
                )}
              </div>
              {isEditing ? (
                <input
                  type="email"
                  value={editedEmail}
                  onChange={(e) => setEditedEmail(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="your.email@example.com"
                />
              ) : (
                <p className="font-medium text-gray-900 mt-1 break-all">{occupant.email || 'Not provided'}</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-gray-500" />
                  <label className="text-sm font-semibold text-gray-700">Mobile Number</label>
                </div>
                {!isEditing && (
                  <div className="relative group">
                    <Info className="w-4 h-4 text-gray-500 cursor-help" />
                    <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded-lg p-2 z-10">
                      Your mobile number is used for payment updates and WhatsApp notifications.
                    </div>
                  </div>
                )}
              </div>
              {isEditing ? (
                <MobileNumberInput
                  value={editedMobile}
                  onChange={setEditedMobile}
                  placeholder="Enter mobile number"
                />
              ) : (
                <p className="font-medium text-gray-900 mt-1">{occupant.mobile || 'Not provided'}</p>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="flex items-center gap-3 pt-4 border-t-2 border-gray-200">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-md"
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Changes
                  </>
                )}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50"
              >
                <X className="w-5 h-5" />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
