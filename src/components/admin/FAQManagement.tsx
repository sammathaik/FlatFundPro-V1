import { useState, useEffect } from 'react';
import { HelpCircle, Plus, Edit2, Trash2, Save, X, Eye, ThumbsUp, RefreshCw, Lightbulb } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logAuditEvent } from '../../lib/auditLogger';

interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
  order_position: number;
  is_published: boolean;
  view_count: number;
  helpful_count: number;
  created_at: string;
}

interface HelpfulTip {
  id: string;
  tip_type: string;
  title: string;
  content: string;
  icon: string;
  color: string;
  order_position: number;
  is_active: boolean;
}

interface FAQForm {
  category: string;
  question: string;
  answer: string;
  order_position: number;
  is_published: boolean;
}

interface TipForm {
  tip_type: string;
  title: string;
  content: string;
  icon: string;
  color: string;
  order_position: number;
  is_active: boolean;
}

const categories = ['login', 'payments', 'account', 'troubleshooting', 'general'];
const tipTypes = ['quick_tip', 'important', 'did_you_know', 'best_practice'];
const tipIcons = ['camera', 'alert-circle', 'info', 'check-circle', 'save', 'file-text', 'clock', 'calendar'];
const tipColors = ['blue', 'red', 'green', 'purple', 'orange'];

