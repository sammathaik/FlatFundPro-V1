import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface ValidationStatusBadgeProps {
  status: string;
  confidenceScore?: number;
  reason?: string;
  showDetails?: boolean;
}

export default function ValidationStatusBadge({
  status,
  confidenceScore = 0,
  reason,
  showDetails = false,
}: ValidationStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'AUTO_APPROVED':
        return {
          label: 'Auto Approved',
          icon: CheckCircle,
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-300',
          iconColor: 'text-green-600',
        };
      case 'MANUAL_REVIEW':
        return {
          label: 'Manual Review',
          icon: AlertTriangle,
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-300',
          iconColor: 'text-yellow-600',
        };
      case 'REJECTED':
        return {
          label: 'Rejected',
          icon: XCircle,
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-300',
          iconColor: 'text-red-600',
        };
      case 'PENDING':
      default:
        return {
          label: 'Pending Validation',
          icon: Clock,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-300',
          iconColor: 'text-gray-600',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="inline-block">
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${config.bgColor} ${config.borderColor}`}
      >
        <Icon className={`w-4 h-4 ${config.iconColor}`} />
        <span className={`text-sm font-semibold ${config.textColor}`}>
          {config.label}
        </span>
        {showDetails && confidenceScore > 0 && (
          <span className={`text-xs ${config.textColor} opacity-75`}>
            ({confidenceScore}%)
          </span>
        )}
      </div>
      {showDetails && reason && (
        <div className={`mt-2 p-3 rounded-lg text-xs ${config.bgColor} ${config.textColor}`}>
          <p className="font-semibold mb-1">Validation Details:</p>
          <p>{reason}</p>
        </div>
      )}
    </div>
  );
}
