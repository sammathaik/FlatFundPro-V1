import { useState } from 'react';
import { Upload, Info, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase, PaymentSubmission } from '../lib/supabase';

interface FormData {
  name: string;
  building_block_phase: string;
  flat_number: string;
  email: string;
  contact_number: string;
  payment_amount: string;
  payment_date: string;
  screenshot: File | null;
}

interface FormErrors {
  name?: string;
  building_block_phase?: string;
  flat_number?: string;
  email?: string;
  screenshot?: string;
  submit?: string;
}

type SubmissionState = 'idle' | 'loading' | 'success' | 'error';

export default function PaymentForm() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    building_block_phase: '',
    flat_number: '',
    email: '',
    contact_number: '',
    payment_amount: '',
    payment_date: '',
    screenshot: null,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
      setUploadProgress(30);

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
      };

      const { error: dbError } = await supabase
        .from('payment_submissions')
        .insert([submissionData]);

      if (dbError) {
        throw new Error('Failed to save submission');
      }

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

  const resetForm = () => {
    setSubmissionState('idle');
    setErrors({});
    setUploadProgress(0);
  };

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
            Thank you! Your payment proof has been received. The committee will review and confirm within 2 business days.
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
              src="/flatfundpro-2-logo.jpeg"
              alt="FlatFund Pro"
              className="h-20 mx-auto mb-4 object-contain"
            />
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Submit Your Quarterly Maintenance Payment Proof
            </h1>
          </div>

          <div className="p-6 md:p-8">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                <p className="text-sm text-blue-800">
                  Upload your payment screenshot. Make sure it clearly displays the transaction reference (UTR/Txn ID), payment date, and payment amount. Only images or PDFs are accepted.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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
                <label htmlFor="building_block_phase" className="block text-sm font-semibold text-gray-700 mb-2">
                  Building / Block / Phase Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="building_block_phase"
                  name="building_block_phase"
                  value={formData.building_block_phase}
                  onChange={handleInputChange}
                  disabled={submissionState === 'loading'}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all ${
                    errors.building_block_phase ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Block A, Phase 2"
                />
                {errors.building_block_phase && (
                  <p className="mt-1 text-sm text-red-600">{errors.building_block_phase}</p>
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
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all ${
                    errors.flat_number ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., 101, A-205"
                />
                {errors.flat_number && (
                  <p className="mt-1 text-sm text-red-600">{errors.flat_number}</p>
                )}
              </div>

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
                          <span className="text-xs">JPG, PNG or PDF (Max 10MB)</span>
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
