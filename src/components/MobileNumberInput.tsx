import React, { useState, useEffect } from 'react';
import { Phone, AlertCircle, CheckCircle } from 'lucide-react';
import {
  COUNTRY_CODES,
  normalizeMobileNumber,
  validateMobileNumber,
  formatMobileForStorage,
  type CountryCode,
} from '../lib/mobileNumberUtils';

interface MobileNumberInputProps {
  value?: string;
  onChange: (fullNumber: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  showValidation?: boolean;
  className?: string;
}

export default function MobileNumberInput({
  value,
  onChange,
  label = 'Mobile Number',
  required = false,
  disabled = false,
  placeholder = 'Enter 10-digit mobile number',
  showValidation = true,
  className = '',
}: MobileNumberInputProps) {
  const [countryCode, setCountryCode] = useState<string>('+91');
  const [localNumber, setLocalNumber] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [wasNormalized, setWasNormalized] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (value) {
      const normalized = normalizeMobileNumber(value);
      setCountryCode(normalized.countryCode);
      setLocalNumber(normalized.localNumber);
      setWasNormalized(normalized.wasNormalized);
    }
  }, [value]);

  const handleCountryCodeChange = (newCode: string) => {
    setCountryCode(newCode);
    setIsDropdownOpen(false);
    setSearchTerm('');
    if (localNumber) {
      onChange(formatMobileForStorage(newCode, localNumber));
    }
  };

  const handleLocalNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const cleaned = input.replace(/\D/g, '');

    if (cleaned.length <= 10) {
      setLocalNumber(cleaned);
      setWasNormalized(false);
      setTouched(true);
      onChange(formatMobileForStorage(countryCode, cleaned));
    }
  };

  const validation = validateMobileNumber(localNumber, countryCode);
  const showError = touched && showValidation && !validation.isValid && localNumber !== '';
  const showSuccess = touched && showValidation && validation.isValid;

  const filteredCountries = COUNTRY_CODES.filter(
    (country) =>
      country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.dialCode.includes(searchTerm) ||
      country.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCountry = COUNTRY_CODES.find((c) => c.dialCode === countryCode) || COUNTRY_CODES[0];

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="flex gap-2">
        <div className="relative w-32">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
          >
            <span className="flex items-center gap-1">
              <span>{selectedCountry.flag}</span>
              <span className="text-sm font-medium">{selectedCountry.dialCode}</span>
            </span>
            <svg
              className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isDropdownOpen && (
            <div className="absolute z-50 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
              <div className="p-2 border-b border-gray-200">
                <input
                  type="text"
                  placeholder="Search country..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="overflow-y-auto max-h-48">
                {filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountryCodeChange(country.dialCode)}
                    className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center justify-between text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span>{country.flag}</span>
                      <span>{country.name}</span>
                    </span>
                    <span className="text-gray-500 text-xs">{country.dialCode}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 relative">
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="tel"
              value={localNumber}
              onChange={handleLocalNumberChange}
              onBlur={() => setTouched(true)}
              placeholder={placeholder}
              disabled={disabled}
              maxLength={10}
              className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:cursor-not-allowed ${
                showError
                  ? 'border-red-300 focus:ring-red-500'
                  : showSuccess
                  ? 'border-green-300 focus:ring-green-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {showSuccess && (
              <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500 w-5 h-5" />
            )}
            {showError && (
              <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500 w-5 h-5" />
            )}
          </div>
        </div>
      </div>

      {wasNormalized && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-700">Mobile number format has been standardized.</p>
        </div>
      )}

      {showError && validation.error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{validation.error}</p>
        </div>
      )}

      {!showError && !wasNormalized && (
        <p className="text-xs text-gray-500">Enter 10-digit mobile number</p>
      )}
    </div>
  );
}
