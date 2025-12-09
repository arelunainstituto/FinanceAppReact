import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import AIAnalystService, { ChatMessage } from '../services/aiAnalystService';
import RequestQueueService, { QueuedRequest } from '../services/requestQueueService';

const AIAnalystScreen: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<Map<string, QueuedRequest>>(new Map());
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);
  const isFeatureEnabled = true;
  const unsubscribeRefs = useRef<Array<() => void>>([]);

  // Chave para salvar o histórico no AsyncStorage
  const CHAT_HISTORY_KEY = `chat_history_${user?.id || 'default'}`;

  // Inicializar fila de requisições
  useEffect(() => {
    RequestQueueService.initialize();
    loadChatHistory();
    monitorPendingRequests();

    return () => {
      // Limpar subscriptions ao desmontar
      unsubscribeRefs.current.forEach(unsub => unsub());
    };
  }, [user?.id]);

  // Salvar histórico sempre que as mensagens mudarem
  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory();
    }
  }, [messages]);

  const monitorPendingRequests = () => {
    // Verificar requisições pendentes ao montar
    const pending = RequestQueueService.getQueuedRequests('completed');
    pending.forEach(request => {
      if (request.type === 'ai-chat' && request.response) {
        handleRequestCompleted(request);
      }
    });
  };

  const loadChatHistory = async () => {
    try {
      const savedHistory = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        // Converter timestamps de string para Date
        const historyWithDates = parsedHistory.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(historyWithDates);
        console.log('💾 Histórico do chat carregado:', historyWithDates.length, 'mensagens');
      } else {
        // Se não há histórico salvo, adicionar mensagem de boas-vindas
        addWelcomeMessage();
      }
    } catch (error) {
      console.error('❌ Erro ao carregar histórico do chat:', error);
      addWelcomeMessage();
    }
  };

  const saveChatHistory = async () => {
    try {
      await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
      console.log('💾 Histórico do chat salvo:', messages.length, 'mensagens');
    } catch (error) {
      console.error('❌ Erro ao salvar histórico do chat:', error);
    }
  };

  const addWelcomeMessage = () => {
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `Olá ${user?.name || 'Usuário'}! 👋\n\nSou seu assistente de análise financeira. Posso ajudar você com:\n\n• Análise de dados financeiros\n• Relatórios e insights\n• Consultas sobre clientes e contratos\n• Tendências de pagamentos\n\nComo posso ajudá-lo hoje?`,
        timestamp: new Date()
      }]);
    }
  };

  const clearChatHistory = async () => {
    try {
      await AsyncStorage.removeItem(CHAT_HISTORY_KEY);
      setMessages([]);
      addWelcomeMessage();
      console.log('🗑️ Histórico do chat limpo');
    } catch (error) {
      console.error('❌ Erro ao limpar histórico do chat:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleRequestCompleted = (request: QueuedRequest) => {
    if (request.status === 'completed' && request.response) {
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: request.response.response || 'Resposta recebida',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setPendingRequests(prev => {
        const updated = new Map(prev);
        updated.delete(request.id);
        return updated;
      });
      scrollToBottom();
      console.log('✅ Resposta do AI Analyst recebida:', request.id);
    } else if (request.status === 'failed') {
      setPendingRequests(prev => {
        const updated = new Map(prev);
        updated.delete(request.id);
        return updated;
      });
      Alert.alert(
        'Erro',
        request.error || 'Não foi possível processar a mensagem. Tente novamente.'
      );
      console.error('❌ Falha ao processar mensagem:', request.id, request.error);
    }
  };

  const handleSendMessage = async () => {
    if (isFeatureEnabled === false) {
      Alert.alert('Em desenvolvimento', 'Esta funcionalidade ainda está em fase de implementação.');
      return;
    }

    if (!inputText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(false); // Não bloquear UI enquanto aguarda resposta
    textInputRef.current?.blur();

    // Adicionar à fila de requisições
    const requestId = RequestQueueService.addRequest({
      type: 'ai-chat',
      payload: {
        message: userMessage.content,
        user: user!,
        history: updatedMessages
      }
    });

    // Adicionar aos requisições pendentes no estado
    const request = RequestQueueService.getRequest(requestId);
    if (request) {
      setPendingRequests(prev => new Map(prev).set(requestId, request));

      // Inscrever para atualizações da requisição
      const unsubscribe = RequestQueueService.onRequestUpdate(requestId, (updatedRequest) => {
        setPendingRequests(prev => new Map(prev).set(requestId, updatedRequest));
        if (updatedRequest.status === 'completed' || updatedRequest.status === 'failed') {
          handleRequestCompleted(updatedRequest);
        }
      });

      unsubscribeRefs.current.push(unsubscribe);
    }

    // Processar requisição em background (passando apenas as últimas 5 mensagens)
    processQueuedRequest(requestId, userMessage.content, user!, updatedMessages.slice(-5));
  };

  const processQueuedRequest = async (
    requestId: string,
    message: string,
    user: any,
    history: ChatMessage[]
  ) => {
    try {
      RequestQueueService.updateRequest(requestId, { status: 'processing' });

      const response = await AIAnalystService.sendMessage(message, user, history);

      RequestQueueService.updateRequest(requestId, {
        status: 'completed',
        response: response
      });
    } catch (error) {
      console.error('Erro ao processar requisição:', error);
      RequestQueueService.updateRequest(requestId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  };

  const handleKeyPress = (event: any) => {
    if (event.nativeEvent.key === 'Enter' && !event.nativeEvent.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessage = (message: ChatMessage, index: number) => {
    const isUser = message.role === 'user';
    
    return (
      <View
        key={index}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.assistantMessageContainer
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userMessageBubble : styles.assistantMessageBubble
          ]}
        >
          {isUser ? (
            <Text
              style={[
                styles.messageText,
                styles.userMessageText
              ]}
            >
              {message.content}
            </Text>
          ) : (
            <Markdown
              style={{
                body: {
                  fontSize: 15,
                  lineHeight: 24,
                  color: '#1F2937',
                  marginBottom: 0,
                },
                heading1: {
                  fontSize: 22,
                  fontWeight: '700',
                  color: '#111827',
                  marginTop: 16,
                  marginBottom: 12,
                  borderBottomWidth: 2,
                  borderBottomColor: '#E5E7EB',
                  paddingBottom: 8,
                },
                heading2: {
                  fontSize: 19,
                  fontWeight: '700',
                  color: '#1F2937',
                  marginTop: 14,
                  marginBottom: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F3F4F6',
                  paddingBottom: 6,
                },
                heading3: {
                  fontSize: 17,
                  fontWeight: '600',
                  color: '#374151',
                  marginTop: 12,
                  marginBottom: 8,
                },
                heading4: {
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#4B5563',
                  marginTop: 10,
                  marginBottom: 6,
                },
                paragraph: {
                  marginTop: 0,
                  marginBottom: 12,
                  lineHeight: 24,
                },
                strong: {
                  fontWeight: '700',
                  color: '#111827',
                },
                em: {
                  fontStyle: 'italic',
                  color: '#374151',
                },
                code_inline: {
                  backgroundColor: '#F9FAFB',
                  color: '#DC2626',
                  paddingHorizontal: 6,
                  paddingVertical: 3,
                  borderRadius: 4,
                  fontSize: 14,
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                },
                code_block: {
                  backgroundColor: '#1F2937',
                  color: '#F9FAFB',
                  padding: 16,
                  borderRadius: 8,
                  fontSize: 13,
                  marginVertical: 12,
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                  lineHeight: 20,
                },
                fence: {
                  backgroundColor: '#1F2937',
                  color: '#F9FAFB',
                  padding: 16,
                  borderRadius: 8,
                  fontSize: 13,
                  marginVertical: 12,
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                  lineHeight: 20,
                },
                bullet_list: {
                  marginVertical: 8,
                  marginLeft: 8,
                },
                ordered_list: {
                  marginVertical: 8,
                  marginLeft: 8,
                },
                list_item: {
                  marginVertical: 4,
                  lineHeight: 24,
                  flexDirection: 'row',
                },
                bullet_list_icon: {
                  color: '#007AFF',
                  fontSize: 18,
                  marginRight: 8,
                },
                ordered_list_icon: {
                  color: '#007AFF',
                  fontSize: 15,
                  fontWeight: '600',
                  marginRight: 8,
                },
                blockquote: {
                  backgroundColor: '#EFF6FF',
                  borderLeftWidth: 4,
                  borderLeftColor: '#3B82F6',
                  paddingLeft: 16,
                  paddingRight: 16,
                  paddingVertical: 12,
                  marginVertical: 12,
                  borderRadius: 4,
                },
                table: {
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  borderRadius: 8,
                  marginVertical: 12,
                  overflow: 'hidden',
                },
                thead: {
                  backgroundColor: '#F9FAFB',
                },
                tbody: {
                  backgroundColor: '#FFFFFF',
                },
                th: {
                  flex: 1,
                  padding: 12,
                  fontWeight: '700',
                  fontSize: 14,
                  color: '#111827',
                  borderRightWidth: 1,
                  borderRightColor: '#E5E7EB',
                  borderBottomWidth: 2,
                  borderBottomColor: '#D1D5DB',
                },
                tr: {
                  flexDirection: 'row',
                  borderBottomWidth: 1,
                  borderBottomColor: '#E5E7EB',
                },
                td: {
                  flex: 1,
                  padding: 12,
                  fontSize: 14,
                  color: '#374151',
                  borderRightWidth: 1,
                  borderRightColor: '#E5E7EB',
                },
                hr: {
                  backgroundColor: '#E5E7EB',
                  height: 1,
                  marginVertical: 16,
                },
                link: {
                  color: '#007AFF',
                  textDecorationLine: 'underline',
                },
                text: {
                  color: '#1F2937',
                },
              }}
            >
              {message.content}
            </Markdown>
          )}
          <Text
            style={[
              styles.messageTime,
              isUser ? styles.userMessageTime : styles.assistantMessageTime
            ]}
          >
            {message.timestamp.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <MainLayout activeRoute="AIAnalyst">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerIcon}>
              <Ionicons name="chatbubbles" size={24} color="#007AFF" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>AI Analyst</Text>
              <Text style={styles.headerSubtitle}>Seu assistente de análise financeira</Text>
            </View>
            <TouchableOpacity
              style={[styles.clearButton, !isFeatureEnabled && styles.clearButtonDisabled]}
              onPress={clearChatHistory}
              disabled={!isFeatureEnabled}
            >
              <Ionicons name="trash-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
        >
          {messages.map((message, index) => renderMessage(message, index))}

          {(isLoading || pendingRequests.size > 0) && (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingBubble}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingText}>Analisando...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <View style={[
            styles.inputWrapper,
            isInputFocused && styles.inputWrapperFocused
          ]}>
            <TextInput
              ref={textInputRef}
              style={[
                styles.textInput,
                isInputFocused && styles.textInputFocused
              ]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Digite sua pergunta..."
              placeholderTextColor="#8E8E93"
              multiline
              maxLength={1000}
              editable={isFeatureEnabled}
              autoFocus={false}
              onKeyPress={handleKeyPress}
              returnKeyType="default"
              blurOnSubmit={false}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              selectionColor="#007AFF"
              cursorColor="#007AFF"
              underlineColorAndroid="transparent"
              autoCorrect={false}
              autoCapitalize="sentences"
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || pendingRequests.size > 0) && styles.sendButtonDisabled
              ]}
              onPress={handleSendMessage}
              disabled={!isFeatureEnabled || !inputText.trim() || pendingRequests.size > 0}
            >
              {pendingRequests.size > 0 ? (
                <ActivityIndicator size="small" color="#8E8E93" />
              ) : (
                <Ionicons
                  name="send"
                  size={20}
                  color={(!isFeatureEnabled || !inputText.trim()) ? '#8E8E93' : '#FFFFFF'}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  clearButtonDisabled: {
    opacity: 0.4,
  },
  devInfoContainer: {
    marginTop: 24,
    marginHorizontal: 8,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
  },
  devInfoIcon: {
    marginBottom: 12,
  },
  devInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D4ED8',
    marginBottom: 8,
  },
  devInfoDescription: {
    fontSize: 14,
    color: '#1E3A8A',
    textAlign: 'center',
    lineHeight: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  assistantMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userMessageBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  assistantMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  assistantMessageText: {
    color: '#111827',
  },
  messageTime: {
    fontSize: 12,
    opacity: 0.7,
  },
  userMessageTime: {
    color: '#FFFFFF',
  },
  assistantMessageTime: {
    color: '#6B7280',
  },
  loadingContainer: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  loadingBubble: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    maxHeight: 100,
    paddingVertical: 8,
    textAlignVertical: 'center',
    borderWidth: 0,
    backgroundColor: 'transparent',
    // Remove any default focus styles
    borderColor: 'transparent',
    borderBottomWidth: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    // Garantir que o cursor pisque
    includeFontPadding: false,
    // Web-specific styles to remove blue border
    ...Platform.select({
      web: {
        outline: 'none',
        border: 'none',
        boxShadow: 'none',
        WebkitBoxShadow: 'none',
        MozBoxShadow: 'none',
        WebkitAppearance: 'none',
        MozAppearance: 'none',
        borderWidth: 0,
        borderStyle: 'none',
        borderColor: 'transparent',
      },
    }),
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  inputWrapperFocused: {
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  textInputFocused: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    // Ensure no blue border on focus
    borderColor: 'transparent',
    borderBottomWidth: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    // Garantir que o cursor pisque quando focado
    includeFontPadding: false,
    textAlignVertical: 'center',
    // Web-specific styles to remove blue border on focus
    ...Platform.select({
      web: {
        outline: 'none',
        border: 'none',
        boxShadow: 'none',
        WebkitBoxShadow: 'none',
        MozBoxShadow: 'none',
        WebkitAppearance: 'none',
        MozAppearance: 'none',
      },
    }),
  },
});

export default AIAnalystScreen;
