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

  const cleaned = input.replace(/[\s\-()]/g, '');

  const numericOnly = cleaned.replace(/[^\d+]/g, '');

  if (numericOnly.startsWith('+91')) {
    const localPart = numericOnly.substring(3);
    if (localPart.length === 10) {
      return {
        countryCode: '+91',
        localNumber: localPart,
        fullNumber: `+91${localPart}`,
        wasNormalized: input !== `+91${localPart}`,
        originalValue: input,
      };
    }
  }

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

  if (numericOnly.startsWith('+') && numericOnly.length > 11) {
    for (const country of COUNTRY_CODES) {
      if (numericOnly.startsWith(country.dialCode)) {
        const localPart = numericOnly.substring(country.dialCode.length);
        const expectedLength = country.dialCode === '+91' ? 10 : 10;

        if (localPart.length === expectedLength) {
          return {
            countryCode: country.dialCode,
            localNumber: localPart,
            fullNumber: `${country.dialCode}${localPart}`,
            wasNormalized: true,
            originalValue: input,
          };
        }
      }
    }
  }

  if (/^\d{10}$/.test(numericOnly)) {
    return {
      countryCode: '+91',
      localNumber: numericOnly,
      fullNumber: `+91${numericOnly}`,
      wasNormalized: input !== numericOnly,
      originalValue: input,
    };
  }

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
