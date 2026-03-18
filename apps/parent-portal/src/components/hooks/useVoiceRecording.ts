/**
 * useVoiceRecording Hook
 *
 * Extracts the real-time transcription flow from ChatPanel.
 * Parent runtime disables this hook at the call site so it short-circuits
 * before any transcription config or WebSocket work begins.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { chatsAPI } from '../../lib/api/chats';
import { createLogger } from '@/lib/logger';

const log = createLogger('voice-recording');

interface UseVoiceRecordingProps {
  onError: (message: string) => void;
  onTranscriptCommit: (text: string) => void;
  disabled?: boolean;
}

interface UseVoiceRecordingReturn {
  isRecording: boolean;
  partialTranscript: string;
  transcriptionConfigured: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

export const useVoiceRecording = ({
  onError,
  onTranscriptCommit,
  disabled = false,
}: UseVoiceRecordingProps): UseVoiceRecordingReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [transcriptionConfiguredState, setTranscriptionConfiguredState] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const commitProcessedRef = useRef(false);
  const partialTranscriptRef = useRef('');

  const syncPartialTranscript = useCallback((value: string) => {
    partialTranscriptRef.current = value;
    setPartialTranscript(value);
  }, []);

  useEffect(() => {
    if (disabled) {
      return;
    }

    const checkStatus = async () => {
      try {
        const configured = await chatsAPI.isTranscriptionConfigured();
        setTranscriptionConfiguredState(configured);
      } catch (err) {
        log.error({ err }, 'failed to check transcription status');
        setTranscriptionConfiguredState(false);
      }
    };

    void checkStatus();
  }, [disabled]);

  const stopRecording = useCallback(() => {
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (websocketRef.current) {
      if (websocketRef.current.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({
          message_type: 'input_audio_chunk',
          audio_base_64: '',
          commit: true,
          sample_rate: 16000,
        }));

        const currentPartial = partialTranscriptRef.current;
        window.setTimeout(() => {
          if (currentPartial && !commitProcessedRef.current) {
            log.debug('commit not processed, using partial fallback');
            onTranscriptCommit(currentPartial);
            syncPartialTranscript('');
          }

          if (websocketRef.current) {
            websocketRef.current.close();
            websocketRef.current = null;
          }
        }, 500);
      } else {
        websocketRef.current.close();
        websocketRef.current = null;
      }
    }

    if (partialTranscriptRef.current && !websocketRef.current && !commitProcessedRef.current) {
      onTranscriptCommit(partialTranscriptRef.current);
      syncPartialTranscript('');
    }

    setIsRecording(false);
    log.debug('recording stopped');
  }, [onTranscriptCommit, syncPartialTranscript]);

  const startAudioCapture = useCallback(async (sampleRate: number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate });
      audioContextRef.current = audioContext;

      const workletCode = `
        class PCMProcessor extends AudioWorkletProcessor {
          constructor() {
            super();
            this.buffer = [];
            this.bufferSize = 4096;
          }

          process(inputs) {
            const input = inputs[0];
            if (input && input[0]) {
              const float32 = input[0];
              for (let i = 0; i < float32.length; i++) {
                const s = Math.max(-1, Math.min(1, float32[i]));
                const int16 = s < 0 ? s * 0x8000 : s * 0x7FFF;
                this.buffer.push(int16);
              }

              if (this.buffer.length >= this.bufferSize) {
                const int16Array = new Int16Array(this.buffer);
                this.port.postMessage(int16Array.buffer, [int16Array.buffer]);
                this.buffer = [];
              }
            }
            return true;
          }
        }
        registerProcessor('pcm-processor', PCMProcessor);
      `;

      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);

      await audioContext.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);

      const source = audioContext.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');
      workletNodeRef.current = workletNode;

      workletNode.port.onmessage = (event) => {
        const ws = websocketRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
          const bytes = new Uint8Array(event.data);
          let binary = '';
          for (let index = 0; index < bytes.length; index += 1) {
            binary += String.fromCharCode(bytes[index]);
          }
          const audioBase64 = btoa(binary);

          ws.send(JSON.stringify({
            message_type: 'input_audio_chunk',
            audio_base_64: audioBase64,
            sample_rate: sampleRate,
          }));
        }
      };

      source.connect(workletNode);
      log.debug('audio capture started');
    } catch (err) {
      log.error({ err }, 'failed to start audio capture');
      onError('Failed to access microphone. Please check permissions.');
      stopRecording();
    }
  }, [onError, stopRecording]);

  const startRecording = useCallback(async () => {
    if (disabled) {
      return;
    }

    try {
      commitProcessedRef.current = false;
      log.debug('fetching transcription config');
      const config = await chatsAPI.getTranscriptionConfig();
      log.debug('connecting to WebSocket');

      const ws = new WebSocket(config.websocket_url);
      websocketRef.current = ws;

      ws.onopen = () => {
        log.debug('WebSocket connected, waiting for session_started');
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data) as { message_type?: string; type?: string; text?: string; error?: string; message?: string };
          const messageType = data.message_type || data.type;
          log.debug(`WS message: ${messageType || 'unknown'}`);

          if (messageType === 'session_started') {
            await startAudioCapture(config.sample_rate);
            return;
          }

          if (messageType === 'partial_transcript' && data.text) {
            syncPartialTranscript(data.text);
            return;
          }

          if (messageType === 'committed_transcript' && data.text) {
            commitProcessedRef.current = true;
            onTranscriptCommit(data.text);
            syncPartialTranscript('');
            return;
          }

          if (messageType === 'auth_error') {
            log.error({ error: data.error }, 'transcription auth error');
            onError(`Authentication error: ${data.error || 'Invalid token'}`);
            stopRecording();
            return;
          }

          if (messageType === 'error' || messageType === 'input_error') {
            log.error({ data }, 'transcription error');
            onError(`Transcription error: ${data.error || data.message || 'Unknown error'}`);
          }
        } catch (err) {
          log.error({ err }, 'failed to parse WebSocket message');
        }
      };

      ws.onerror = () => {
        log.error('WebSocket connection error');
        onError('Connection error. Please try again.');
        stopRecording();
      };

      ws.onclose = () => {
        log.debug('WebSocket closed');
      };

      setIsRecording(true);
    } catch (err) {
      log.error({ err }, 'failed to start recording');
      onError('Failed to start transcription.');
    }
  }, [disabled, onError, onTranscriptCommit, startAudioCapture, stopRecording, syncPartialTranscript]);

  useEffect(() => {
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
      if (workletNodeRef.current) {
        workletNodeRef.current.disconnect();
      }
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    isRecording,
    partialTranscript,
    transcriptionConfigured: !disabled && transcriptionConfiguredState,
    startRecording,
    stopRecording,
  };
};
