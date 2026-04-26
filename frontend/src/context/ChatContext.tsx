'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from './AuthContext'; // Assuming AuthContext exists
import axios from 'axios';

type SenderType = 'PATIENT' | 'DOCTOR' | 'AI';

export interface ConsultationMessage {
  id: number;
  appointmentId: number;
  senderId: number | null;
  senderType: SenderType;
  content: string; // JSON string for AI
  status: string;
  timestamp: string;
  sequenceNumber: number;
}

export type AiStatus = 'IDLE' | 'PROCESSING' | 'COMPLETED' | 'FAILED:TIMEOUT' | 'FAILED:RATE_LIMIT' | 'FAILED:INTERNAL_ERROR';

interface ChatContextProps {
  messages: ConsultationMessage[];
  aiStatus: AiStatus;
  connectToAppointment: (appointmentId: number) => void;
  disconnect: () => void;
  sendMessage: (appointmentId: number, content: string, aiMode: 'AUTO' | 'MANUAL' | 'DISABLED') => void;
  fetchHistory: (appointmentId: number) => Promise<void>;
  isConnected: boolean;
}

const ChatContext = createContext<ChatContextProps | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<ConsultationMessage[]>([]);
  const [aiStatus, setAiStatus] = useState<AiStatus>('IDLE');
  const [stompClient, setStompClient] = useState<Client | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth(); // Provides JWT token

  const fetchHistory = async (appointmentId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/consultation/${appointmentId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const history = response.data.content;
      setMessages(history.sort((a: ConsultationMessage, b: ConsultationMessage) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime() || 
        a.sequenceNumber - b.sequenceNumber || 
        a.id - b.id
      ));
    } catch (error) {
      console.error('Failed to fetch chat history', error);
    }
  };

  const connectToAppointment = (appointmentId: number) => {
    if (stompClient?.active) return;

    const token = localStorage.getItem('token');
    const socket = new SockJS('http://localhost:8080/ws-chat');
    const client = new Client({
      webSocketFactory: () => socket,
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      debug: (str) => console.log(str),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = () => {
      setIsConnected(true);
      
      // If reconnecting while PROCESSING, fetch latest DB state
      if (aiStatus === 'PROCESSING') {
          fetchHistory(appointmentId);
      }

      client.subscribe(`/topic/appointment/${appointmentId}`, (msg: IMessage) => {
        const newMsg: ConsultationMessage = JSON.parse(msg.body);
        setMessages((prev) => {
            const next = [...prev, newMsg];
            return next.sort((a, b) => 
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime() || 
                a.sequenceNumber - b.sequenceNumber || 
                a.id - b.id
            );
        });
      });

      // Role specific queues
      if (user?.roles?.includes('ROLE_PATIENT')) {
        client.subscribe(`/user/queue/ai-responses`, (msg: IMessage) => {
            const newMsg: ConsultationMessage = JSON.parse(msg.body);
            setMessages((prev) => {
                const next = [...prev, newMsg];
                return next.sort((a, b) => 
                    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime() || 
                    a.sequenceNumber - b.sequenceNumber || 
                    a.id - b.id
                );
            });
        });

        client.subscribe(`/user/queue/ai-status`, (msg: IMessage) => {
            setAiStatus(msg.body as AiStatus);
            if (msg.body === 'COMPLETED' || msg.body.startsWith('FAILED')) {
                setTimeout(() => setAiStatus('IDLE'), 3000);
            }
        });
      }
    };

    client.onStompError = (frame) => {
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
    };

    client.activate();
    setStompClient(client);
  };

  const disconnect = () => {
    if (stompClient) {
      stompClient.deactivate();
      setIsConnected(false);
      setStompClient(null);
    }
  };

  const sendMessage = (appointmentId: number, content: string, aiMode: 'AUTO' | 'MANUAL' | 'DISABLED') => {
    if (stompClient && stompClient.connected) {
      stompClient.publish({
        destination: `/app/chat/${appointmentId}`,
        body: JSON.stringify({ content, aiMode })
      });
    }
  };

  return (
    <ChatContext.Provider value={{ messages, aiStatus, connectToAppointment, disconnect, sendMessage, fetchHistory, isConnected }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
