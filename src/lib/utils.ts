import { supabase } from './supabase';

export async function logAudit(
  action: string,
  tableName: string,
  recordId?: string,
  details?: Record<string, unknown>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      user_email: user?.email,
      action,
      table_name: tableName,
      record_id: recordId,
      details,
    });
  } catch (error) {
    console.error('Error logging audit:', error);
  }
}

export function exportToCSV(data: unknown[], filename: string) {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  const items = data as Record<string, unknown>[];
  const headers = Object.keys(items[0]);

  const csvContent = [
    headers.join(','),
    ...items.map(row =>
      headers.map(header => {
        const value = row[header];
        const stringValue = value === null || value === undefined ? '' : String(value);
        return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function formatDate(dateString: string | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateString: string | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getCountryFlag(countryName: string | undefined): string {
  if (!countryName) return '🌐';

  const countryMap: Record<string, string> = {
    'India': '🇮🇳',
    'United States': '🇺🇸',
    'USA': '🇺🇸',
    'United Kingdom': '🇬🇧',
    'UK': '🇬🇧',
    'Canada': '🇨🇦',
    'Australia': '🇦🇺',
    'Germany': '🇩🇪',
    'France': '🇫🇷',
    'China': '🇨🇳',
    'Japan': '🇯🇵',
    'Singapore': '🇸🇬',
    'UAE': '🇦🇪',
    'United Arab Emirates': '🇦🇪',
    'Saudi Arabia': '🇸🇦',
    'Brazil': '🇧🇷',
    'Mexico': '🇲🇽',
    'Spain': '🇪🇸',
    'Italy': '🇮🇹',
    'Netherlands': '🇳🇱',
    'Switzerland': '🇨🇭',
    'Sweden': '🇸🇪',
    'Norway': '🇳🇴',
    'Denmark': '🇩🇰',
    'Finland': '🇫🇮',
    'Poland': '🇵🇱',
    'Russia': '🇷🇺',
    'South Korea': '🇰🇷',
    'Thailand': '🇹🇭',
    'Malaysia': '🇲🇾',
    'Indonesia': '🇮🇩',
    'Vietnam': '🇻🇳',
    'Philippines': '🇵🇭',
    'Pakistan': '🇵🇰',
    'Bangladesh': '🇧🇩',
    'Sri Lanka': '🇱🇰',
    'Nepal': '🇳🇵',
    'South Africa': '🇿🇦',
    'Egypt': '🇪🇬',
    'Nigeria': '🇳🇬',
    'Kenya': '🇰🇪',
    'Argentina': '🇦🇷',
    'Chile': '🇨🇱',
    'Colombia': '🇨🇴',
    'Peru': '🇵🇪',
    'New Zealand': '🇳🇿',
    'Turkey': '🇹🇷',
    'Israel': '🇮🇱',
    'Qatar': '🇶🇦',
    'Kuwait': '🇰🇼',
    'Oman': '🇴🇲',
    'Bahrain': '🇧🇭',
  };

  return countryMap[countryName] || '🌐';
}
