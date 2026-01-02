import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, X, Check, Info, Zap, Shield, Wrench, Settings, FileText, PiggyBank, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CreateForecastWizardProps {
  user: any;
  apartments: any[];
  onClose: () => void;
}

interface CategoryConfig {
  name: string;
  description: string;
  icon: string;
  type: 'predefined' | 'custom';
  default_enabled: boolean;
  selected?: boolean;
  forecast_amount?: number;
  reference_amount?: number;
  expense_type?: 'recurring' | 'one-time';
  inflation_percentage?: number;
  notes?: string;
  breakdown?: { item: string; amount: number }[];
}

const CreateForecastWizard: React.FC<CreateForecastWizardProps> = ({ user, apartments, onClose }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [forecastName, setForecastName] = useState('');
  const [forecastPeriod, setForecastPeriod] = useState<'quarterly' | 'semi-annual' | 'annual'>('annual');
  const [forecastYear, setForecastYear] = useState(new Date().getFullYear());
  const [useReference, setUseReference] = useState(false);
  const [referenceYear, setReferenceYear] = useState(new Date().getFullYear() - 1);

  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [customCategoryDesc, setCustomCategoryDesc] = useState('');

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const apartmentId = apartments[0]?.id;

  useEffect(() => {
    loadPredefinedCategories();
    generateDefaultName();
  }, [forecastPeriod, forecastYear]);

  const generateDefaultName = () => {
    const periodLabel = forecastPeriod === 'quarterly' ? 'Q1-Q4' :
                       forecastPeriod === 'semi-annual' ? 'H1-H2' : 'Annual';
    setForecastName(`${periodLabel} Budget ${forecastYear}-${forecastYear + 1}`);
  };

  const loadPredefinedCategories = async () => {
    try {
      const { data, error } = await supabase.rpc('get_predefined_expense_categories');
      if (error) throw error;

      const categoriesData = data as CategoryConfig[];
      setCategories(categoriesData.map(cat => ({
        ...cat,
        selected: cat.default_enabled,
        forecast_amount: 0,
        reference_amount: 0,
        expense_type: 'recurring' as const,
        inflation_percentage: 0,
        notes: '',
        breakdown: []
      })));
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const addCustomCategory = () => {
    if (!customCategoryName.trim()) return;

    const newCategory: CategoryConfig = {
      name: customCategoryName,
      description: customCategoryDesc || 'Custom expense category',
      icon: 'tag',
      type: 'custom',
      default_enabled: true,
      selected: true,
      forecast_amount: 0,
      reference_amount: 0,
      expense_type: 'recurring',
      inflation_percentage: 0,
      notes: '',
      breakdown: []
    };

    setCategories([...categories, newCategory]);
    setCustomCategoryName('');
    setCustomCategoryDesc('');
  };

  const toggleCategory = (index: number) => {
    const updated = [...categories];
    updated[index].selected = !updated[index].selected;
    setCategories(updated);
  };

  const updateCategoryAmount = (index: number, field: string, value: any) => {
    const updated = [...categories];
    (updated[index] as any)[field] = value;
    setCategories(updated);
  };

  const removeCategoryBreakdownItem = (catIndex: number, itemIndex: number) => {
    const updated = [...categories];
    updated[catIndex].breakdown?.splice(itemIndex, 1);
    setCategories(updated);
  };

  const addCategoryBreakdownItem = (catIndex: number) => {
    const updated = [...categories];
    if (!updated[catIndex].breakdown) {
      updated[catIndex].breakdown = [];
    }
    updated[catIndex].breakdown?.push({ item: '', amount: 0 });
    setCategories(updated);
  };

  const updateBreakdownItem = (catIndex: number, itemIndex: number, field: 'item' | 'amount', value: any) => {
    const updated = [...categories];
    if (updated[catIndex].breakdown) {
      (updated[catIndex].breakdown![itemIndex] as any)[field] = value;
      setCategories(updated);
    }
  };

  const getTotalForecast = () => {
    return categories
      .filter(c => c.selected)
      .reduce((sum, c) => sum + (c.forecast_amount || 0), 0);
  };

  const getTotalReference = () => {
    return categories
      .filter(c => c.selected)
      .reduce((sum, c) => sum + (c.reference_amount || 0), 0);
  };

  const getChangePercentage = () => {
    const ref = getTotalReference();
    const forecast = getTotalForecast();
    if (ref === 0) return 0;
    return ((forecast - ref) / ref * 100).toFixed(1);
  };

  const saveForecast = async (status: 'draft' | 'proposed') => {
    try {
      setLoading(true);

      const forecastData = {
        apartment_id: apartmentId,
        forecast_name: forecastName,
        forecast_period: forecastPeriod,
        forecast_year: forecastYear,
        reference_period: useReference ? forecastPeriod : null,
        reference_year: useReference ? referenceYear : null,
        status: status,
        created_by: user.id,
        ...(status === 'proposed' && {
          proposed_at: new Date().toISOString(),
          proposed_by: user.id
        })
      };

      const { data: forecast, error: forecastError } = await supabase
        .from('budget_forecasts')
        .insert(forecastData)
        .select()
        .single();

      if (forecastError) throw forecastError;

      const selectedCategories = categories.filter(c => c.selected);
      const categoriesData = selectedCategories.map((cat, index) => ({
        forecast_id: forecast.id,
        category_name: cat.name,
        category_type: cat.type,
        category_description: cat.description,
        forecast_amount: cat.forecast_amount || 0,
        reference_amount: cat.reference_amount || 0,
        expense_type: cat.expense_type || 'recurring',
        inflation_percentage: cat.inflation_percentage || 0,
        notes: cat.notes || null,
        breakdown: cat.breakdown || [],
        display_order: index,
        is_enabled: true
      }));

      const { error: categoriesError } = await supabase
        .from('forecast_expense_categories')
        .insert(categoriesData);

      if (categoriesError) throw categoriesError;

      onClose();
    } catch (error) {
      console.error('Error saving forecast:', error);
      alert('Error saving forecast. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      zap: <Zap className="w-5 h-5" />,
      shield: <Shield className="w-5 h-5" />,
      wrench: <Wrench className="w-5 h-5" />,
      tool: <Settings className="w-5 h-5" />,
      'file-text': <FileText className="w-5 h-5" />,
      'piggy-bank': <PiggyBank className="w-5 h-5" />,
      tag: <FileText className="w-5 h-5" />
    };
    return icons[iconName] || <FileText className="w-5 h-5" />;
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Let's set up your budget forecast</h3>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Forecast Name
        </label>
        <input
          type="text"
          value={forecastName}
          onChange={(e) => setForecastName(e.target.value)}
          placeholder="e.g., Annual Budget 2026-27"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">Give your forecast a recognizable name</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Forecast Period
        </label>
        <div className="space-y-3">
          <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="period"
              value="quarterly"
              checked={forecastPeriod === 'quarterly'}
              onChange={(e) => setForecastPeriod(e.target.value as any)}
              className="mt-1"
            />
            <div>
              <div className="font-medium text-gray-900">Quarterly (3 months)</div>
              <div className="text-sm text-gray-600">Best for societies with variable expenses</div>
            </div>
          </label>
          <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="period"
              value="semi-annual"
              checked={forecastPeriod === 'semi-annual'}
              onChange={(e) => setForecastPeriod(e.target.value as any)}
              className="mt-1"
            />
            <div>
              <div className="font-medium text-gray-900">Semi-Annual (6 months)</div>
              <div className="text-sm text-gray-600">Balance between flexibility and planning effort</div>
            </div>
          </label>
          <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="period"
              value="annual"
              checked={forecastPeriod === 'annual'}
              onChange={(e) => setForecastPeriod(e.target.value as any)}
              className="mt-1"
            />
            <div>
              <div className="font-medium text-gray-900">Annual (12 months)</div>
              <div className="text-sm text-gray-600">Recommended for stable, predictable expenses</div>
            </div>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Forecast Year
        </label>
        <select
          value={forecastYear}
          onChange={(e) => setForecastYear(parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {[0, 1, 2].map(offset => {
            const year = new Date().getFullYear() + offset;
            return (
              <option key={year} value={year}>FY {year}-{year + 1}</option>
            );
          })}
        </select>
        <p className="mt-1 text-xs text-gray-500">Select the financial year you're planning for</p>
      </div>

      <div className="border border-gray-200 rounded-lg p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={useReference}
            onChange={(e) => setUseReference(e.target.checked)}
            className="mt-1"
          />
          <div>
            <div className="font-medium text-gray-900">Use last year's actuals as reference</div>
            <div className="text-sm text-gray-600">Helps ground your forecast in reality</div>
          </div>
        </label>
        {useReference && (
          <div className="mt-3 pl-7">
            <select
              value={referenceYear}
              onChange={(e) => setReferenceYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {[1, 2, 3].map(offset => {
                const year = new Date().getFullYear() - offset;
                return (
                  <option key={year} value={year}>FY {year}-{year + 1}</option>
                );
              })}
            </select>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">What expenses do you expect?</h3>
        <p className="text-sm text-gray-600">Select the categories relevant to your society</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((category, index) => (
          <label
            key={index}
            className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
              category.selected
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <input
              type="checkbox"
              checked={category.selected}
              onChange={() => toggleCategory(index)}
              className="mt-1"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="text-blue-600">
                  {getIconComponent(category.icon)}
                </div>
                <div className="font-medium text-gray-900">{category.name}</div>
              </div>
              <div className="text-sm text-gray-600">{category.description}</div>
              {category.selected && useReference && (
                <div className="text-xs text-blue-600 mt-2">
                  Last year: ₹{(category.reference_amount || 0).toLocaleString('en-IN')}
                </div>
              )}
            </div>
          </label>
        ))}
      </div>

      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Add Custom Expense Category</h4>
        <div className="space-y-3">
          <input
            type="text"
            value={customCategoryName}
            onChange={(e) => setCustomCategoryName(e.target.value)}
            placeholder="Category name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <input
            type="text"
            value={customCategoryDesc}
            onChange={(e) => setCustomCategoryDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={addCustomCategory}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600" />
          Planning Tips
        </h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Start with recurring expenses first</li>
          <li>• Include a contingency buffer (10-15%)</li>
          <li>• Review past AGM decisions for planned work</li>
        </ul>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Estimate expenses for {forecastName}</h3>
        <p className="text-sm text-gray-600">Enter realistic estimates. You can refine these later.</p>
      </div>

      <div className="space-y-4">
        {categories.filter(c => c.selected).map((category, index) => {
          const actualIndex = categories.indexOf(category);
          const isExpanded = expandedCategory === category.name;

          return (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="text-blue-600">
                  {getIconComponent(category.icon)}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{category.name}</h4>
                  <p className="text-sm text-gray-600">{category.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3">
                {useReference && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Last Year (Reference)
                    </label>
                    <input
                      type="number"
                      value={category.reference_amount || ''}
                      onChange={(e) => updateCategoryAmount(actualIndex, 'reference_amount', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      placeholder="₹0"
                    />
                  </div>
                )}
                <div className={useReference ? '' : 'col-span-2'}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Forecast Amount *
                  </label>
                  <input
                    type="number"
                    value={category.forecast_amount || ''}
                    onChange={(e) => updateCategoryAmount(actualIndex, 'forecast_amount', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="₹0"
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={category.notes || ''}
                  onChange={(e) => updateCategoryAmount(actualIndex, 'notes', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., New security contract, salary hike expected"
                  rows={2}
                />
              </div>

              <button
                onClick={() => setExpandedCategory(isExpanded ? null : category.name)}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                {isExpanded ? '− Less details' : '+ More details'}
              </button>

              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Expense Type
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`type-${index}`}
                          value="recurring"
                          checked={category.expense_type === 'recurring'}
                          onChange={() => updateCategoryAmount(actualIndex, 'expense_type', 'recurring')}
                        />
                        <span className="text-sm">Recurring</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`type-${index}`}
                          value="one-time"
                          checked={category.expense_type === 'one-time'}
                          onChange={() => updateCategoryAmount(actualIndex, 'expense_type', 'one-time')}
                        />
                        <span className="text-sm">One-time</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Inflation / Increase %
                    </label>
                    <input
                      type="number"
                      value={category.inflation_percentage || ''}
                      onChange={(e) => updateCategoryAmount(actualIndex, 'inflation_percentage', parseFloat(e.target.value) || 0)}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                      step="0.1"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-6 -mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Total Forecast:</span>
          <span className="text-lg font-bold text-gray-900">₹{getTotalForecast().toLocaleString('en-IN')}</span>
        </div>
        {useReference && (
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>vs Last Year:</span>
            <span className={parseFloat(getChangePercentage()) >= 0 ? 'text-orange-600' : 'text-green-600'}>
              {parseFloat(getChangePercentage()) >= 0 ? '+' : ''}{getChangePercentage()}%
            </span>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Review your forecast</h3>
        <p className="text-sm text-gray-600">Check everything before saving</p>
      </div>

      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">{forecastName}</h4>
        <div className="text-sm text-gray-700 space-y-1">
          <div>Period: {forecastPeriod === 'quarterly' ? 'Quarterly' : forecastPeriod === 'semi-annual' ? 'Semi-Annual' : 'Annual'}</div>
          <div>Year: {forecastYear}-{forecastYear + 1}</div>
          {useReference && <div>Reference: FY {referenceYear}-{referenceYear + 1}</div>}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Financial Summary</h4>
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Total Forecasted Expenses</span>
            <span className="text-2xl font-bold text-gray-900">₹{getTotalForecast().toLocaleString('en-IN')}</span>
          </div>
          {useReference && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">vs Last Year</span>
                <span className={parseFloat(getChangePercentage()) >= 0 ? 'text-orange-600 font-medium' : 'text-green-600 font-medium'}>
                  {parseFloat(getChangePercentage()) >= 0 ? '+' : ''}₹{(getTotalForecast() - getTotalReference()).toLocaleString('en-IN')} ({parseFloat(getChangePercentage()) >= 0 ? '+' : ''}{getChangePercentage()}%)
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Category Breakdown</h4>
        <div className="space-y-2">
          {categories.filter(c => c.selected).map((category, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-2">
                <div className="text-gray-400">
                  {getIconComponent(category.icon)}
                </div>
                <span className="text-sm text-gray-700">{category.name}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  ₹{(category.forecast_amount || 0).toLocaleString('en-IN')}
                </div>
                {useReference && category.reference_amount && (
                  <div className="text-xs text-gray-500">
                    was ₹{category.reference_amount.toLocaleString('en-IN')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-3">What would you like to do?</h4>
        <div className="space-y-3">
          <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="saveAction"
              defaultChecked
              className="mt-1"
            />
            <div>
              <div className="font-medium text-gray-900">Save as Draft</div>
              <div className="text-sm text-gray-600">Continue editing later, not shared with committee</div>
            </div>
          </label>
          <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="saveAction"
              className="mt-1"
            />
            <div>
              <div className="font-medium text-gray-900">Propose to Committee</div>
              <div className="text-sm text-gray-600">Mark as proposed, ready for review and approval</div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );

  const steps = [
    { number: 1, title: 'Setup', component: renderStep1 },
    { number: 2, title: 'Categories', component: renderStep2 },
    { number: 3, title: 'Estimates', component: renderStep3 },
    { number: 4, title: 'Review', component: renderStep4 }
  ];

  const selectedSaveAction = () => {
    const radio = document.querySelector('input[name="saveAction"]:checked') as HTMLInputElement;
    return radio?.value === 'proposed' ? 'proposed' : 'draft';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Create Budget Forecast</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 px-6 py-4 border-b border-gray-200">
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep === step.number
                      ? 'bg-blue-600 text-white'
                      : currentStep > step.number
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {currentStep > step.number ? <Check className="w-4 h-4" /> : step.number}
                </div>
                <span className={`text-sm font-medium ${currentStep === step.number ? 'text-gray-900' : 'text-gray-500'}`}>
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`h-0.5 w-12 ${currentStep > step.number ? 'bg-green-600' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {steps[currentStep - 1].component()}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : onClose()}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {currentStep > 1 ? 'Back' : 'Cancel'}
          </button>

          {currentStep < 4 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              {currentStep === 3 ? 'Review Summary' : 'Next'}
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => {
                const action = (document.querySelector('input[name="saveAction"]:checked') as HTMLInputElement)?.nextElementSibling?.querySelector('.font-medium')?.textContent?.includes('Propose') ? 'proposed' : 'draft';
                saveForecast(action);
              }}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? 'Saving...' : 'Save & Finish'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateForecastWizard;
