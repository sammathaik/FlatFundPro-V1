import { useState } from 'react';
import { Upload, Info, CheckCircle, AlertCircle, Loader2, Sparkles, ImageIcon } from 'lucide-react';
import { supabase, PaymentSubmission } from '../lib/supabase';
import { analyzePaymentImage } from '../lib/fraudDetection';
import MobileNumberInput from './MobileNumberInput';

interface FormData {
  name: string;
  building_block_phase: string;
  flat_number: string;
  email: string;
  contact_number: string;
  payment_amount: string;
  payment_date: string;
  screenshot: File | null;
  occupant_type: 'Owner' | 'Tenant' | '';
  whatsapp_opt_in: boolean;
}

interface FormErrors {
  name?: string;
  building_block_phase?: string;
  flat_number?: string;
  email?: string;
  screenshot?: string;
  submit?: string;
  occupant_type?: string;
}

type SubmissionState = 'idle' | 'loading' | 'success' | 'error';

interface EnhancedPaymentFormProps {
  onSuccess?: () => void;
}

export default function EnhancedPaymentForm({ onSuccess }: EnhancedPaymentFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    building_block_phase: '',
    flat_number: '',
    email: '',
    contact_number: '',
    payment_amount: '',
    payment_date: '',
    screenshot: null,
    occupant_type: '',
    whatsapp_opt_in: true,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showEmailMismatchModal, setShowEmailMismatchModal] = useState(false);
  const [showMobileMismatchModal, setShowMobileMismatchModal] = useState(false);
  const [mobileMismatchData, setMobileMismatchData] = useState<{
    stored: string;
    entered: string;
    apartmentId: string;
    blockId: string;
    flatId: string;
  } | null>(null);
  const [mobileUpdateChoice, setMobileUpdateChoice] = useState<'permanent' | 'one-time' | null>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const normalizeMobile = (mobile: string): string => {
    // Remove all non-digit characters
    const digits = mobile.replace(/\D/g, '');
    // If starts with country code, keep only last 10 digits
    if (digits.length > 10) {
      return digits.slice(-10);
    }
    return digits;
  };

  const maskMobile = (mobile: string): string => {
    const normalized = normalizeMobile(mobile);
    if (normalized.length >= 4) {
      return `******${normalized.slice(-4)}`;
    }
    return '******';
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.building_block_phase.trim()) {
      newErrors.building_block_phase = 'Building/Block/Phase is required';
    }

    if (!formData.flat_number.trim()) {
      newErrors.flat_number = 'Flat number is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.occupant_type) {
      newErrors.occupant_type = 'Please select whether you are an Owner or Tenant';
    }

    if (!formData.screenshot) {
      newErrors.screenshot = 'Payment screenshot is required';
    } else {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(formData.screenshot.type)) {
        newErrors.screenshot = 'Only JPG, PNG, and PDF files are allowed';
      }

      const maxSize = 10 * 1024 * 1024;
      if (formData.screenshot.size > maxSize) {
        newErrors.screenshot = 'File size must be less than 10MB';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, screenshot: file }));

    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }

    if (errors.screenshot) {
      setErrors(prev => ({ ...prev, screenshot: undefined }));
    }
  };

  const uploadScreenshot = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${formData.flat_number.replace(/\s+/g, '_')}.${fileExt}`;
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

  const sendToWebhook = async (submission: PaymentSubmission) => {
    const webhookUrl = import.meta.env.VITE_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submission),
      });
    } catch (error) {
      console.error('Webhook notification failed:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmissionState('loading');
    setUploadProgress(0);

    try {
      setUploadProgress(10);

      const apartmentId = import.meta.env.VITE_APARTMENT_ID;
      if (!apartmentId) {
        throw new Error('Apartment configuration is missing');
      }

      const { data: blockData } = await supabase
        .from('buildings_blocks_phases')
        .select('id, apartment_id')
        .eq('apartment_id', apartmentId)
        .eq('block_name', formData.building_block_phase.trim())
        .maybeSingle();

      if (!blockData) {
        throw new Error('Invalid building/block/phase');
      }

      const { data: flatData } = await supabase
        .from('flat_numbers')
        .select('id')
        .eq('block_id', blockData.id)
        .eq('flat_number', formData.flat_number.trim())
        .maybeSingle();

      if (!flatData) {
        throw new Error('Invalid flat number');
      }

      setUploadProgress(20);

      const { data: validationResult } = await supabase.rpc('validate_and_create_flat_email_mapping', {
        p_apartment_id: apartmentId,
        p_block_id: blockData.id,
        p_flat_id: flatData.id,
        p_email: formData.email.trim().toLowerCase(),
        p_occupant_type: formData.occupant_type
      });

      if (!validationResult.success) {
        setSubmissionState('idle');
        setUploadProgress(0);
        setShowEmailMismatchModal(true);
        setErrors({
          submit: validationResult.message || 'This flat is mapped to another email address. Please contact your management committee.'
        });
        return;
      }

      // Handle mobile number and WhatsApp opt-in using secure RPC function
      if (formData.contact_number && formData.contact_number.trim()) {
        // Check for mobile mismatch
        const { data: contactInfo } = await supabase.rpc(
          'get_flat_contact_info',
          {
            p_apartment_id: apartmentId,
            p_flat_id: flatData.id
          }
        );

        const existingMapping = contactInfo && contactInfo.length > 0 ? contactInfo[0] : null;
        const enteredMobile = normalizeMobile(formData.contact_number.trim());
        const storedMobile = existingMapping?.mobile ? normalizeMobile(existingMapping.mobile) : '';

        // If stored mobile exists and doesn't match entered mobile
        if (storedMobile && storedMobile !== enteredMobile && !mobileUpdateChoice) {
          setSubmissionState('idle');
          setUploadProgress(0);
          setMobileMismatchData({
            stored: storedMobile,
            entered: enteredMobile,
            apartmentId,
            blockId: blockData.id,
            flatId: flatData.id
          });
          setShowMobileMismatchModal(true);
          return;
        }

        // Update mobile and WhatsApp opt-in based on user choice
        if (mobileUpdateChoice === 'permanent' || !storedMobile) {
          // Update permanently if user chose permanent OR if no mobile was stored
          await supabase.rpc('update_flat_contact_info', {
            p_apartment_id: apartmentId,
            p_flat_id: flatData.id,
            p_mobile: formData.contact_number.trim(),
            p_whatsapp_opt_in: formData.whatsapp_opt_in
          });
        } else if (mobileUpdateChoice === 'one-time') {
          // Only update WhatsApp opt-in, keep existing mobile
          await supabase.rpc('update_flat_contact_info', {
            p_apartment_id: apartmentId,
            p_flat_id: flatData.id,
            p_whatsapp_opt_in: formData.whatsapp_opt_in
          });
        } else if (!existingMapping?.mobile) {
          // No existing mobile, save the new one
          await supabase.rpc('update_flat_contact_info', {
            p_apartment_id: apartmentId,
            p_flat_id: flatData.id,
            p_mobile: formData.contact_number.trim(),
            p_whatsapp_opt_in: formData.whatsapp_opt_in
          });
        }
      } else {
        // No contact number entered, just update WhatsApp opt-in
        await supabase.rpc('update_flat_contact_info', {
          p_apartment_id: apartmentId,
          p_flat_id: flatData.id,
          p_whatsapp_opt_in: formData.whatsapp_opt_in
        });
      }

      setUploadProgress(40);

      const screenshotUrl = await uploadScreenshot(formData.screenshot!);

      setUploadProgress(60);

      const submissionData: PaymentSubmission = {
        name: formData.name.trim(),
        building_block_phase: formData.building_block_phase.trim(),
        flat_number: formData.flat_number.trim(),
        email: formData.email.trim(),
        contact_number: formData.contact_number.trim() || undefined,
        payment_amount: formData.payment_amount ? parseFloat(formData.payment_amount) : undefined,
        payment_date: formData.payment_date || undefined,
        screenshot_url: screenshotUrl,
        screenshot_filename: formData.screenshot!.name,
        occupant_type: formData.occupant_type,
      };

      const { data: insertedPayment, error: dbError } = await supabase
        .from('payment_submissions')
        .insert([submissionData])
        .select()
        .single();

      if (dbError || !insertedPayment) {
        throw new Error('Failed to save submission');
      }

      setUploadProgress(70);

      analyzePaymentImage(insertedPayment.id, screenshotUrl).catch(error => {
        console.error('Fraud analysis failed (non-blocking):', error);
      });

      setUploadProgress(90);

      await sendToWebhook(submissionData);

      setUploadProgress(100);
      setSubmissionState('success');

      setFormData({
        name: '',
        building_block_phase: '',
        flat_number: '',
        email: '',
        contact_number: '',
        payment_amount: '',
        payment_date: '',
        screenshot: null,
        occupant_type: '',
        whatsapp_opt_in: true,
      });
      setPreviewUrl(null);
      setMobileUpdateChoice(null);
      setMobileMismatchData(null);

      const fileInput = document.getElementById('screenshot') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Submission error:', error);
      setSubmissionState('error');
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to submit payment proof. Please try again.',
      });
    }
  };

  const resetForm = () => {
    setSubmissionState('idle');
    setErrors({});
    setUploadProgress(0);
    setShowEmailMismatchModal(false);
    setShowMobileMismatchModal(false);
    setMobileUpdateChoice(null);
    setMobileMismatchData(null);
  };

  const handleMobileMismatchChoice = (choice: 'permanent' | 'one-time') => {
    setMobileUpdateChoice(choice);
    setShowMobileMismatchModal(false);
    // Re-trigger submission with the choice made
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    }, 100);
  };

  if (submissionState === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 opacity-50"></div>
          <div className="relative">
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg animate-bounce-slow">
                <CheckCircle className="w-14 h-14 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Successfully Submitted!
            </h2>
            <p className="text-gray-600 mb-2 leading-relaxed">
              Your payment proof has been received and is being processed.
            </p>
            <p className="text-sm text-gray-500 mb-8">
              Our system is automatically detecting your transaction details. You'll receive confirmation within 2 business days.
            </p>
            <button
              onClick={resetForm}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Submit Another Payment
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {showMobileMismatchModal && mobileMismatchData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Mobile Number Mismatch Detected
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                The mobile number you entered is different from the number currently saved for this flat.
              </p>

              <div className="w-full bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Existing number:</span>
                    <span className="font-semibold text-gray-900">{maskMobile(mobileMismatchData.stored)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Entered number:</span>
                    <span className="font-semibold text-gray-900">{maskMobile(mobileMismatchData.entered)}</span>
                  </div>
                </div>
              </div>

              <div className="w-full space-y-3">
                <button
                  onClick={() => handleMobileMismatchChoice('permanent')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 text-left flex items-start gap-3"
                >
                  <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-bold">Yes, update the mobile number for this flat</div>
                    <div className="text-xs text-blue-100 mt-1">Replace stored mobile number. Use new number for future communication.</div>
                  </div>
                </button>

                <button
                  onClick={() => handleMobileMismatchChoice('one-time')}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-3 px-6 rounded-xl transition-all duration-200 text-left flex items-start gap-3"
                >
                  <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-bold">No, use this number only for this payment</div>
                    <div className="text-xs text-gray-600 mt-1">Do not update stored number. Use entered number only for this submission.</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      <section id="submit-form" className="py-20 px-4 bg-gradient-to-br from-gray-50 to-amber-50">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-800">Smart Detection Enabled</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Submit Your Payment Proof
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Fill in your details and upload your payment screenshot. We'll handle the rest automatically.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-8 md:p-10">
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-500 p-5 mb-8 rounded-lg">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    No need to manually enter transaction IDs
                  </p>
                  <p className="text-sm text-blue-700">
                    Just upload a clear screenshot showing your transaction details. Our system will automatically extract the information.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={submissionState === 'loading'}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.name ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="Enter your full name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="flat_number" className="block text-sm font-semibold text-gray-700 mb-2">
                    Flat Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="flat_number"
                    name="flat_number"
                    value={formData.flat_number}
                    onChange={handleInputChange}
                    disabled={submissionState === 'loading'}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.flat_number ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="e.g., 101, A-205"
                  />
                  {errors.flat_number && (
                    <p className="mt-1 text-sm text-red-600">{errors.flat_number}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="building_block_phase" className="block text-sm font-semibold text-gray-700 mb-2">
                  Building / Block / Phase <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="building_block_phase"
                  name="building_block_phase"
                  value={formData.building_block_phase}
                  onChange={handleInputChange}
                  disabled={submissionState === 'loading'}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.building_block_phase ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="e.g., Block A, Phase 2, Tower B"
                />
                {errors.building_block_phase && (
                  <p className="mt-1 text-sm text-red-600">{errors.building_block_phase}</p>
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
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.email ? 'border-red-500' : 'border-gray-200'
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
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.occupant_type ? 'border-red-500' : 'border-gray-200'
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <MobileNumberInput
                    value={formData.contact_number}
                    onChange={(value) => setFormData({ ...formData, contact_number: value })}
                    label="Contact Number"
                    disabled={submissionState === 'loading'}
                    showValidation={false}
                  />
                </div>

                <div>
                  <label htmlFor="payment_amount" className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Amount (INR)
                  </label>
                  <input
                    type="number"
                    id="payment_amount"
                    name="payment_amount"
                    value={formData.payment_amount}
                    onChange={handleInputChange}
                    disabled={submissionState === 'loading'}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="e.g., 5000"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="payment_date" className="block text-sm font-semibold text-gray-700 mb-2">
                  Payment Date
                </label>
                <input
                  type="date"
                  id="payment_date"
                  name="payment_date"
                  value={formData.payment_date}
                  onChange={handleInputChange}
                  disabled={submissionState === 'loading'}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="whatsapp_opt_in"
                    name="whatsapp_opt_in"
                    checked={formData.whatsapp_opt_in}
                    onChange={handleCheckboxChange}
                    disabled={submissionState === 'loading'}
                    className="mt-1 w-5 h-5 text-green-600 border-2 border-green-300 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
                  />
                  <label htmlFor="whatsapp_opt_in" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">
                        Receive payment updates on WhatsApp
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      You can change this anytime. WhatsApp messages are informational only.
                    </p>
                  </label>
                </div>
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
                    className={`flex items-center justify-center w-full px-4 py-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all hover:border-blue-500 hover:bg-blue-50 ${
                      errors.screenshot ? 'border-red-500' : 'border-gray-300'
                    } ${submissionState === 'loading' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="text-center">
                      {previewUrl ? (
                        <div className="space-y-3">
                          <img src={previewUrl} alt="Preview" className="max-h-40 mx-auto rounded-lg shadow-md" />
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold text-blue-600">
                              {formData.screenshot?.name}
                            </span>
                            <br />
                            <span className="text-xs">
                              ({(formData.screenshot!.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </p>
                        </div>
                      ) : formData.screenshot ? (
                        <div className="space-y-3">
                          <ImageIcon className="w-12 h-12 text-blue-500 mx-auto" />
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold text-blue-600">
                              {formData.screenshot.name}
                            </span>
                            <br />
                            <span className="text-xs">
                              ({(formData.screenshot.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </p>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
                            <br />
                            <span className="text-xs">JPG, PNG or PDF (Max 10MB)</span>
                          </p>
                        </>
                      )}
                    </div>
                  </label>
                </div>
                <div className="mt-3 flex items-start text-xs text-gray-600 bg-blue-50 p-4 rounded-xl">
                  <Sparkles className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Smart Detection:</strong> Make sure your screenshot clearly shows the transaction ID (UTR), payment amount, and date. Our system will automatically extract these details.
                  </span>
                </div>
                {errors.screenshot && (
                  <p className="mt-2 text-sm text-red-600">{errors.screenshot}</p>
                )}
              </div>

              {errors.submit && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                    <p className="text-sm text-red-800">{errors.submit}</p>
                  </div>
                </div>
              )}

              {submissionState === 'loading' && (
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-500 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin mr-3" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-900 mb-2">
                        Processing your submission...
                      </p>
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
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
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 text-lg shadow-lg hover:shadow-2xl transform hover:-translate-y-1"
              >
                {submissionState === 'loading' ? 'Processing...' : 'Submit Payment Proof'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-center text-xs text-gray-500">
                <Info className="w-4 h-4 mr-2" />
                <span>Your data is encrypted and stored securely. We respect your privacy.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    </>
  );
}
