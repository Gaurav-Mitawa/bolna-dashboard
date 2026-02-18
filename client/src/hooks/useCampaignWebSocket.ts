/**
 * WebSocket hook for real-time campaign updates.
 * Connects to backend WebSocket endpoint for live campaign monitoring.
 */
import { useEffect, useRef, useState } from 'react';

interface WebSocketMessage {
  type: 'status_change' | 'call_complete' | 'campaign_complete';
  job_contact_id: string;
  contact_id: string;
  contact_name?: string;
  from_status?: string;
  to_status?: string;
  outcome?: string;
  timestamp: string;
}

export function useCampaignWebSocket(jobId: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const token = localStorage.getItem('jwtToken');
    const wsUrl = `${import.meta.env.VITE_WS_BASE_URL}/campaigns/${jobId}?token=${token}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WebSocket] Connected to campaign', jobId);
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data) as WebSocketMessage;
      console.log('[WebSocket] Message received:', message.type);
      setLastMessage(message);
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('[WebSocket] Disconnected');
      setIsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [jobId]);

  return {
    isConnected,
    lastMessage,
  };
}
