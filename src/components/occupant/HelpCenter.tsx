import { useState, useEffect } from 'react';
import { HelpCircle, Search, ChevronDown, ChevronUp, ThumbsUp, Eye, Lightbulb, AlertCircle, Info, CheckCircle, BookOpen, Camera, AlertTriangle, Save, FileText, Clock, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
  view_count: number;
  helpful_count: number;
  order_position: number;
}

interface HelpfulTip {
  id: string;
  tip_type: string;
  title: string;
  content: string;
  icon: string;
  color: string;
  order_position: number;
}

const categories = [
  { id: 'all', name: 'All Topics', icon: BookOpen },
  { id: 'login', name: 'Login & Access', icon: HelpCircle },
  { id: 'payments', name: 'Payments', icon: FileText },
  { id: 'account', name: 'My Account', icon: Info },
  { id: 'troubleshooting', name: 'Troubleshooting', icon: AlertCircle },
  { id: 'general', name: 'General', icon: CheckCircle }
];

export default function HelpCenter() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [tips, setTips] = useState<HelpfulTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [markedHelpful, setMarkedHelpful] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchFAQsAndTips();
  }, []);

  const fetchFAQsAndTips = async () => {
    setLoading(true);
    try {
      const [faqsResult, tipsResult] = await Promise.all([
        supabase
          .from('faqs')
          .select('*')
          .eq('is_published', true)
          .order('order_position', { ascending: true }),
        supabase
          .from('helpful_tips')
          .select('*')
          .eq('is_active', true)
          .order('order_position', { ascending: true })
      ]);

      if (faqsResult.error) throw faqsResult.error;
      if (tipsResult.error) throw tipsResult.error;

      setFaqs(faqsResult.data || []);
      setTips(tipsResult.data || []);
    } catch (error: any) {
      console.error('Error fetching help content:', error);
    } finally {
      setLoading(false);
    }
  };

  const incrementFaqViews = async (faqId: string) => {
    try {
      await supabase.rpc('increment_faq_views', { faq_id: faqId });
    } catch (error) {
      console.error('Error incrementing FAQ views:', error);
    }
  };

  const markFaqHelpful = async (faqId: string) => {
    if (markedHelpful.has(faqId)) return;

    try {
      await supabase.rpc('mark_faq_helpful', { faq_id: faqId });
      setMarkedHelpful(prev => new Set(prev).add(faqId));
      setFaqs(prev => prev.map(faq =>
        faq.id === faqId ? { ...faq, helpful_count: faq.helpful_count + 1 } : faq
      ));
    } catch (error) {
      console.error('Error marking FAQ as helpful:', error);
    }
  };

  const toggleFaqExpansion = (faqId: string) => {
    if (expandedFaq !== faqId) {
      incrementFaqViews(faqId);
    }
    setExpandedFaq(expandedFaq === faqId ? null : faqId);
  };

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = !searchTerm ||
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getTipIcon = (iconName: string) => {
    switch (iconName) {
      case 'camera': return Camera;
      case 'alert-circle': return AlertCircle;
      case 'info': return Info;
      case 'check-circle': return CheckCircle;
      case 'save': return Save;
      case 'file-text': return FileText;
      case 'clock': return Clock;
      case 'calendar': return Calendar;
      default: return Lightbulb;
    }
  };

  const getTipColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'red':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'green':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'purple':
        return 'bg-purple-50 border-purple-200 text-purple-900';
      case 'orange':
        return 'bg-orange-50 border-orange-200 text-orange-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  const getTipIconColor = (color: string) => {
    switch (color) {
      case 'blue': return 'text-blue-600';
      case 'red': return 'text-red-600';
      case 'green': return 'text-green-600';
      case 'purple': return 'text-purple-600';
      case 'orange': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <HelpCircle className="w-8 h-8 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Help Center</h2>
          <p className="text-gray-600">Find answers to common questions and helpful tips</p>
        </div>
      </div>

      {!loading && tips.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Helpful Tips
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tips.map((tip) => {
              const Icon = getTipIcon(tip.icon);
              return (
                <div
                  key={tip.id}
                  className={`p-4 rounded-lg border-2 ${getTipColorClasses(tip.color)}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${getTipIconColor(tip.color)}`} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold mb-1">{tip.title}</h4>
                      <p className="text-sm leading-relaxed">{tip.content}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search for answers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {category.name}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading help content...</p>
          </div>
        </div>
      ) : filteredFaqs.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
          <p className="text-gray-600">
            {searchTerm
              ? `No FAQs match "${searchTerm}". Try different keywords.`
              : 'No FAQs available in this category yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedCategory === 'all'
                ? 'All Questions'
                : categories.find(c => c.id === selectedCategory)?.name}
            </h3>
            <span className="text-sm text-gray-600">
              {filteredFaqs.length} {filteredFaqs.length === 1 ? 'question' : 'questions'}
            </span>
          </div>

          <div className="space-y-3">
            {filteredFaqs.map((faq) => (
              <div
                key={faq.id}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                <button
                  onClick={() => toggleFaqExpansion(faq.id)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 pr-4">
                    <h4 className="font-semibold text-gray-900">{faq.question}</h4>
                    {expandedFaq === faq.id && (
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {faq.view_count} views
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" />
                          {faq.helpful_count} found helpful
                        </span>
                      </div>
                    )}
                  </div>
                  {expandedFaq === faq.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>

                {expandedFaq === faq.id && (
                  <div className="px-6 pb-4 border-t border-gray-100">
                    <div className="pt-4 text-gray-700 leading-relaxed whitespace-pre-line">
                      {faq.answer}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => markFaqHelpful(faq.id)}
                        disabled={markedHelpful.has(faq.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                          markedHelpful.has(faq.id)
                            ? 'bg-green-100 text-green-800 cursor-default'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <ThumbsUp className="w-4 h-4" />
                        {markedHelpful.has(faq.id) ? 'Marked as helpful!' : 'Was this helpful?'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Still need help?</h3>
            <p className="text-blue-800 text-sm">
              If you cannot find the answer you are looking for, please contact your apartment admin.
              They can provide specific information about your apartment complex and help resolve any issues.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
