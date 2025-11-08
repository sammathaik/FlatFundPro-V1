import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader2, X, Check, Home, Building2 } from 'lucide-react';
import { supabase, BuildingBlockPhase, FlatNumber } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { logAudit } from '../../lib/utils';

export default function BuildingManagement() {
  const { adminData } = useAuth();
  const [buildings, setBuildings] = useState<BuildingBlockPhase[]>([]);
  const [flats, setFlats] = useState<FlatNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuildingModal, setShowBuildingModal] = useState(false);
  const [showFlatModal, setShowFlatModal] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<BuildingBlockPhase | null>(null);
  const [editingFlat, setEditingFlat] = useState<FlatNumber | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);

  const [buildingForm, setBuildingForm] = useState({
    block_name: '',
    type: 'Block' as 'Block' | 'Building' | 'Phase' | 'Tower' | 'Wing',
  });

  const [flatForm, setFlatForm] = useState({
    block_id: '',
    flat_number: '',
  });

  const [error, setError] = useState('');

  useEffect(() => {
    if (adminData?.apartment_id) {
      loadBuildings();
      loadFlats();
    }
  }, [adminData]);

  async function loadBuildings() {
    if (!adminData?.apartment_id) return;

    try {
      const { data, error } = await supabase
        .from('buildings_blocks_phases')
        .select('*')
        .eq('apartment_id', adminData.apartment_id)
        .order('block_name');

      if (error) throw error;
      setBuildings(data || []);
      if (data && data.length > 0 && !selectedBuilding) {
        setSelectedBuilding(data[0].id);
      }
    } catch (error) {
      console.error('Error loading buildings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadFlats() {
    if (!adminData?.apartment_id) return;

    try {
      const { data: buildingIds } = await supabase
        .from('buildings_blocks_phases')
        .select('id')
        .eq('apartment_id', adminData.apartment_id);

      if (!buildingIds || buildingIds.length === 0) {
        setFlats([]);
        return;
      }

      const { data, error } = await supabase
        .from('flat_numbers')
        .select('*')
        .in('block_id', buildingIds.map((b) => b.id))
        .order('flat_number');

      if (error) throw error;
      setFlats(data || []);
    } catch (error) {
      console.error('Error loading flats:', error);
    }
  }

  function openBuildingModal(building?: BuildingBlockPhase) {
    if (building) {
      setEditingBuilding(building);
      setBuildingForm({
        block_name: building.block_name,
        type: building.type,
      });
    } else {
      setEditingBuilding(null);
      setBuildingForm({ block_name: '', type: 'Block' });
    }
    setError('');
    setShowBuildingModal(true);
  }

  function openFlatModal(flat?: FlatNumber) {
    if (flat) {
      setEditingFlat(flat);
      setFlatForm({
        block_id: flat.block_id,
        flat_number: flat.flat_number,
      });
    } else {
      setEditingFlat(null);
      setFlatForm({
        block_id: selectedBuilding || (buildings[0]?.id || ''),
        flat_number: '',
      });
    }
    setError('');
    setShowFlatModal(true);
  }

  async function handleBuildingSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!adminData?.apartment_id) return;

    try {
      if (editingBuilding) {
        const { error } = await supabase
          .from('buildings_blocks_phases')
          .update({
            block_name: buildingForm.block_name.trim(),
            type: buildingForm.type,
          })
          .eq('id', editingBuilding.id);

        if (error) throw error;
        await logAudit('update', 'buildings_blocks_phases', editingBuilding.id, buildingForm);
      } else {
        const { data, error } = await supabase
          .from('buildings_blocks_phases')
          .insert([{
            apartment_id: adminData.apartment_id,
            block_name: buildingForm.block_name.trim(),
            type: buildingForm.type,
          }])
          .select()
          .single();

        if (error) throw error;
        await logAudit('create', 'buildings_blocks_phases', data.id, buildingForm);
      }

      setShowBuildingModal(false);
      loadBuildings();
    } catch (error: any) {
      setError(error.message || 'Failed to save building');
    }
  }

  async function handleFlatSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      if (editingFlat) {
        const { error } = await supabase
          .from('flat_numbers')
          .update({
            block_id: flatForm.block_id,
            flat_number: flatForm.flat_number.trim(),
          })
          .eq('id', editingFlat.id);

        if (error) throw error;
        await logAudit('update', 'flat_numbers', editingFlat.id, flatForm);
      } else {
        const { data, error } = await supabase
          .from('flat_numbers')
          .insert([{
            block_id: flatForm.block_id,
            flat_number: flatForm.flat_number.trim(),
          }])
          .select()
          .single();

        if (error) throw error;
        await logAudit('create', 'flat_numbers', data.id, flatForm);
      }

      setShowFlatModal(false);
      loadFlats();
    } catch (error: any) {
      setError(error.message || 'Failed to save flat');
    }
  }

  async function deleteBuilding(building: BuildingBlockPhase) {
    const flatsInBuilding = flats.filter((f) => f.block_id === building.id);

    if (flatsInBuilding.length > 0) {
      if (!confirm(`This will delete ${flatsInBuilding.length} flat(s) associated with "${building.block_name}". Continue?`)) {
        return;
      }
    } else {
      if (!confirm(`Delete "${building.block_name}"?`)) return;
    }

    try {
      const { error } = await supabase
        .from('buildings_blocks_phases')
        .delete()
        .eq('id', building.id);

      if (error) throw error;
      await logAudit('delete', 'buildings_blocks_phases', building.id, { name: building.block_name });
      loadBuildings();
      loadFlats();
    } catch (error: any) {
      alert('Error deleting building: ' + error.message);
    }
  }

  async function deleteFlat(flat: FlatNumber) {
    if (!confirm(`Delete flat "${flat.flat_number}"?`)) return;

    try {
      const { error } = await supabase
        .from('flat_numbers')
        .delete()
        .eq('id', flat.id);

      if (error) throw error;
      await logAudit('delete', 'flat_numbers', flat.id, { flat_number: flat.flat_number });
      loadFlats();
    } catch (error: any) {
      alert('Error deleting flat: ' + error.message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
      </div>
    );
  }

  const selectedBuildingFlats = flats.filter((f) => f.block_id === selectedBuilding);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Buildings & Flats Management</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Buildings/Blocks/Phases</h3>
            <button
              onClick={() => openBuildingModal()}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          <div className="space-y-2">
            {buildings.map((building) => (
              <div
                key={building.id}
                onClick={() => setSelectedBuilding(building.id)}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedBuilding === building.id
                    ? 'bg-amber-100 border-2 border-amber-600'
                    : 'bg-white border-2 border-transparent hover:border-gray-300'
                }`}
              >
                <div>
                  <p className="font-medium text-gray-900">{building.block_name}</p>
                  <p className="text-xs text-gray-500">{building.type}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openBuildingModal(building);
                    }}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteBuilding(building);
                    }}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {buildings.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Building2 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No buildings added yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              Flat Numbers
              {selectedBuilding && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  ({buildings.find((b) => b.id === selectedBuilding)?.block_name})
                </span>
              )}
            </h3>
            <button
              onClick={() => openFlatModal()}
              disabled={buildings.length === 0}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {selectedBuildingFlats.map((flat) => (
              <div
                key={flat.id}
                className="bg-white border border-gray-200 rounded-lg p-3 group hover:border-amber-500 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900">{flat.flat_number}</span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openFlatModal(flat)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deleteFlat(flat)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {selectedBuildingFlats.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Home className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>
                {selectedBuilding
                  ? 'No flats added to this building'
                  : 'Select a building to view flats'}
              </p>
            </div>
          )}
        </div>
      </div>

      {showBuildingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {editingBuilding ? 'Edit Building' : 'Add Building'}
              </h3>
              <button onClick={() => setShowBuildingModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleBuildingSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={buildingForm.block_name}
                  onChange={(e) => setBuildingForm({ ...buildingForm, block_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="e.g., Block A, North Tower"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={buildingForm.type}
                  onChange={(e) => setBuildingForm({ ...buildingForm, type: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="Block">Block</option>
                  <option value="Building">Building</option>
                  <option value="Phase">Phase</option>
                  <option value="Tower">Tower</option>
                  <option value="Wing">Wing</option>
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
                  onClick={() => setShowBuildingModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  <Check className="w-4 h-4" />
                  {editingBuilding ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFlatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {editingFlat ? 'Edit Flat' : 'Add Flat'}
              </h3>
              <button onClick={() => setShowFlatModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleFlatSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Building/Block <span className="text-red-500">*</span>
                </label>
                <select
                  value={flatForm.block_id}
                  onChange={(e) => setFlatForm({ ...flatForm, block_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                >
                  <option value="">-- Select --</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.block_name} ({building.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Flat Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={flatForm.flat_number}
                  onChange={(e) => setFlatForm({ ...flatForm, flat_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="e.g., 101, A-205"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowFlatModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  <Check className="w-4 h-4" />
                  {editingFlat ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
