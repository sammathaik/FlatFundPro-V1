import { CheckCircle, Circle, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface FlatStatus {
  building_name: string;
  flat_number: string;
  flat_id: string;
  occupant_name: string;
  payment_status: 'paid' | 'underpaid' | 'overpaid' | 'unpaid';
  total_paid: number;
  amount_due: number;
  approved_count: number;
  pending_count: number;
  rejected_count: number;
}

interface CollectionStatusGridProps {
  flats: FlatStatus[];
  showAmounts?: boolean;
  showLegend?: boolean;
}

export default function CollectionStatusGrid({
  flats,
  showAmounts = false,
  showLegend = true,
}: CollectionStatusGridProps) {
  const groupedByBuilding = flats.reduce((acc, flat) => {
    if (!acc[flat.building_name]) {
      acc[flat.building_name] = [];
    }
    acc[flat.building_name].push(flat);
    return acc;
  }, {} as Record<string, FlatStatus[]>);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 border-green-500 text-green-800';
      case 'underpaid':
        return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'overpaid':
        return 'bg-blue-100 border-blue-500 text-blue-800';
      case 'unpaid':
        return 'bg-red-100 border-red-500 text-red-800';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5" />;
      case 'underpaid':
        return <TrendingDown className="w-5 h-5" />;
      case 'overpaid':
        return <TrendingUp className="w-5 h-5" />;
      case 'unpaid':
        return <Circle className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Paid';
      case 'underpaid':
        return 'Underpaid';
      case 'overpaid':
        return 'Overpaid';
      case 'unpaid':
        return 'Unpaid';
      default:
        return 'Unknown';
    }
  };

  const statusCounts = flats.reduce(
    (acc, flat) => {
      acc[flat.payment_status] = (acc[flat.payment_status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      {/* Legend */}
      {showLegend && (
        <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Payment Status Legend</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 border-2 border-green-500 rounded flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Paid</div>
                <div className="text-xs text-gray-600">{statusCounts.paid || 0} flats</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-yellow-100 border-2 border-yellow-500 rounded flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Underpaid</div>
                <div className="text-xs text-gray-600">{statusCounts.underpaid || 0} flats</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 border-2 border-blue-500 rounded flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Overpaid</div>
                <div className="text-xs text-gray-600">{statusCounts.overpaid || 0} flats</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-100 border-2 border-red-500 rounded flex items-center justify-center">
                <Circle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Unpaid</div>
                <div className="text-xs text-gray-600">{statusCounts.unpaid || 0} flats</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Grid by Building */}
      {Object.entries(groupedByBuilding).map(([buildingName, buildingFlats]) => (
        <div key={buildingName} className="bg-white rounded-lg p-6 border-2 border-gray-200">
          <h3 className="font-bold text-lg text-gray-900 mb-4">{buildingName}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {buildingFlats.map((flat) => (
              <div
                key={flat.flat_id}
                className={`p-3 rounded-lg border-2 transition-all hover:shadow-md ${getStatusColor(
                  flat.payment_status
                )}`}
                title={`${flat.flat_number} - ${flat.occupant_name} - ${getStatusLabel(
                  flat.payment_status
                )}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm">{flat.flat_number}</span>
                  {getStatusIcon(flat.payment_status)}
                </div>
                <div className="text-xs font-medium">{getStatusLabel(flat.payment_status)}</div>
                {showAmounts && (
                  <div className="mt-2 pt-2 border-t border-current/20">
                    <div className="text-xs">
                      <div>Paid: ₹{flat.total_paid.toLocaleString()}</div>
                      <div>Due: ₹{flat.amount_due.toLocaleString()}</div>
                    </div>
                  </div>
                )}
                {flat.pending_count > 0 && (
                  <div className="mt-1 text-xs opacity-75">
                    {flat.pending_count} pending
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Summary Statistics */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border-2 border-blue-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">{statusCounts.paid || 0}</div>
            <div className="text-sm text-gray-600">Fully Paid</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">{statusCounts.underpaid || 0}</div>
            <div className="text-sm text-gray-600">Partially Paid</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{statusCounts.overpaid || 0}</div>
            <div className="text-sm text-gray-600">Overpaid</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{statusCounts.unpaid || 0}</div>
            <div className="text-sm text-gray-600">Not Paid</div>
          </div>
        </div>
      </div>
    </div>
  );
}
