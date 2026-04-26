'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useChat, ConsultationMessage } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';

interface ChatWindowProps {
  appointmentId: number;
}

export default function ChatWindow({ appointmentId }: ChatWindowProps) {
  const { messages, aiStatus, connectToAppointment, disconnect, sendMessage, fetchHistory, isConnected } = useChat();
  const { user } = useAuth();
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchHistory(appointmentId);
    connectToAppointment(appointmentId);

    return () => {
      disconnect();
    };
  }, [appointmentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiStatus]);

  const handleSend = (aiMode: 'AUTO' | 'MANUAL' | 'DISABLED' = 'DISABLED') => {
    if (inputMessage.trim()) {
      sendMessage(appointmentId, inputMessage, aiMode);
      setInputMessage('');
    }
  };

  const getAiStatusMessage = () => {
    if (aiStatus === 'PROCESSING') return 'AI is analyzing symptoms...';
    if (aiStatus === 'FAILED:TIMEOUT') return 'AI took too long. Try again.';
    if (aiStatus === 'FAILED:RATE_LIMIT') return 'Too many requests. Please wait a moment.';
    if (aiStatus === 'FAILED:INTERNAL_ERROR') return 'AI unavailable, try again later.';
    return null;
  };

  return (
    <div className="flex flex-col h-full max-h-[600px] border rounded-xl shadow-lg bg-white overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 p-4 text-white flex justify-between items-center shadow-md">
        <h2 className="font-semibold text-lg">Consultation Chat</h2>
        <span className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} title={isConnected ? "Connected" : "Disconnected"}></span>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg, idx) => {
          const isMe = msg.senderType === (user?.roles?.includes('ROLE_DOCTOR') ? 'DOCTOR' : 'PATIENT');
          const isAi = msg.senderType === 'AI';

          if (isAi) {
            let aiContent = msg.content;
            let confidence = 'LOW';
            try {
              const parsed = JSON.parse(msg.content);
              aiContent = parsed.response;
              confidence = parsed.confidence;
            } catch (e) {
               // raw text fallback
            }

            return (
              <div key={idx} className="flex justify-start w-full">
                <div className="max-w-[80%] bg-purple-100 p-3 rounded-2xl rounded-tl-sm border border-purple-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-purple-700">Groq AI Assistant</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full text-white ${
                      confidence === 'HIGH' ? 'bg-green-500' : confidence === 'MEDIUM' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}>
                      {confidence} Confidence
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{aiContent}</p>
                  <div className="mt-2 text-[10px] text-purple-600 bg-purple-50 p-1.5 rounded italic">
                    Disclaimer: AI-generated response. Do not use for emergency decisions.
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={idx} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] p-3 shadow-sm ${
                  isMe ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' : 'bg-white text-gray-800 border border-gray-200 rounded-2xl rounded-tl-sm'
                }`}
              >
                {!isMe && (
                  <div className="text-xs font-bold text-gray-500 mb-1">
                    {msg.senderType === 'DOCTOR' ? '👨‍⚕️ Doctor' : '🧑 Patient'}
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          );
        })}

        {/* AI Status Area */}
        {aiStatus !== 'IDLE' && aiStatus !== 'COMPLETED' && (
          <div className="flex justify-start w-full opacity-70">
            <div className={`text-xs p-2 rounded-lg flex items-center gap-2 ${aiStatus === 'PROCESSING' ? 'text-blue-600' : 'text-red-600 bg-red-50'}`}>
              {aiStatus === 'PROCESSING' && (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              )}
              {getAiStatusMessage()}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100 flex items-center gap-2">
        <textarea
          className="flex-1 border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-hidden"
          placeholder="Type your message..."
          rows={1}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <div className="flex flex-col gap-1">
          <button 
            onClick={() => handleSend('DISABLED')} 
            disabled={!isConnected || !inputMessage.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50 transition-colors shadow-sm"
          >
            Send
          </button>
          {user?.roles?.includes('ROLE_PATIENT') && (
            <button 
              onClick={() => handleSend('MANUAL')} 
              disabled={!isConnected || !inputMessage.trim() || aiStatus === 'PROCESSING'}
              className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-1.5 rounded-lg font-medium text-xs disabled:opacity-50 transition-colors border border-purple-200"
              title="Get an AI analysis along with sending your message to the doctor"
            >
              Ask AI
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
