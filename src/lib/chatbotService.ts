import { supabase } from './supabase';

export type UserRole = 'guest' | 'occupant' | 'admin' | 'super_admin';

export interface ChatMessage {
  id: string;
  message_type: 'user' | 'bot';
  message_text: string;
  response_source?: string;
  confidence_score?: number;
  helpful?: boolean | null;
  created_at: string;
}

export interface ConversationContext {
  conversationId: string | null;
  sessionId: string;
  userRole: UserRole;
  apartmentId?: string | null;
  userId?: string | null;
}

class ChatbotService {
  private readonly TIMEOUT_MS = 10000;

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number = this.TIMEOUT_MS): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
      )
    ]);
  }

  async createConversation(
    userRole: UserRole,
    userId?: string | null,
    apartmentId?: string | null
  ): Promise<string> {
    try {
      const sessionId = this.generateSessionId();

      const { data, error } = await this.withTimeout(
        supabase
          .from('chatbot_conversations')
          .insert({
            user_id: userId,
            user_role: userRole,
            apartment_id: apartmentId,
            session_id: sessionId,
            metadata: {
              user_agent: navigator.userAgent,
              page: window.location.pathname
            }
          })
          .select('id')
          .single()
      );

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      return `offline_${this.generateSessionId()}`;
    }
  }

  async searchKnowledgeBase(
    query: string,
    userRole: UserRole
  ): Promise<Array<{
    id: string;
    category: string;
    question: string;
    answer: string;
    confidence_score: number;
  }>> {
    try {
      const { data, error } = await this.withTimeout(
        supabase.rpc('search_knowledge_base', {
          search_query: query,
          user_role_param: userRole,
          limit_count: 3
        }),
        8000
      );

      if (error) {
        console.error('Knowledge base search error:', error);
        return [];
      }

      const results = (data || []).map(result => ({
        ...result,
        confidence_score: typeof result.confidence_score === 'string'
          ? parseFloat(result.confidence_score)
          : result.confidence_score
      }));

      return results;
    } catch (error) {
      console.error('Knowledge base search timeout or error:', error);
      return [];
    }
  }

  async saveMessage(
    conversationId: string,
    messageType: 'user' | 'bot',
    messageText: string,
    responseSource?: string,
    confidenceScore?: number
  ): Promise<void> {
    if (conversationId.startsWith('offline_')) {
      return;
    }

    try {
      const { error } = await this.withTimeout(
        supabase
          .from('chatbot_messages')
          .insert({
            conversation_id: conversationId,
            message_type: messageType,
            message_text: messageText,
            response_source: responseSource,
            confidence_score: confidenceScore
          }),
        5000
      );

      if (error) {
        console.error('Failed to save message:', error);
      }
    } catch (error) {
      console.error('Message save timeout or error:', error);
    }
  }

  async updateMessageFeedback(
    messageId: string,
    helpful: boolean
  ): Promise<void> {
    const { error } = await supabase
      .from('chatbot_messages')
      .update({ helpful })
      .eq('id', messageId);

    if (error) throw error;
  }

  async getConversationHistory(conversationId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chatbot_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  getGreeting(userRole: UserRole): string {
    const greetings = {
      guest: "Hi there! 👋 I'm here to help you learn about FlatFund Pro. What would you like to know?",
      occupant: "Hello! 👋 I'm your FlatFund Pro assistant. I can help you with payments, account access, and more. How can I assist you today?",
      admin: "Welcome, Admin! 👋 I can help you with occupant management, payment reviews, QR codes, and more. What do you need help with?",
      super_admin: "Welcome, Super Admin! 👋 I'm here to assist with system-wide queries, analytics, and administrative tasks. How can I help?"
    };
    return greetings[userRole];
  }

  getSuggestedQuestions(userRole: UserRole): string[] {
    const suggestions = {
      guest: [
        "What is FlatFund Pro?",
        "How does it work?",
        "Is my data secure?",
        "How do I submit a payment?"
      ],
      occupant: [
        "How do I submit a payment?",
        "How long does verification take?",
        "How do I access my payment history?",
        "What if I forgot my login?"
      ],
      admin: [
        "How do I add new occupants?",
        "How do I review pending payments?",
        "How do I generate QR codes?",
        "How do I track collections?"
      ],
      super_admin: [
        "How do I manage multiple apartments?",
        "How do I view system analytics?",
        "How do I manage admins?",
        "How does fraud detection work?"
      ]
    };
    return suggestions[userRole];
  }

  async processUserMessage(
    conversationId: string,
    userMessage: string,
    userRole: UserRole
  ): Promise<{ botResponse: string; confidence: number; source: string }> {
    await this.saveMessage(conversationId, 'user', userMessage);

    const lowerMessage = userMessage.toLowerCase().trim();

    if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
      const response = "You're welcome! Is there anything else I can help you with?";
      await this.saveMessage(conversationId, 'bot', response, 'fallback', 1.0);
      return { botResponse: response, confidence: 1.0, source: 'fallback' };
    }

    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      const response = this.getGreeting(userRole) + "\n\nHere are some things I can help you with:\n• " +
                      this.getSuggestedQuestions(userRole).slice(0, 3).join('\n• ');
      await this.saveMessage(conversationId, 'bot', response, 'greeting', 1.0);
      return { botResponse: response, confidence: 1.0, source: 'greeting' };
    }

    const results = await this.searchKnowledgeBase(userMessage, userRole);

    console.log('Search results for:', userMessage, 'Role:', userRole, 'Results:', results);

    if (results.length > 0) {
      const topResult = results[0];
      const confidence = Number(topResult.confidence_score);

      console.log('Top result confidence:', confidence, 'Type:', typeof confidence);

      if (confidence >= 0.6) {
        let response = topResult.answer;

        if (results.length > 1 && Number(results[1].confidence_score) >= 0.6) {
          response += "\n\nRelated: " + results[1].question;
        }

        await this.saveMessage(
          conversationId,
          'bot',
          response,
          'knowledge_base',
          confidence
        );

        return {
          botResponse: response,
          confidence: confidence,
          source: 'knowledge_base'
        };
      }
    }

    const fallbackResponse = this.getFallbackResponse(userRole);
    await this.saveMessage(conversationId, 'bot', fallbackResponse, 'fallback', 0.3);

    return { botResponse: fallbackResponse, confidence: 0.3, source: 'fallback' };
  }

  private getFallbackResponse(userRole: UserRole): string {
    const suggestions = this.getSuggestedQuestions(userRole).slice(0, 3);

    return `I'm not sure I understand that question. Here are some things I can help you with:\n\n• ${suggestions.join('\n• ')}\n\nOr try asking in a different way!`;
  }
}

export const chatbotService = new ChatbotService();