export default function FAQManagement() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [tips, setTips] = useState<HelpfulTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'faqs' | 'tips'>('faqs');
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [editingTip, setEditingTip] = useState<HelpfulTip | null>(null);
  const [showFaqForm, setShowFaqForm] = useState(false);
  const [showTipForm, setShowTipForm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [faqForm, setFaqForm] = useState<FAQForm>({
    category: 'general',
    question: '',
    answer: '',
    order_position: 0,
    is_published: true
  });

  const [tipForm, setTipForm] = useState<TipForm>({
    tip_type: 'quick_tip',
    title: '',
    content: '',
    icon: 'info',
    color: 'blue',
    order_position: 0,
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [faqsResult, tipsResult] = await Promise.all([
        supabase.from('faqs').select('*').order('order_position', { ascending: true }),
        supabase.from('helpful_tips').select('*').order('order_position', { ascending: true })
      ]);

      if (faqsResult.error) throw faqsResult.error;
      if (tipsResult.error) throw tipsResult.error;

      setFaqs(faqsResult.data || []);
      setTips(tipsResult.data || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const saveFaq = async () => {
    try {
      if (editingFaq) {
        const { error } = await supabase
          .from('faqs')
          .update(faqForm)
          .eq('id', editingFaq.id);

        if (error) throw error;

        await logAuditEvent({
          action: 'update',
          tableName: 'faqs',
          recordId: editingFaq.id,
          entityName: faqForm.question,
          changes: { old: editingFaq, new: faqForm }
        });

        setMessage({ type: 'success', text: 'FAQ updated successfully' });
      } else {
        const { error } = await supabase
          .from('faqs')
          .insert([faqForm]);

        if (error) throw error;

        await logAuditEvent({
          action: 'create',
          tableName: 'faqs',
          entityName: faqForm.question,
          changes: { new: faqForm }
        });

        setMessage({ type: 'success', text: 'FAQ created successfully' });
      }

      resetFaqForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving FAQ:', error);
      setMessage({ type: 'error', text: error.message });
    }
  };

  const saveTip = async () => {
    try {
      if (editingTip) {
        const { error } = await supabase
          .from('helpful_tips')
          .update(tipForm)
          .eq('id', editingTip.id);

        if (error) throw error;

        await logAuditEvent({
          action: 'update',
          tableName: 'helpful_tips',
          recordId: editingTip.id,
          entityName: tipForm.title,
          changes: { old: editingTip, new: tipForm }
        });

        setMessage({ type: 'success', text: 'Tip updated successfully' });
      } else {
        const { error } = await supabase
          .from('helpful_tips')
          .insert([tipForm]);

        if (error) throw error;

        await logAuditEvent({
          action: 'create',
          tableName: 'helpful_tips',
          entityName: tipForm.title,
          changes: { new: tipForm }
        });

        setMessage({ type: 'success', text: 'Tip created successfully' });
      }

      resetTipForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving tip:', error);
      setMessage({ type: 'error', text: error.message });
    }
  };

  const deleteFaq = async (faq: FAQ) => {
    if (!confirm('Are you sure you want to delete this FAQ?')) return;

    try {
      const { error } = await supabase
        .from('faqs')
        .delete()
        .eq('id', faq.id);

      if (error) throw error;

      await logAuditEvent({
        action: 'delete',
        tableName: 'faqs',
        recordId: faq.id,
        entityName: faq.question,
        changes: { deleted: faq }
      });

      setMessage({ type: 'success', text: 'FAQ deleted successfully' });
      fetchData();
    } catch (error: any) {
      console.error('Error deleting FAQ:', error);
      setMessage({ type: 'error', text: error.message });
    }
  };

  const deleteTip = async (tip: HelpfulTip) => {
    if (!confirm('Are you sure you want to delete this tip?')) return;

    try {
      const { error } = await supabase
        .from('helpful_tips')
        .delete()
        .eq('id', tip.id);

      if (error) throw error;

      await logAuditEvent({
        action: 'delete',
        tableName: 'helpful_tips',
        recordId: tip.id,
        entityName: tip.title,
        changes: { deleted: tip }
      });

      setMessage({ type: 'success', text: 'Tip deleted successfully' });
      fetchData();
    } catch (error: any) {
      console.error('Error deleting tip:', error);
      setMessage({ type: 'error', text: error.message });
    }
  };

  const editFaq = (faq: FAQ) => {
    setEditingFaq(faq);
    setFaqForm({
      category: faq.category,
      question: faq.question,
      answer: faq.answer,
      order_position: faq.order_position,
      is_published: faq.is_published
    });
    setShowFaqForm(true);
  };

  const editTip = (tip: HelpfulTip) => {
    setEditingTip(tip);
    setTipForm({
      tip_type: tip.tip_type,
      title: tip.title,
      content: tip.content,
      icon: tip.icon,
      color: tip.color,
      order_position: tip.order_position,
      is_active: tip.is_active
    });
    setShowTipForm(true);
  };

  const resetFaqForm = () => {
    setFaqForm({
      category: 'general',
      question: '',
      answer: '',
      order_position: 0,
      is_published: true
    });
    setEditingFaq(null);
    setShowFaqForm(false);
  };

  const resetTipForm = () => {
    setTipForm({
      tip_type: 'quick_tip',
      title: '',
      content: '',
      icon: 'info',
      color: 'blue',
      order_position: 0,
      is_active: true
    });
    setEditingTip(null);
    setShowTipForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HelpCircle className="w-7 h-7 text-blue-600" />
            Help Center Management
          </h2>
          <p className="text-gray-600 mt-1">Manage FAQs and helpful tips for occupants</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {message && (
        <div className={`flex items-center gap-2 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('faqs')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'faqs'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            FAQs ({faqs.length})
          </button>
          <button
            onClick={() => setActiveTab('tips')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'tips'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            Helpful Tips ({tips.length})
          </button>
        </nav>
      </div>

      {activeTab === 'faqs' && (
        <div className="space-y-4">
          <button
            onClick={() => setShowFaqForm(!showFaqForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add New FAQ
          </button>

          {showFaqForm && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingFaq ? 'Edit FAQ' : 'New FAQ'}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={faqForm.category}
                    onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order Position</label>
                  <input
                    type="number"
                    value={faqForm.order_position}
                    onChange={(e) => setFaqForm({ ...faqForm, order_position: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                <input
                  type="text"
                  value={faqForm.question}
                  onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="How do I...?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Answer</label>
                <textarea
                  value={faqForm.answer}
                  onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={4}
                  placeholder="The answer is..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={faqForm.is_published}
                  onChange={(e) => setFaqForm({ ...faqForm, is_published: e.target.checked })}
                  className="h-4 w-4 text-blue-600"
                />
                <label htmlFor="is_published" className="text-sm font-medium text-gray-700">
                  Published (visible to occupants)
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={saveFaq}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Save className="w-4 h-4" />
                  Save FAQ
                </button>
                <button
                  onClick={resetFaqForm}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {faqs.map((faq) => (
                <div key={faq.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                          {faq.category}
                        </span>
                        {!faq.is_published && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">
                            Draft
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">{faq.question}</h4>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{faq.answer}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {faq.view_count} views
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" />
                          {faq.helpful_count} helpful
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => editFaq(faq)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteFaq(faq)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'tips' && (
        <div className="space-y-4">
          <button
            onClick={() => setShowTipForm(!showTipForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add New Tip
          </button>

          {showTipForm && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingTip ? 'Edit Tip' : 'New Tip'}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tip Type</label>
                  <select
                    value={tipForm.tip_type}
                    onChange={(e) => setTipForm({ ...tipForm, tip_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {tipTypes.map(type => (
                      <option key={type} value={type}>
                        {type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order Position</label>
                  <input
                    type="number"
                    value={tipForm.order_position}
                    onChange={(e) => setTipForm({ ...tipForm, order_position: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                  <select
                    value={tipForm.icon}
                    onChange={(e) => setTipForm({ ...tipForm, icon: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {tipIcons.map(icon => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <select
                    value={tipForm.color}
                    onChange={(e) => setTipForm({ ...tipForm, color: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {tipColors.map(color => (
                      <option key={color} value={color}>
                        {color.charAt(0).toUpperCase() + color.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={tipForm.title}
                  onChange={(e) => setTipForm({ ...tipForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Quick Tip Title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  value={tipForm.content}
                  onChange={(e) => setTipForm({ ...tipForm, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Tip content..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={tipForm.is_active}
                  onChange={(e) => setTipForm({ ...tipForm, is_active: e.target.checked })}
                  className="h-4 w-4 text-blue-600"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Active (visible to occupants)
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={saveTip}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Save className="w-4 h-4" />
                  Save Tip
                </button>
                <button
                  onClick={resetTipForm}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tips.map((tip) => (
                <div key={tip.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                          {tip.tip_type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </span>
                        {!tip.is_active && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">{tip.title}</h4>
                      <p className="text-sm text-gray-600 line-clamp-2">{tip.content}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => editTip(tip)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteTip(tip)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
