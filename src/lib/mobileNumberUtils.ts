export interface CountryCode {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳' },
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
  { code: 'AE', name: 'UAE', dialCode: '+971', flag: '🇦🇪' },
  { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬' },
  { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾' },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
];

export interface NormalizedMobileNumber {
  countryCode: string;
  localNumber: string;
  fullNumber: string;
  wasNormalized: boolean;
  originalValue?: string;
}

export function normalizeMobileNumber(input: string | null | undefined): NormalizedMobileNumber {
  const defaultResult: NormalizedMobileNumber = {
    countryCode: '+91',
    localNumber: '',
    fullNumber: '',
    wasNormalized: false,
  };

  if (!input || input.trim() === '') {
    return defaultResult;
  }

  // Remove spaces, dashes, and parentheses but keep + for country code detection
  const cleaned = input.replace(/[\s\-()]/g, '');

  // Check for country codes BEFORE stripping the + sign
  for (const country of COUNTRY_CODES) {
    if (cleaned.startsWith(country.dialCode)) {
      const localPart = cleaned.substring(country.dialCode.length).replace(/\D/g, '');
      const expectedLength = country.dialCode === '+91' ? 10 : 10;

      if (localPart.length === expectedLength) {
        return {
          countryCode: country.dialCode,
          localNumber: localPart,
          fullNumber: `${country.dialCode}${localPart}`,
          wasNormalized: input !== `${country.dialCode}${localPart}`,
          originalValue: input,
        };
      }
    }
  }

  // Now strip all non-digits for remaining checks
  const numericOnly = cleaned.replace(/\D/g, '');

  // Check for India number without + (e.g., "919876543210")
  if (numericOnly.startsWith('91') && numericOnly.length === 12) {
    const localPart = numericOnly.substring(2);
    return {
      countryCode: '+91',
      localNumber: localPart,
      fullNumber: `+91${localPart}`,
      wasNormalized: true,
      originalValue: input,
    };
  }

  // Check for plain 10-digit number (assume India)
  if (/^\d{10}$/.test(numericOnly)) {
    return {
      countryCode: '+91',
      localNumber: numericOnly,
      fullNumber: `+91${numericOnly}`,
      wasNormalized: input !== numericOnly,
      originalValue: input,
    };
  }

  // If more than 10 digits, take last 10 and assume India
  if (numericOnly.length > 10) {
    const localPart = numericOnly.slice(-10);
    return {
      countryCode: '+91',
      localNumber: localPart,
      fullNumber: `+91${localPart}`,
      wasNormalized: true,
      originalValue: input,
    };
  }

  // Return whatever we have (partial entry)
  return {
    countryCode: '+91',
    localNumber: numericOnly,
    fullNumber: numericOnly ? `+91${numericOnly}` : '',
    wasNormalized: false,
    originalValue: input,
  };
}

export function validateMobileNumber(localNumber: string, countryCode: string): {
  isValid: boolean;
  error?: string;
} {
  if (!localNumber || localNumber.trim() === '') {
    return { isValid: false, error: 'Mobile number is required' };
  }

  const cleaned = localNumber.replace(/\D/g, '');

  if (countryCode === '+91') {
    if (cleaned.length !== 10) {
      return { isValid: false, error: 'Mobile number must be exactly 10 digits' };
    }
    if (!cleaned.match(/^[6-9]\d{9}$/)) {
      return { isValid: false, error: 'Please enter a valid Indian mobile number' };
    }
  } else {
    if (cleaned.length < 8 || cleaned.length > 15) {
      return { isValid: false, error: 'Please enter a valid mobile number' };
    }
  }

  return { isValid: true };
}

export function formatMobileForDisplay(fullNumber: string | null | undefined): string {
  if (!fullNumber) return '';

  const normalized = normalizeMobileNumber(fullNumber);
  if (!normalized.localNumber) return '';

  return `${normalized.countryCode} ${normalized.localNumber}`;
}

export function formatMobileForStorage(countryCode: string, localNumber: string): string {
  const cleaned = localNumber.replace(/\D/g, '');
  return `${countryCode}${cleaned}`;
}
