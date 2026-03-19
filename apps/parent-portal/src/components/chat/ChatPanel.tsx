/**
 * ChatPanel Component
 * Educational Note: Main orchestrator for the chat interface.
 * Composes smaller components (ChatHeader, ChatMessages, ChatInput, etc.)
 * and manages chat state and API interactions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Sparkle } from '@phosphor-icons/react';
import { Skeleton } from '../ui/skeleton';
import { chatsAPI } from '@/lib/api/chats';
import type { Chat, ChatMetadata, StudioSignal } from '@/lib/api/chats';
import { sourcesAPI, type Source } from '@/lib/api/sources';
import { useToast, ToastContainer } from '../ui/toast';
import { useVoiceRecording } from '../hooks/useVoiceRecording';
import { ChatHeader } from './ChatHeader';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { ChatList } from './ChatList';
import { ChatEmptyState } from './ChatEmptyState';
import { exportChatAsMarkdown } from '@/lib/exportChatMarkdown';
import { createLogger } from '@/lib/logger';

const log = createLogger('chat-panel');

interface ChatPanelProps {
  projectId: string;
  projectName: string;
  sourcesVersion?: number;
  onCostsChange?: () => void; // Called after message sent to trigger cost refresh
  onSignalsChange?: (signals: StudioSignal[]) => void; // Called when studio signals change
  selectedSourceIds: string[]; // Per-chat source selection from parent
  onActiveChatChange: (chatId: string | null, selectedSourceIds: string[]) => void; // Notify parent of chat change
  isParentWorkspace?: boolean;
  canUseStudyChat?: boolean;
  linkedStudentId?: string | null;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getRequestErrorMessage = (err: unknown, fallback: string): string => {
  if (axios.isAxiosError(err)) {
    const apiError = err.response?.data;
    if (apiError && typeof apiError === 'object' && 'error' in apiError) {
      const message = apiError.error;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }
    if (typeof err.message === 'string' && err.message.trim()) {
      return err.message;
    }
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  return fallback;
};

export const ChatPanel: React.FC<ChatPanelProps> = ({
  projectId,
  projectName,
  sourcesVersion,
  onCostsChange,
  onSignalsChange,
  selectedSourceIds,
  onActiveChatChange,
  isParentWorkspace = false,
  canUseStudyChat = true,
  linkedStudentId = null,
}) => {
  const { toasts, dismissToast, success, error } = useToast();

  // Chat state
  const [message, setMessage] = useState('');
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [showChatList, setShowChatList] = useState(false);
  const [allChats, setAllChats] = useState<ChatMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [exportingChat, setExportingChat] = useState(false);

  // Sources state for header display
  const [sources, setSources] = useState<Source[]>([]);

  // Active sources count derived from per-chat selection
  const activeSources = selectedSourceIds.length;

  // Voice recording hook
  const {
    isRecording,
    partialTranscript,
    transcriptionConfigured,
    startRecording,
    stopRecording,
  } = useVoiceRecording({
    disabled: isParentWorkspace,
    onError: error,
    onTranscriptCommit: useCallback((text: string) => {
      // Append committed text to message
      setMessage((prev) => {
        if (prev && !prev.endsWith(' ')) {
          return prev + ' ' + text;
        }
        return prev + text;
      });
    }, []),
  });

  /**
   * Load sources for the project (for header display)
   */
  const loadSources = async () => {
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const data = await sourcesAPI.listSources(projectId);
        setSources(data);
        return;
      } catch (err) {
        lastError = err;
        if (attempt === 0) {
          await delay(800);
        }
      }
    }

    log.error({ err: lastError }, 'failed to load sources');
  };

  /**
   * Load full chat data including all messages
   */
  const loadFullChat = async (chatId: string) => {
    try {
      const chat = await chatsAPI.getChat(projectId, chatId);
      setActiveChat(chat);
      // Notify parent of per-chat source selection
      onActiveChatChange(chat.id, chat.selected_source_ids ?? []);
    } catch (err) {
      log.error({ err }, 'failed to load chat');
      error('Failed to load chat');
    }
  };

  /**
   * Load all chats for the project
   */
  const loadChats = async () => {
    let lastError: unknown = null;

    try {
      setLoading(true);
      let chats: ChatMetadata[] = [];

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          chats = await chatsAPI.listChats(projectId);
          break;
        } catch (err) {
          lastError = err;
          if (attempt === 0) {
            await delay(800);
          } else {
            throw err;
          }
        }
      }

      setAllChats(chats);

      // If we have chats and no active chat, load the first one
      if (chats.length > 0 && !activeChat) {
        await loadFullChat(chats[0].id);
      }
    } catch (err) {
      log.error({ err }, 'failed to load chats');
      error(getRequestErrorMessage(lastError ?? err, 'Failed to load chats'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load all chats and sources when component mounts or projectId changes
   */
  useEffect(() => {
    if (!canUseStudyChat) {
      onSignalsChange?.([]);
      setLoading(false);
      setAllChats([]);
      setActiveChat(null);
      onActiveChatChange(null, []);
      return;
    }
    loadChats();
    loadSources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseStudyChat, onActiveChatChange, onSignalsChange, projectId]);

  /**
   * Refetch sources when sourcesVersion changes
   * Educational Note: This triggers when SourcesPanel notifies us that sources
   * have changed (toggle active, delete, processing complete, etc.)
   */
  useEffect(() => {
    if (!canUseStudyChat) {
      return;
    }
    if (sourcesVersion !== undefined && sourcesVersion > 0) {
      loadSources();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourcesVersion]);

  /**
   * Notify parent when studio signals change
   * Educational Note: Signals are stored in the chat and loaded/updated
   * when chat is loaded or after messages are sent.
   */
  useEffect(() => {
    if (activeChat) {
      onSignalsChange?.(activeChat.studio_signals || []);
    } else {
      onSignalsChange?.([]);
    }
  }, [activeChat, onSignalsChange]);

  /**
   * Send a message and get AI response
   * Educational Note: We add the user message optimistically to the UI
   * before the API call, so users see their message immediately.
   */
  const handleSend = async () => {
    if (!message.trim() || !activeChat || sending) return;

    const userMessage = message.trim();
    setMessage('');
    setSending(true);

    // Optimistically add user message to UI immediately
    const tempUserMessage = {
      id: `temp-${Date.now()}`,
      role: 'user' as const,
      content: userMessage,
      timestamp: new Date().toISOString(),
    };

    setActiveChat((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        messages: [...prev.messages, tempUserMessage],
      };
    });

    try {
      const result = await chatsAPI.sendMessage(projectId, activeChat.id, userMessage);

      // Replace temp message with real messages from API
      setActiveChat((prev) => {
        if (!prev) return null;
        // Remove the temp message and add real user + assistant messages
        const messagesWithoutTemp = prev.messages.filter((m) => m.id !== tempUserMessage.id);
        return {
          ...prev,
          messages: [...messagesWithoutTemp, result.user_message, result.assistant_message],
          updated_at: new Date().toISOString(),
        };
      });

      // Update the chat metadata in the list
      await loadChats();

      // Trigger cost refresh in header
      onCostsChange?.();

      // Fetch updated chat after delay (background tasks may have updated title/signals)
      // Educational Note: Studio signals are added in background tasks, so we
      // need to refetch the chat to get them. We do this twice - once quickly
      // for signals and once later for auto-generated title.
      const chatId = activeChat.id;

      // Quick fetch for signals (1 second delay)
      setTimeout(async () => {
        try {
          const updatedChat = await chatsAPI.getChat(projectId, chatId);
          setActiveChat(prev => prev && prev.id === chatId
            ? { ...prev, studio_signals: updatedChat.studio_signals || [] }
            : prev
          );
        } catch {
          // Silently ignore - signal update is non-critical
        }
      }, 1000);

      // Delayed fetch for title (4 second delay)
      setTimeout(async () => {
        try {
          const updatedChat = await chatsAPI.getChat(projectId, chatId);
          setActiveChat(prev => prev && prev.id === chatId
            ? { ...prev, title: updatedChat.title, studio_signals: updatedChat.studio_signals || [] }
            : prev
          );
          // Also update in chat list
          setAllChats(prev => prev.map(c =>
            c.id === chatId ? { ...c, title: updatedChat.title } : c
          ));
        } catch {
          // Silently ignore - title update is non-critical
        }
      }, 4000);
    } catch (err) {
      log.error({ err }, 'failed to send message');
      error('Failed to send message');
      // Remove the optimistic message on error
      setActiveChat((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          messages: prev.messages.filter((m) => m.id !== tempUserMessage.id),
        };
      });
    } finally {
      setSending(false);
    }
  };

  /**
   * Create a new chat
   */
  const handleNewChat = async () => {
    try {
      const newChat = await chatsAPI.createChat(projectId, 'New Chat');
      await loadChats();
      await loadFullChat(newChat.id);
      // New chats start with no sources selected (loadFullChat will call onActiveChatChange)
      setShowChatList(false);
      success('New chat created');
    } catch (err) {
      log.error({ err }, 'failed to create chat');
      error('Failed to create chat');
    }
  };

  /**
   * Select a chat from the list
   */
  const handleSelectChat = async (chatId: string) => {
    await loadFullChat(chatId);
    setShowChatList(false);
  };

  /**
   * Delete a chat
   */
  const handleDeleteChat = async (chatId: string) => {
    try {
      await chatsAPI.deleteChat(projectId, chatId);

      // If the deleted chat was active, clear it and reset source selection
      if (activeChat?.id === chatId) {
        setActiveChat(null);
        onActiveChatChange(null, []);
      }

      await loadChats();
      success('Chat deleted');
    } catch (err) {
      log.error({ err }, 'failed to Ldeleting chatE');
      error('Failed to delete chat');
    }
  };

  /**
   * Rename a chat
   */
  const handleRenameChat = async (chatId: string, newTitle: string) => {
    try {
      await chatsAPI.updateChat(projectId, chatId, newTitle);
      await loadChats();

      // Update active chat if it was renamed
      if (activeChat?.id === chatId) {
        setActiveChat(prev => prev ? { ...prev, title: newTitle } : null);
      }

      success('Chat renamed');
    } catch (err) {
      log.error({ err }, 'failed to Lrenaming chatE');
      error('Failed to rename chat');
    }
  };

  /**
   * Toggle recording on/off
   */
  const handleMicClick = () => {
    if (isParentWorkspace) {
      return;
    }
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  /**
   * Export the active chat as a Markdown file
   */
  const handleExportChat = useCallback(async () => {
    if (!activeChat) return;
    setExportingChat(true);
    try {
      await exportChatAsMarkdown({ chat: activeChat, projectId, projectName });
      success('Chat exported as Markdown');
    } catch (err) {
      log.error({ err }, 'failed to Lexporting chatE');
      error('Failed to export chat');
    } finally {
      setExportingChat(false);
    }
  }, [activeChat, projectId, projectName, success, error]);

  if (!canUseStudyChat) {
    return (
      <div className="flex flex-col h-full min-h-0 min-w-0 w-full bg-card overflow-hidden">
        <div className="border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkle size={20} className="text-primary" />
            <h2 className="font-semibold">Chat</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Study chat is not enabled for this child-linked workspace.
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-3">
            <h3 className="text-lg font-semibold">Chat is locked for this workspace</h3>
            <p className="text-sm text-muted-foreground">
              {linkedStudentId
                ? 'MST did not grant study-chat access for this child context, so the frontend keeps chat disabled instead of waiting for backend 403 responses.'
                : 'This workspace is missing the child-linked context needed for study chat.'}
            </p>
          </div>
        </div>
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col h-full bg-card">
        <div className="border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkle size={20} className="text-primary" />
            <h2 className="font-semibold">Chat</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Ask questions about your sources or request analysis
          </p>
        </div>
        <div className="flex-1 p-6 space-y-4">
          {/* Skeleton message bubbles mimicking a chat conversation */}
          <div className="flex justify-end">
            <Skeleton className="h-10 w-2/3 rounded-2xl" />
          </div>
          <div className="flex justify-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-8 w-1/2 rounded-2xl" />
          </div>
          <div className="flex justify-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
        </div>
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  // Empty state - no chats exist
  if (allChats.length === 0 && !activeChat) {
    return (
      <>
        <ChatEmptyState projectName={projectName} onNewChat={handleNewChat} />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  // Chat list view
  if (showChatList) {
    return (
      <>
        <ChatList
          chats={allChats}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
          onRenameChat={handleRenameChat}
          onNewChat={handleNewChat}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  // Active chat view
  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 w-full bg-card overflow-hidden">
      <ChatHeader
        activeChat={activeChat}
        allChats={allChats}
        activeSources={activeSources}
        totalSources={sources.length}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onShowChatList={() => setShowChatList(true)}
        onExportChat={handleExportChat}
        exportingChat={exportingChat}
      />

      <ChatMessages
        messages={activeChat?.messages || []}
        sending={sending}
        projectId={projectId}
      />

      <ChatInput
        message={message}
        partialTranscript={partialTranscript}
        isRecording={isRecording}
        sending={sending}
        transcriptionConfigured={transcriptionConfigured}
        voiceEnabled={!isParentWorkspace}
        onMessageChange={setMessage}
        onSend={handleSend}
        onMicClick={handleMicClick}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
