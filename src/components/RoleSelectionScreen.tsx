import { Shield, Building2, Home } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string;
  icon: typeof Shield;
  color: string;
  path: string;
}

interface RoleSelectionScreenProps {
  availableRoles: string[];
  onSelectRole: (rolePath: string) => void;
}

export default function RoleSelectionScreen({ availableRoles, onSelectRole }: RoleSelectionScreenProps) {
  const roleDefinitions: Record<string, Role> = {
    super_admin: {
      id: 'super_admin',
      name: 'Super Administrator',
      description: 'Master system access. Manage all apartments and platform settings.',
      icon: Shield,
      color: 'from-emerald-600 to-emerald-700',
      path: '/super-admin'
    },
    admin: {
      id: 'admin',
      name: 'Apartment Admin',
      description: 'Manage your apartment, review payments, and handle resident communications.',
      icon: Building2,
      color: 'from-blue-600 to-indigo-600',
      path: '/admin'
    },
    resident: {
      id: 'resident',
      name: 'Resident Portal',
      description: 'Submit payments, view your payment history, and track status updates.',
      icon: Home,
      color: 'from-gray-600 to-gray-700',
      path: '/occupant/dashboard'
    }
  };

  const roles = availableRoles
    .map(roleId => roleDefinitions[roleId])
    .filter(Boolean);

  if (roles.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">No Active Roles</h2>
          <p className="text-gray-600">
            Your account does not have any active roles assigned. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  if (roles.length === 1) {
    onSelectRole(roles[0].path);
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Welcome to FlatFund Pro</h1>
          <p className="text-xl text-gray-600">
            You have multiple roles. Please select how you'd like to continue.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <button
                key={role.id}
                onClick={() => onSelectRole(role.path)}
                className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 p-8 text-left group"
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${role.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{role.name}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{role.description}</p>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <span className="text-blue-600 font-medium text-sm group-hover:text-blue-700">
                    Continue as {role.name} →
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            You can switch roles anytime from your dashboard
          </p>
        </div>
      </div>
    </div>
  );
}
