import { CreditCard, Calendar, Hash, Building2, CheckCircle, XCircle } from 'lucide-react';
import ValidationStatusBadge from './ValidationStatusBadge';

interface PaymentValidationDetailsProps {
  payment: {
    validation_status?: string;
    validation_confidence_score?: number;
    validation_reason?: string;
    extracted_amount?: number;
    extracted_date?: string;
    extracted_transaction_ref?: string;
    payment_type?: string;
    payment_platform?: string;
    validation_performed_at?: string;
    ai_classification?: {
      classification?: string;
      confidence?: number;
      reason?: string;
    };
  };
}

export default function PaymentValidationDetails({
  payment,
}: PaymentValidationDetailsProps) {
  if (!payment.validation_status || payment.validation_status === 'PENDING') {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
          <span className="text-sm">Validation pending...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <ValidationStatusBadge
          status={payment.validation_status}
          confidenceScore={payment.validation_confidence_score}
          showDetails={false}
        />
        {payment.validation_performed_at && (
          <span className="text-xs text-gray-500">
            Validated on{' '}
            {new Date(payment.validation_performed_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>

      {payment.validation_reason && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Reason:</span> {payment.validation_reason}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {payment.extracted_amount && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-gray-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">
                Extracted Amount
              </span>
            </div>
            <p className="text-lg font-bold text-gray-900">
              ₹{payment.extracted_amount.toLocaleString('en-IN')}
            </p>
          </div>
        )}

        {payment.extracted_date && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-gray-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">
                Extracted Date
              </span>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {new Date(payment.extracted_date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
        )}

        {payment.extracted_transaction_ref && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="w-4 h-4 text-gray-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">
                Transaction Reference
              </span>
            </div>
            <p className="text-sm font-mono text-gray-900 break-all">
              {payment.extracted_transaction_ref}
            </p>
          </div>
        )}

        {payment.payment_type && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-gray-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">
                Payment Type
              </span>
            </div>
            <p className="text-lg font-bold text-gray-900">{payment.payment_type}</p>
            {payment.payment_platform && (
              <p className="text-xs text-gray-600 mt-1">via {payment.payment_platform}</p>
            )}
          </div>
        )}
      </div>

      {payment.ai_classification && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            {payment.ai_classification.confidence && payment.ai_classification.confidence > 80 ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-yellow-600" />
            )}
            <span className="text-sm font-semibold text-gray-800">AI Classification</span>
          </div>
          <div className="space-y-2">
            <div>
              <span className="text-xs text-gray-600">Type:</span>
              <p className="text-sm font-medium text-gray-900">
                {payment.ai_classification.classification}
              </p>
            </div>
            {payment.ai_classification.confidence && (
              <div>
                <span className="text-xs text-gray-600">Confidence:</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${payment.ai_classification.confidence}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {payment.ai_classification.confidence}%
                  </span>
                </div>
              </div>
            )}
            {payment.ai_classification.reason && (
              <div>
                <span className="text-xs text-gray-600">Analysis:</span>
                <p className="text-sm text-gray-800 mt-1">
                  {payment.ai_classification.reason}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
