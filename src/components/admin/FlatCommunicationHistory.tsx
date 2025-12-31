import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, MessageSquare, CheckCircle2, XCircle, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface FlatCommunication {
  id: string;
  flat_number: string;
  recipient_name: string | null;
  recipient_email: string | null;
  recipient_mobile_masked: string | null;
  communication_channel: string;
  communication_type: string;
  payment_id: string | null;
  payment_amount: number | null;
  payment_date: string | null;
  message_subject: string | null;
  message_preview: string | null;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  triggered_by_event: string | null;
  template_name: string | null;
  created_at: string;
}

interface FlatCommunicationHistoryProps {
  apartmentId: string;
  flatNumber: string;
}

export const FlatCommunicationHistory: React.FC<FlatCommunicationHistoryProps> = ({ apartmentId, flatNumber }) => {
  const [communications, setCommunications] = useState<FlatCommunication[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchCommunications();
  }, [apartmentId, flatNumber]);

  const fetchCommunications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_flat_communication_history', {
        p_apartment_id: apartmentId,
        p_flat_number: flatNumber,
        p_limit: 100
      });

      if (error) throw error;
      setCommunications(data || []);
    } catch (error) {
      console.error('Error fetching flat communications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      DELIVERED: 'bg-green-100 text-green-800 border-green-200',
      SENT: 'bg-blue-100 text-blue-800 border-blue-200',
      FAILED: 'bg-red-100 text-red-800 border-red-200',
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      SKIPPED: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    const icons = {
      DELIVERED: <CheckCircle2 className="w-3 h-3" />,
      SENT: <Clock className="w-3 h-3" />,
      FAILED: <XCircle className="w-3 h-3" />,
      PENDING: <Clock className="w-3 h-3" />,
      SKIPPED: <AlertCircle className="w-3 h-3" />
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles] || styles.PENDING}`}>
        {icons[status as keyof typeof icons]}
        {status}
      </span>
    );
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'EMAIL':
        return <Mail className="w-4 h-4 text-blue-600" />;
      case 'WHATSAPP':
        return <MessageSquare className="w-4 h-4 text-green-600" />;
      default:
        return <MessageSquare className="w-4 h-4 text-gray-600" />;
    }
  };

  const groupByPayment = () => {
    const grouped: { [key: string]: FlatCommunication[] } = {
      'no_payment': []
    };

    communications.forEach(comm => {
      const key = comm.payment_id || 'no_payment';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(comm);
    });

    return grouped;
  };

  const groupedCommunications = groupByPayment();

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 text-sm mt-2">Loading communications...</p>
      </div>
    );
  }

  if (communications.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
        <Mail className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600 text-sm">No communications sent to this flat yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Communication History</h3>
        <div className="text-sm text-gray-600">
          {communications.length} {communications.length === 1 ? 'message' : 'messages'}
        </div>
      </div>

      {Object.entries(groupedCommunications).map(([paymentId, comms]) => {
        if (comms.length === 0) return null;

        const firstComm = comms[0];
        const isPaymentGroup = paymentId !== 'no_payment';

        return (
          <div key={paymentId} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {isPaymentGroup && (
              <div className="bg-blue-50 border-b border-blue-100 px-4 py-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-blue-900">
                    Payment: ₹{firstComm.payment_amount?.toLocaleString()}
                    {firstComm.payment_date && ` - ${new Date(firstComm.payment_date).toLocaleDateString()}`}
                  </div>
                  <div className="text-xs text-blue-700">
                    {comms.length} {comms.length === 1 ? 'notification' : 'notifications'}
                  </div>
                </div>
              </div>
            )}

            <div className="divide-y divide-gray-100">
              {comms.map((comm) => (
                <div key={comm.id} className="hover:bg-gray-50 transition-colors">
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === comm.id ? null : comm.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1">{getChannelIcon(comm.communication_channel)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 mb-1">
                            {comm.message_subject || comm.communication_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </div>
                          <div className="text-xs text-gray-600 mb-2">
                            {comm.recipient_name && <span>{comm.recipient_name} • </span>}
                            {comm.communication_channel === 'EMAIL' ? comm.recipient_email : comm.recipient_mobile_masked}
                          </div>
                          {comm.message_preview && (
                            <div className="text-xs text-gray-500 truncate">{comm.message_preview}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        {getStatusBadge(comm.status)}
                        <div className="text-right text-xs text-gray-500 min-w-[80px]">
                          <div>{new Date(comm.created_at).toLocaleDateString()}</div>
                          <div>{new Date(comm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        {expandedId === comm.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </div>
                  </div>

                  {expandedId === comm.id && (
                    <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100 space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-gray-600">Channel:</span>
                          <span className="ml-2 font-medium">{comm.communication_channel}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Type:</span>
                          <span className="ml-2 font-medium">{comm.communication_type.replace(/_/g, ' ')}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Sent:</span>
                          <span className="ml-2 font-medium">
                            {comm.sent_at ? new Date(comm.sent_at).toLocaleString() : 'Not sent'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Delivered:</span>
                          <span className="ml-2 font-medium">
                            {comm.delivered_at ? new Date(comm.delivered_at).toLocaleString() : 'N/A'}
                          </span>
                        </div>
                        {comm.template_name && (
                          <div className="col-span-2">
                            <span className="text-gray-600">Template:</span>
                            <span className="ml-2 font-medium">{comm.template_name}</span>
                          </div>
                        )}
                      </div>

                      {comm.error_message && (
                        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-3 h-3 text-red-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="font-medium text-red-900 mb-1">Error</div>
                              <div className="text-red-700">{comm.error_message}</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {comm.message_preview && (
                        <div className="p-2 bg-white border border-gray-200 rounded text-xs">
                          <div className="font-medium text-gray-700 mb-1">Message Preview</div>
                          <div className="text-gray-600 whitespace-pre-wrap">{comm.message_preview}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
