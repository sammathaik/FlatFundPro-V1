import { useState, useEffect } from 'react';
import { Upload, Info, CheckCircle, AlertCircle, Loader2, AlertTriangle } from 'lucide-react';
import { supabase, Apartment, BuildingBlockPhase, FlatNumber, PaymentSubmission } from '../lib/supabase';

interface FormData {
  apartmentId: string;
  name: string;
  blockId: string;
  flatId: string;
  email: string;
  contact_number: string;
  payment_amount: string;
  payment_date: string;
  screenshot: File | null;
  payment_type: string;
  occupant_type: 'Owner' | 'Tenant' | '';
  expected_collection_id?: string;
}

interface FormErrors {
  apartment?: string;
  name?: string;
  block?: string;
  flat?: string;
  email?: string;
  payment_type?: string;
  screenshot?: string;
  submit?: string;
  occupant_type?: string;
}

type SubmissionState = 'idle' | 'loading' | 'success' | 'error';

interface ActiveCollection {
  id: string;
  collection_name: string;
  payment_type: string;
  payment_frequency: string;
  amount_due: number;
  due_date: string;
}

export default function DynamicPaymentForm() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [blocks, setBlocks] = useState<BuildingBlockPhase[]>([]);
  const [flats, setFlats] = useState<FlatNumber[]>([]);
  const [activeCollections, setActiveCollections] = useState<ActiveCollection[]>([]);
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [loadingData, setLoadingData] = useState(true);

  const [formData, setFormData] = useState<FormData>({
    apartmentId: '',
    name: '',
    blockId: '',
    flatId: '',
    email: '',
    contact_number: '',
    payment_amount: '',
    payment_date: '',
    screenshot: null,
    payment_type: '',
    occupant_type: '',
    expected_collection_id: undefined,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{ date: string; quarter: string; collection_name?: string } | null>(null);
  const [showEmailMismatchModal, setShowEmailMismatchModal] = useState(false);

  useEffect(() => {
    loadApartments();
  }, []);

  useEffect(() => {
    if (formData.apartmentId) {
      loadBlocks(formData.apartmentId);
      loadActiveCollections(formData.apartmentId);
    } else {
      setBlocks([]);
      setFlats([]);
      setActiveCollections([]);
    }
  }, [formData.apartmentId]);

  useEffect(() => {
    if (formData.blockId) {
      loadFlats(formData.blockId);
    } else {
      setFlats([]);
    }
  }, [formData.blockId]);

  const loadApartments = async () => {
    try {
      const { data, error } = await supabase
        .from('apartments')
        .select('*')
        .eq('status', 'active')
        .order('apartment_name');

      if (error) throw error;
      setApartments(data || []);

      if (data && data.length === 1) {
        setFormData(prev => ({ ...prev, apartmentId: data[0].id }));
        setSelectedApartment(data[0]);
      }
    } catch (error) {
      console.error('Error loading apartments:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const loadBlocks = async (apartmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('buildings_blocks_phases')
        .select('*')
        .eq('apartment_id', apartmentId)
        .order('block_name');

      if (error) throw error;
      setBlocks(data || []);
    } catch (error) {
      console.error('Error loading blocks:', error);
    }
  };

  const loadFlats = async (blockId: string) => {
    try {
      const { data, error } = await supabase
        .from('flat_numbers')
        .select('*')
        .eq('block_id', blockId)
        .order('flat_number');

      if (error) throw error;
      setFlats(data || []);
    } catch (error) {
      console.error('Error loading flats:', error);
    }
  };

  const loadActiveCollections = async (apartmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('expected_collections')
        .select('id, collection_name, payment_type, payment_frequency, amount_due, due_date')
        .eq('apartment_id', apartmentId)
        .eq('is_active', true)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setActiveCollections(data || []);
    } catch (error) {
      console.error('Error loading active collections:', error);
      setActiveCollections([]);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.apartmentId) {
      newErrors.apartment = 'Please select an apartment';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.blockId) {
      newErrors.block = 'Please select a building/block/phase';
    }

    if (!formData.flatId) {
      newErrors.flat = 'Please select a flat number';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.occupant_type) {
      newErrors.occupant_type = 'Please select whether you are an Owner or Tenant';
    }

    if (!formData.payment_type) {
      newErrors.payment_type = 'Please choose what this payment is for';
    }

    if (!formData.screenshot) {
      newErrors.screenshot = 'Payment screenshot is required';
    } else {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(formData.screenshot.type)) {
        newErrors.screenshot = 'Only JPG, PNG, and PDF files are allowed';
      }

      const maxSize = 4 * 1024 * 1024;
      if (formData.screenshot.size > maxSize) {
        newErrors.screenshot = 'File size must be less than 4MB';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleApartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const apartmentId = e.target.value;
    const apartment = apartments.find(a => a.id === apartmentId) || null;
    setSelectedApartment(apartment);
    setFormData(prev => ({
      ...prev,
      apartmentId,
      blockId: '',
      flatId: ''
    }));
    if (errors.apartment) {
      setErrors(prev => ({ ...prev, apartment: undefined }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Special handling for payment_type - the dropdown value is collection.id
    // We need to extract the actual payment_type from the selected collection
    if (name === 'payment_type') {
      if (value) {
        const selectedCollection = activeCollections.find(c => c.id === value);
        if (selectedCollection) {
          setSelectedCollectionId(value); // Track which collection is selected
          setFormData(prev => ({
            ...prev,
            payment_type: selectedCollection.payment_type, // Store the actual payment type (maintenance, contingency, emergency)
            expected_collection_id: value // Store the collection ID for duplicate checking and submission
          }));
        } else {
          setFormData(prev => ({ ...prev, [name]: value }));
        }
      } else {
        // User selected the empty option - reset both
        setSelectedCollectionId('');
        setFormData(prev => ({ ...prev, payment_type: '', expected_collection_id: undefined }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, screenshot: file }));
    if (errors.screenshot) {
      setErrors(prev => ({ ...prev, screenshot: undefined }));
    }
  };

  // Calculate payment quarter from payment_date (matching database function logic)
  const calculatePaymentQuarter = (paymentDate: string | null, submissionDate: Date = new Date()): string => {
    let date: Date;
    
    if (paymentDate) {
      date = new Date(paymentDate);
    } else {
      date = submissionDate;
    }

    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-12

    let quarter: number;
    if (month >= 4 && month <= 6) {
      quarter = 1; // Q1: Apr-Jun
    } else if (month >= 7 && month <= 9) {
      quarter = 2; // Q2: Jul-Sep
    } else if (month >= 10 && month <= 12) {
      quarter = 3; // Q3: Oct-Dec
    } else {
      quarter = 4; // Q4: Jan-Mar
    }

    return `Q${quarter}-${year}`;
  };

  // Check for duplicate submissions using database function
  // Duplicate is defined as: same block_id, flat_id, and expected_collection_id
  // This allows users to pay for different collections (maintenance, contingency, emergency) separately
  const checkForDuplicate = async (): Promise<{ isDuplicate: boolean; existingRecord?: any }> => {
    if (!formData.blockId || !formData.flatId || !selectedCollectionId) {
      return { isDuplicate: false };
    }

    try {
      // Use the database function to check for duplicates
      // This function has SECURITY DEFINER so it can check all records regardless of RLS
      const { data, error } = await supabase.rpc('check_payment_duplicate', {
        p_block_id: formData.blockId,
        p_flat_id: formData.flatId,
        p_expected_collection_id: selectedCollectionId,
        p_payment_date: formData.payment_date || null,
        p_submission_date: new Date().toISOString(),
      });

      if (error) {
        console.error('Error checking for duplicates:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        // If function doesn't exist, log but don't block (allows migration to be run later)
        // But we should still try to prevent duplicates
        alert('Warning: Duplicate check is not available. Please ensure you are not submitting a duplicate payment.');
        return { isDuplicate: false };
      }

      if (data && data.length > 0 && data[0].is_duplicate) {
        return {
          isDuplicate: true,
          existingRecord: {
            payment_date: data[0].existing_payment_date,
            created_at: data[0].existing_created_at,
            payment_quarter: data[0].existing_quarter,
            payment_type: data[0].existing_payment_type,
            collection_name: data[0].existing_collection_name,
          }
        };
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      // On error, we should still warn the user
      alert('Warning: Could not verify for duplicates. Please ensure you are not submitting a duplicate payment.');
      return { isDuplicate: false };
    }
  };

  const uploadScreenshot = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${formData.flatId.replace(/\s+/g, '_')}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('payment-screenshots')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error('Failed to upload screenshot');
    }

    const { data: urlData } = supabase.storage
      .from('payment-screenshots')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Check for duplicate before showing confirm dialog
    setSubmissionState('loading');
    try {
      // First check email-flat mapping
      const { data: validationResult } = await supabase.rpc('validate_and_create_flat_email_mapping', {
        p_apartment_id: formData.apartmentId,
        p_block_id: formData.blockId,
        p_flat_id: formData.flatId,
        p_email: formData.email.trim().toLowerCase(),
        p_occupant_type: formData.occupant_type
      });

      if (validationResult && !validationResult.success) {
        setSubmissionState('idle');
        setShowEmailMismatchModal(true);
        setErrors({
          submit: validationResult.message || 'This flat is mapped to another email address. Please contact your management committee.'
        });
        return;
      }

      const duplicateCheck = await checkForDuplicate();

      if (duplicateCheck.isDuplicate) {
        setSubmissionState('idle');
        const existingRecord = duplicateCheck.existingRecord;
        const existingDate = existingRecord.payment_date
          ? new Date(existingRecord.payment_date).toLocaleDateString()
          : new Date(existingRecord.created_at).toLocaleDateString();

        setDuplicateInfo({
          date: existingDate,
          quarter: existingRecord.payment_quarter || calculatePaymentQuarter(formData.payment_date || null),
          collection_name: existingRecord.collection_name,
        });
        setShowDuplicateAlert(true);
        return;
      }

      setSubmissionState('idle');
      setShowConfirmDialog(true);
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setSubmissionState('idle');
      // Still allow submission if check fails, but warn user
      if (confirm('Warning: Could not verify for duplicates. Do you want to proceed with submission?')) {
        setShowConfirmDialog(true);
      }
    }
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmDialog(false);

    setSubmissionState('loading');
    setUploadProgress(0);

    try {
      setUploadProgress(30);

      const screenshotUrl = await uploadScreenshot(formData.screenshot!);

      setUploadProgress(60);

      const submissionData: PaymentSubmission = {
        apartment_id: formData.apartmentId,
        name: formData.name.trim(),
        block_id: formData.blockId,
        flat_id: formData.flatId,
        email: formData.email.trim(),
        contact_number: formData.contact_number.trim() || undefined,
        payment_amount: formData.payment_amount ? parseFloat(formData.payment_amount) : undefined,
        // Ensure payment_date is saved if provided (even if empty string, convert to undefined)
        payment_date: formData.payment_date && formData.payment_date.trim() ? formData.payment_date.trim() : undefined,
        payment_type: formData.payment_type,
        screenshot_url: screenshotUrl,
        screenshot_filename: formData.screenshot!.name,
        occupant_type: formData.occupant_type,
        expected_collection_id: formData.expected_collection_id || undefined,
      };
      
      // Debug log to verify payment_date is being saved
      console.debug('[PaymentForm] Submitting with payment_date:', submissionData.payment_date);

      const { error: dbError } = await supabase
        .from('payment_submissions')
        .insert([submissionData]);

      if (dbError) {
        throw new Error('Failed to save submission');
      }

      setUploadProgress(100);
      setSubmissionState('success');

      setSelectedCollectionId(''); // Reset collection selection
      setFormData({
        apartmentId: formData.apartmentId,
        name: '',
        blockId: '',
        flatId: '',
        email: '',
        contact_number: '',
        payment_amount: '',
        payment_date: '',
        screenshot: null,
        payment_type: '',
        occupant_type: '',
        expected_collection_id: undefined,
      });

      const fileInput = document.getElementById('screenshot') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      console.error('Submission error:', error);
      setSubmissionState('error');
      setErrors({
        submit: 'Failed to submit payment proof. Please try again.',
      });
    }
  };

  const getSelectedBlockName = () => {
    const block = blocks.find(b => b.id === formData.blockId);
    return block ? `${block.block_name} (${block.type})` : '';
  };

  const getSelectedFlatNumber = () => {
    const flat = flats.find(f => f.id === formData.flatId);
    return flat ? flat.flat_number : '';
  };

  const resetForm = () => {
    setSubmissionState('idle');
    setErrors({});
    setUploadProgress(0);
    setShowEmailMismatchModal(false);
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-amber-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading apartments...</p>
        </div>
      </div>
    );
  }

  if (apartments.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">No Active Apartments</h2>
          <p className="text-gray-600">
            There are currently no active apartments available for payment submission.
            Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  if (submissionState === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Submission Successful!
          </h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Thank you! Your payment proof for <strong>{selectedApartment?.apartment_name}</strong> has been received.
            The committee will review and confirm within 2 business days.
          </p>
          <button
            onClick={resetForm}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Submit Another Payment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-8 text-center">
            <img
              src="/FlatFundPro-2-Logo.jpeg"
              alt="FlatFund Pro"
              className="h-24 sm:h-28 md:h-32 mx-auto mb-4 object-contain"
            />
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Submit Your Maintenance Payment Proof
            </h1>
            {selectedApartment && (
              <p className="text-amber-100 font-medium">
                {selectedApartment.apartment_name}
              </p>
            )}
          </div>

          <div className="p-6 md:p-8">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                <p className="text-sm text-blue-800">
                  Upload your payment screenshot. Make sure it clearly displays the transaction reference (UTR/Txn ID),
                  payment date, and payment amount. Maximum file size: 4MB. Formats: JPG, PNG, PDF.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {apartments.length > 1 && (
                <div>
                  <label htmlFor="apartmentId" className="block text-sm font-semibold text-gray-700 mb-2">
                    Select Apartment <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="apartmentId"
                    name="apartmentId"
                    value={formData.apartmentId}
                    onChange={handleApartmentChange}
                    disabled={submissionState === 'loading'}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all ${
                      errors.apartment ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">-- Select Apartment --</option>
                    {apartments.map((apt) => (
                      <option key={apt.id} value={apt.id}>
                        {apt.apartment_name}
                      </option>
                    ))}
                  </select>
                  {errors.apartment && (
                    <p className="mt-1 text-sm text-red-600">{errors.apartment}</p>
                  )}
                </div>
              )}

              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={submissionState === 'loading'}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your full name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="blockId" className="block text-sm font-semibold text-gray-700 mb-2">
                  Building / Block / Phase <span className="text-red-500">*</span>
                </label>
                <select
                  id="blockId"
                  name="blockId"
                  value={formData.blockId}
                  onChange={handleInputChange}
                  disabled={submissionState === 'loading' || !formData.apartmentId}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all ${
                    errors.block ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">-- Select {blocks[0]?.type || 'Building/Block/Phase'} --</option>
                  {blocks.map((block) => (
                    <option key={block.id} value={block.id}>
                      {block.block_name} ({block.type})
                    </option>
                  ))}
                </select>
                {errors.block && (
                  <p className="mt-1 text-sm text-red-600">{errors.block}</p>
                )}
              </div>

              <div>
                <label htmlFor="flatId" className="block text-sm font-semibold text-gray-700 mb-2">
                  Flat Number <span className="text-red-500">*</span>
                </label>
                <select
                  id="flatId"
                  name="flatId"
                  value={formData.flatId}
                  onChange={handleInputChange}
                  disabled={submissionState === 'loading' || !formData.blockId}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all ${
                    errors.flat ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">-- Select Flat Number --</option>
                  {flats.map((flat) => (
                    <option key={flat.id} value={flat.id}>
                      {flat.flat_number}
                    </option>
                  ))}
                </select>
                {errors.flat && (
                  <p className="mt-1 text-sm text-red-600">{errors.flat}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={submissionState === 'loading'}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="your.email@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="occupant_type" className="block text-sm font-semibold text-gray-700 mb-2">
                    I am <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="occupant_type"
                    name="occupant_type"
                    value={formData.occupant_type}
                    onChange={handleInputChange}
                    disabled={submissionState === 'loading'}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all ${
                      errors.occupant_type ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select...</option>
                    <option value="Owner">Owner</option>
                    <option value="Tenant">Tenant</option>
                  </select>
                  {errors.occupant_type && (
                    <p className="mt-1 text-sm text-red-600">{errors.occupant_type}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="contact_number" className="block text-sm font-semibold text-gray-700 mb-2">
                  Contact Number
                </label>
                <input
                  type="tel"
                  id="contact_number"
                  name="contact_number"
                  value={formData.contact_number}
                  onChange={handleInputChange}
                  disabled={submissionState === 'loading'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div>
                <label htmlFor="payment_amount" className="block text-sm font-semibold text-gray-700 mb-2">
                  Maintenance Payment Amount (INR)
                </label>
                <input
                  type="number"
                  id="payment_amount"
                  name="payment_amount"
                  value={formData.payment_amount}
                  onChange={handleInputChange}
                  disabled={submissionState === 'loading'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  placeholder="e.g., 5000"
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <label htmlFor="payment_type" className="block text-sm font-semibold text-gray-700 mb-2">
                  What is this payment for? <span className="text-red-500">*</span>
                </label>
                {activeCollections.length === 0 && formData.apartmentId ? (
                  <div className="w-full px-4 py-3 bg-amber-50 border-2 border-amber-300 rounded-lg">
                    <p className="text-sm text-amber-800 font-medium">
                      No active payment collections available. Please contact your apartment admin.
                    </p>
                  </div>
                ) : (
                  <select
                    id="payment_type"
                    name="payment_type"
                    value={selectedCollectionId}
                    onChange={handleInputChange}
                    disabled={submissionState === 'loading' || activeCollections.length === 0}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all ${
                      errors.payment_type ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">-- Select Payment Collection --</option>
                    {activeCollections.map((collection) => (
                      <option key={collection.id} value={collection.id}>
                        {collection.collection_name} - ₹{collection.amount_due.toLocaleString()} (Due: {new Date(collection.due_date).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                )}
                {errors.payment_type && (
                  <p className="mt-1 text-sm text-red-600">{errors.payment_type}</p>
                )}
              </div>

              <div>
                <label htmlFor="payment_date" className="block text-sm font-semibold text-gray-700 mb-2">
                  Payment or Transaction Date
                </label>
                <input
                  type="date"
                  id="payment_date"
                  name="payment_date"
                  value={formData.payment_date}
                  onChange={handleInputChange}
                  disabled={submissionState === 'loading'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label htmlFor="screenshot" className="block text-sm font-semibold text-gray-700 mb-2">
                  Upload Payment Screenshot <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="file"
                    id="screenshot"
                    name="screenshot"
                    onChange={handleFileChange}
                    disabled={submissionState === 'loading'}
                    accept="image/jpeg,image/jpg,image/png,application/pdf"
                    className="hidden"
                  />
                  <label
                    htmlFor="screenshot"
                    className={`flex items-center justify-center w-full px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer transition-all hover:border-amber-500 hover:bg-amber-50 ${
                      errors.screenshot ? 'border-red-500' : 'border-gray-300'
                    } ${submissionState === 'loading' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="text-center">
                      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      {formData.screenshot ? (
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold text-amber-600">
                            {formData.screenshot.name}
                          </span>
                          <br />
                          <span className="text-xs">
                            ({(formData.screenshot.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </p>
                      ) : (
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                          <br />
                          <span className="text-xs">JPG, PNG or PDF (Max 4MB)</span>
                        </p>
                      )}
                    </div>
                  </label>
                </div>
                <div className="mt-2 flex items-start text-xs text-gray-600 bg-gray-50 p-3 rounded">
                  <Info className="w-4 h-4 text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Tip:</strong> Crop or zoom your screenshot so that the transaction details are clearly visible.
                  </span>
                </div>
                {errors.screenshot && (
                  <p className="mt-1 text-sm text-red-600">{errors.screenshot}</p>
                )}
              </div>

              {errors.submit && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                    <p className="text-sm text-red-800">{errors.submit}</p>
                  </div>
                </div>
              )}

              {submissionState === 'loading' && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <div className="flex items-center">
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin mr-3" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-800 mb-1">
                        Uploading your payment proof...
                      </p>
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submissionState === 'loading'}
                className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-colors duration-200 text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {submissionState === 'loading' ? 'Uploading...' : 'Upload & Submit'}
              </button>
            </form>

            {showEmailMismatchModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                      <AlertCircle className="w-10 h-10 text-red-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">
                      Email Address Mismatch
                    </h3>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      This flat is already mapped to another email address. If you believe this is an error, please contact your management committee for assistance.
                    </p>
                    <button
                      onClick={() => {
                        setShowEmailMismatchModal(false);
                        setErrors({});
                      }}
                      className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                    >
                      Understood
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showDuplicateAlert && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowDuplicateAlert(false)}>
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-10 h-10 text-red-600" />
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-gray-800 text-center mb-4">
                    Duplicate Submission Detected
                  </h3>

                  <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
                    <p className="text-sm text-red-800 font-semibold mb-2">
                      A payment submission has already been received for this specific collection:
                    </p>
                    <div className="space-y-2 text-sm text-red-700">
                      <div className="flex justify-between">
                        <span className="font-medium">Building/Block:</span>
                        <span>{getSelectedBlockName()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Flat Number:</span>
                        <span>{getSelectedFlatNumber()}</span>
                      </div>
                      {duplicateInfo?.collection_name && (
                        <div className="flex justify-between">
                          <span className="font-medium">Collection:</span>
                          <span className="font-bold">{duplicateInfo.collection_name}</span>
                        </div>
                      )}
                      {duplicateInfo?.quarter && (
                        <div className="flex justify-between">
                          <span className="font-medium">Quarter:</span>
                          <span>{duplicateInfo.quarter}</span>
                        </div>
                      )}
                      {duplicateInfo?.date && (
                        <div className="flex justify-between">
                          <span className="font-medium">Previous Submission Date:</span>
                          <span>{duplicateInfo.date}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded">
                    <p className="text-sm text-amber-800">
                      <strong>Important:</strong> You have already submitted a payment for this specific collection. If you need to pay for a different collection (e.g., Maintenance vs Contingency Fund), please select that collection from the form. If you believe this is an error, please contact your Admin/Secretary/Treasurer.
                    </p>
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>Next Steps:</strong> If you believe this is an error or need to submit a different payment, please reach out to your <strong>Admin/Secretary/Treasurer</strong> for further clarification before submitting again.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setShowDuplicateAlert(false);
                      setDuplicateInfo(null);
                    }}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 shadow-lg"
                  >
                    Understood
                  </button>
                </div>
              </div>
            )}

            {showConfirmDialog && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowConfirmDialog(false)}>
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-10 h-10 text-amber-600" />
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-gray-800 text-center mb-4">
                    Please Confirm Your Details
                  </h3>

                  <p className="text-sm text-gray-600 text-center mb-6">
                    Before submitting, please verify that you have selected the correct building and flat number:
                  </p>

                  <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 mb-6 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-700">Apartment:</span>
                      <span className="text-sm font-bold text-amber-800">{selectedApartment?.apartment_name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-700">Building/Block:</span>
                      <span className="text-sm font-bold text-amber-800">{getSelectedBlockName()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-700">Flat Number:</span>
                      <span className="text-lg font-bold text-amber-900">{getSelectedFlatNumber()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-700">Name:</span>
                      <span className="text-sm font-bold text-amber-800">{formData.name}</span>
                    </div>
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-6">
                    <p className="text-xs text-blue-800">
                      <strong>Important:</strong> Please ensure the building and flat number are correct. Incorrect submissions may delay your payment reconciliation.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowConfirmDialog(false)}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
                    >
                      Go Back
                    </button>
                    <button
                      onClick={handleConfirmSubmit}
                      className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 shadow-lg"
                    >
                      Confirm & Submit
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Your submitted data is securely stored and used only for maintenance reconciliation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
