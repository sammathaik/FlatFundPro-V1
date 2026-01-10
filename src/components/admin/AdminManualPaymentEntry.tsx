import { useState, useEffect } from 'react';
import { X, Save, CheckCircle, AlertCircle, Building2, User, CreditCard, MessageCircle, ArrowRight, ArrowLeft, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import MobileNumberInput from '../MobileNumberInput';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

interface AdminManualPaymentEntryProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface Block {
  id: string;
  block_name: string;
}

interface Flat {
  id: string;
  flat_number: string;
}

interface Collection {
  id: string;
  collection_name: string;
  due_date: string;
  amount_per_flat: number;
  late_fine_per_day: number;
}

interface FlatMapping {
  name: string;
  email: string;
  mobile: string;
  occupant_type: 'Owner' | 'Tenant';
  whatsapp_optin: boolean;
}

const PAYMENT_MODES = [
  'UPI',
  'NEFT',
  'RTGS',
  'IMPS',
  'Cash',
  'Cheque',
  'Bank Transfer'
];

export default function AdminManualPaymentEntry({ onClose, onSuccess }: AdminManualPaymentEntryProps) {
  const { adminData, user } = useAuth();

  // Step state
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Flat Selection
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState('');
  const [selectedFlatId, setSelectedFlatId] = useState('');

  // Step 2: Occupant Details
  const [occupantName, setOccupantName] = useState('');
  const [occupantType, setOccupantType] = useState<'Owner' | 'Tenant'>('Owner');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [whatsappOptin, setWhatsappOptin] = useState(false);

  // Step 3: Collection & Amount
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [calculatedAmount, setCalculatedAmount] = useState<number>(0);
  const [lateFine, setLateFine] = useState<number>(0);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [amountAdjustmentReason, setAmountAdjustmentReason] = useState('');

  // Step 4: Payment Details
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [transactionReference, setTransactionReference] = useState('');
  const [remarks, setRemarks] = useState('');

  // UI State
  const [loading, setLoading] = useState(false);
  const [loadingOccupant, setLoadingOccupant] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (adminData?.apartment_id) {
      loadBlocks();
      loadCollections();
    }
  }, [adminData]);

  useEffect(() => {
    if (selectedBlockId) {
      loadFlats(selectedBlockId);
    } else {
      setFlats([]);
      setSelectedFlatId('');
    }
  }, [selectedBlockId]);

  useEffect(() => {
    if (selectedFlatId && selectedBlockId && adminData?.apartment_id) {
      loadOccupantDetails();
    }
  }, [selectedFlatId, selectedBlockId]);

  useEffect(() => {
    if (selectedCollectionId) {
      calculateExpectedAmount();
    }
  }, [selectedCollectionId, paymentDate]);

  async function loadBlocks() {
    const { data } = await supabase
      .from('buildings_blocks_phases')
      .select('id, block_name')
      .eq('apartment_id', adminData!.apartment_id)
      .order('block_name');

    if (data) setBlocks(data);
  }

  async function loadFlats(blockId: string) {
    const { data } = await supabase
      .from('flat_numbers')
      .select('id, flat_number')
      .eq('block_id', blockId)
      .order('flat_number');

    if (data) setFlats(data);
  }

  async function loadCollections() {
    const { data } = await supabase
      .from('expected_collections')
      .select('*')
      .eq('apartment_id', adminData!.apartment_id)
      .eq('is_active', true)
      .order('due_date', { ascending: false });

    if (data) setCollections(data);
  }

  async function loadOccupantDetails() {
    setLoadingOccupant(true);
    try {
      const { data } = await supabase
        .from('flat_email_mappings')
        .select('name, email, mobile, occupant_type, whatsapp_optin')
        .eq('apartment_id', adminData!.apartment_id)
        .eq('block_id', selectedBlockId)
        .eq('flat_id', selectedFlatId)
        .maybeSingle();

      if (data) {
        setOccupantName(data.name || '');
        setEmail(data.email || '');
        setMobile(data.mobile || '');
        setOccupantType(data.occupant_type || 'Owner');
        setWhatsappOptin(data.whatsapp_optin || false);
      }
    } finally {
      setLoadingOccupant(false);
    }
  }

  function calculateExpectedAmount() {
    const collection = collections.find(c => c.id === selectedCollectionId);
    if (!collection) return;

    const expected = collection.amount_per_flat || 0;
    setCalculatedAmount(expected);

    const dueDate = new Date(collection.due_date);
    const payDate = new Date(paymentDate);

    if (payDate > dueDate) {
      const daysLate = Math.floor((payDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const fine = daysLate * (collection.late_fine_per_day || 0);
      setLateFine(fine);
    } else {
      setLateFine(0);
    }

    if (!paymentAmount) {
      setPaymentAmount(String(expected + lateFine));
    }
  }

  function validateStep(step: number): boolean {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!selectedBlockId) errors.block = 'Please select a building/block';
      if (!selectedFlatId) errors.flat = 'Please select a flat';
    }

    if (step === 2) {
      if (!occupantName.trim()) errors.name = 'Occupant name is required';
      if (!email.trim()) errors.email = 'Email is required';
      else if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
        errors.email = 'Please enter a valid email address';
      }
    }

    if (step === 3) {
      if (!selectedCollectionId) errors.collection = 'Please select a collection';
      if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
        errors.amount = 'Payment amount must be greater than zero';
      }
      const amountDiff = Math.abs(parseFloat(paymentAmount || '0') - (calculatedAmount + lateFine));
      if (amountDiff > 0.01 && !amountAdjustmentReason.trim()) {
        errors.amountReason = 'Please explain the amount adjustment';
      }
    }

    if (step === 4) {
      if (!paymentDate) errors.date = 'Payment date is required';
      if (!paymentMode) errors.mode = 'Payment mode is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleNextStep() {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
        setError('');
      } else {
        setShowConfirmation(true);
      }
    }
  }

  function handlePrevStep() {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  }

  async function handleSubmit() {
    if (!user || !adminData?.apartment_id) return;

    setLoading(true);
    setError('');

    try {
      const { data, error: rpcError } = await supabase.rpc('create_admin_manual_payment', {
        p_apartment_id: adminData.apartment_id,
        p_admin_user_id: user.id,
        p_block_id: selectedBlockId,
        p_flat_id: selectedFlatId,
        p_occupant_name: occupantName.trim(),
        p_occupant_type: occupantType,
        p_email: email.trim().toLowerCase(),
        p_mobile: mobile || null,
        p_whatsapp_optin: whatsappOptin,
        p_expected_collection_id: selectedCollectionId,
        p_payment_amount: parseFloat(paymentAmount),
        p_payment_date: paymentDate,
        p_payment_mode: paymentMode,
        p_transaction_reference: transactionReference.trim() || null,
        p_remarks: remarks.trim() || amountAdjustmentReason.trim() || null
      });

      if (rpcError) throw rpcError;

      if (data && !data.success) {
        setError(data.message || 'Failed to create payment record');
        setShowConfirmation(false);
        return;
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error creating manual payment:', err);
      setError(err.message || 'An unexpected error occurred');
      setShowConfirmation(false);
    } finally {
      setLoading(false);
    }
  }

  const selectedBlock = blocks.find(b => b.id === selectedBlockId);
  const selectedFlat = flats.find(f => f.id === selectedFlatId);
  const selectedCollection = collections.find(c => c.id === selectedCollectionId);
  const totalExpected = calculatedAmount + lateFine;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Add Payment for Flat</h2>
              <p className="text-sm text-gray-600">Manual payment entry for offline transactions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-medium text-sm transition-all ${
                  step < currentStep
                    ? 'bg-green-500 text-white'
                    : step === currentStep
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {step < currentStep ? <CheckCircle className="w-5 h-5" /> : step}
                </div>
                {step < 4 && (
                  <div className={`w-16 h-1 mx-2 ${
                    step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-3">
            <p className="text-sm font-medium text-gray-700">
              Step {currentStep} of 4: {
                currentStep === 1 ? 'Select Flat' :
                currentStep === 2 ? 'Occupant Details' :
                currentStep === 3 ? 'Collection & Amount' :
                'Payment Details'
              }
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Flat Selection */}
          {currentStep === 1 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Manual Payment Entry</p>
                  <p>Select the flat for which you're recording an offline payment received via call, email, or WhatsApp.</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  Building / Block *
                </label>
                <select
                  value={selectedBlockId}
                  onChange={(e) => setSelectedBlockId(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validationErrors.block ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">-- Select Building/Block --</option>
                  {blocks.map(block => (
                    <option key={block.id} value={block.id}>{block.block_name}</option>
                  ))}
                </select>
                {validationErrors.block && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.block}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Flat Number *
                </label>
                <select
                  value={selectedFlatId}
                  onChange={(e) => setSelectedFlatId(e.target.value)}
                  disabled={!selectedBlockId}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 ${
                    validationErrors.flat ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">-- Select Flat --</option>
                  {flats.map(flat => (
                    <option key={flat.id} value={flat.id}>{flat.flat_number}</option>
                  ))}
                </select>
                {validationErrors.flat && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.flat}</p>
                )}
              </div>

              {loadingOccupant && selectedFlatId && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Loading occupant details...</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Occupant Details */}
          {currentStep === 2 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  {occupantName ? (
                    <p>Existing occupant details loaded. You can update these if needed.</p>
                  ) : (
                    <p>No existing occupant found for this flat. Please enter their details below.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Occupant Name *
                </label>
                <input
                  type="text"
                  value={occupantName}
                  onChange={(e) => setOccupantName(e.target.value)}
                  placeholder="Full name of owner/tenant"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validationErrors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {validationErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Occupant Type *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={occupantType === 'Owner'}
                      onChange={() => setOccupantType('Owner')}
                      className="mr-2"
                    />
                    Owner
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={occupantType === 'Tenant'}
                      onChange={() => setOccupantType('Tenant')}
                      className="mr-2"
                    />
                    Tenant
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="occupant@example.com"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validationErrors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {validationErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">Required for payment confirmation email</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Number
                </label>
                <MobileNumberInput
                  value={mobile}
                  onChange={setMobile}
                  placeholder="Mobile number"
                  className="w-full"
                />
                <p className="mt-1 text-xs text-gray-500">Required for WhatsApp notifications (if opted in)</p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={whatsappOptin}
                    onChange={(e) => setWhatsappOptin(e.target.checked)}
                    disabled={!mobile}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-gray-900">Send WhatsApp Notification</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Send payment confirmation via WhatsApp (requires mobile number)
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Step 3: Collection & Amount */}
          {currentStep === 3 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Collection *
                </label>
                <select
                  value={selectedCollectionId}
                  onChange={(e) => setSelectedCollectionId(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validationErrors.collection ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">-- Select Collection Type --</option>
                  {collections.map(col => (
                    <option key={col.id} value={col.id}>
                      {col.collection_name} - Due: {new Date(col.due_date).toLocaleDateString()}
                    </option>
                  ))}
                </select>
                {validationErrors.collection && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.collection}</p>
                )}
              </div>

              {selectedCollectionId && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Expected Amount:</span>
                    <span className="font-medium text-gray-900">{formatCurrency(calculatedAmount)}</span>
                  </div>
                  {lateFine > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Late Fine:</span>
                      <span className="font-medium text-orange-600">{formatCurrency(lateFine)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-300 pt-2 flex justify-between">
                    <span className="font-medium text-gray-900">Total Expected:</span>
                    <span className="font-bold text-blue-600">{formatCurrency(totalExpected)}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      validationErrors.amount ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                </div>
                {validationErrors.amount && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.amount}</p>
                )}
              </div>

              {parseFloat(paymentAmount || '0') !== totalExpected && paymentAmount && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Amount Adjustment *
                  </label>
                  <textarea
                    value={amountAdjustmentReason}
                    onChange={(e) => setAmountAdjustmentReason(e.target.value)}
                    placeholder="Explain why the amount differs from expected..."
                    rows={3}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      validationErrors.amountReason ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {validationErrors.amountReason && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.amountReason}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Payment Details */}
          {currentStep === 4 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validationErrors.date ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {validationErrors.date && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Mode *
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validationErrors.mode ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  {PAYMENT_MODES.map(mode => (
                    <option key={mode} value={mode}>{mode}</option>
                  ))}
                </select>
                {validationErrors.mode && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.mode}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Reference / UTR
                </label>
                <input
                  type="text"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  placeholder="Optional transaction ID or reference number"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">Helpful for tracking and reconciliation</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Remarks / Notes
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Any additional notes about this payment..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="max-w-2xl mx-auto mt-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
          <button
            onClick={handlePrevStep}
            disabled={currentStep === 1 || loading}
            className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <button
            onClick={handleNextStep}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {currentStep === 4 ? 'Review' : 'Next'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-blue-600" />
                Confirm Payment Entry
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Please review the details before creating this payment record
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Building / Flat</p>
                  <p className="text-sm text-gray-900">{selectedBlock?.block_name} - {selectedFlat?.flat_number}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Occupant</p>
                  <p className="text-sm text-gray-900">{occupantName} ({occupantType})</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Collection</p>
                  <p className="text-sm text-gray-900">{selectedCollection?.collection_name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Payment Amount</p>
                  <p className="text-sm font-bold text-blue-600">{formatCurrency(parseFloat(paymentAmount))}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Payment Date</p>
                  <p className="text-sm text-gray-900">{new Date(paymentDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Payment Mode</p>
                  <p className="text-sm text-gray-900">{paymentMode}</p>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-500 mb-1">Notifications</p>
                <div className="flex gap-4 text-sm">
                  <span className={email ? 'text-green-600' : 'text-gray-400'}>
                    ✓ Email {email && `(${email})`}
                  </span>
                  <span className={whatsappOptin ? 'text-green-600' : 'text-gray-400'}>
                    {whatsappOptin ? '✓' : '✗'} WhatsApp {whatsappOptin && mobile && `(${mobile})`}
                  </span>
                </div>
              </div>

              {transactionReference && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Transaction Reference</p>
                  <p className="text-sm text-gray-900">{transactionReference}</p>
                </div>
              )}

              {(remarks || amountAdjustmentReason) && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Remarks</p>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{remarks || amountAdjustmentReason}</p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  This payment will be immediately marked as <span className="font-bold">Approved</span> and will appear in all reports and dashboards.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmation(false)}
                disabled={loading}
                className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Create Payment Record
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
