import { useEffect, useRef, useState } from 'react';
import useRealTimeStore from '../stores/realTimeStore';
import toast from 'react-hot-toast';

export interface UseRealTimeSyncOptions {
  url?: string;
  port?: number;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface UseRealTimeSyncReturn {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  subscribe: (entityType: string, entityId?: string) => void;
  unsubscribe: (entityType: string, entityId?: string) => void;
  sendCommand: (command: string, data?: any) => Promise<any>;
}

export function useRealTimeSync(options: UseRealTimeSyncOptions = {}): UseRealTimeSyncReturn {
  const {
    url = 'localhost',
    port = 3007,
    autoConnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 10
  } = options;
  
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const requestCallbacks = useRef<Map<string, (response: any) => void>>(new Map());
  
  const store = useRealTimeStore();
  
  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }
    
    setConnecting(true);
    setError(null);
    
    try {
      const wsUrl = `ws://${url}:${port}`;
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('Connected to Sync Manager');
        setConnected(true);
        setConnecting(false);
        setReconnectAttempts(0);
        setError(null);
        
        store.connect();
        toast.success('Connected to real-time sync');
        
        // Subscribe to all updates by default
        subscribe('swarm');
        subscribe('agent');
        subscribe('task');
        subscribe('performance');
        subscribe('memory');
        subscribe('log');
        subscribe('system');
      };
      
      wsRef.current.onclose = () => {
        console.log('Disconnected from Sync Manager');
        setConnected(false);
        setConnecting(false);
        store.disconnect();
        
        // Auto-reconnect if enabled and not manually disconnected
        if (autoConnect && reconnectAttempts < maxReconnectAttempts) {
          scheduleReconnect();
        } else {
          toast.error('Disconnected from real-time sync');
        }
      };
      
      wsRef.current.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('Connection failed');
        setConnecting(false);
        toast.error('Failed to connect to sync manager');
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (err) {
          console.error('Failed to parse message:', err);
        }
      };
      
    } catch (err) {
      setError(`Connection error: ${err}`);
      setConnecting(false);
      toast.error('Failed to establish connection');
    }
  };
  
  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setConnected(false);
    setConnecting(false);
    setReconnectAttempts(maxReconnectAttempts); // Prevent auto-reconnect
    store.disconnect();
  };
  
  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    const attempts = reconnectAttempts + 1;
    setReconnectAttempts(attempts);
    
    const delay = Math.min(reconnectInterval * Math.pow(2, attempts - 1), 30000);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${attempts}/${maxReconnectAttempts})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (attempts <= maxReconnectAttempts) {
        connect();
      }
    }, delay);
  };
  
  const handleMessage = (message: any) => {
    switch (message.type) {
      case 'initial-state':
      case 'swarm-update':
      case 'agent-update':
      case 'task-update':
      case 'memory-update':
      case 'performance-update':
      case 'log-update':
      case 'system-update':
        store.handleUpdate(message.type, message.data);
        break;
        
      case 'command-result':
        const callback = requestCallbacks.current.get(message.requestId);
        if (callback) {
          callback(message.data);
          requestCallbacks.current.delete(message.requestId);
        }
        break;
        
      case 'error':
        console.error('Server error:', message.error);
        if (message.requestId) {
          const callback = requestCallbacks.current.get(message.requestId);
          if (callback) {
            callback({ error: message.error });
            requestCallbacks.current.delete(message.requestId);
          }
        }
        setError(message.error);
        toast.error(`Server error: ${message.error}`);
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  };
  
  const subscribe = (entityType: string, entityId?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        entityType,
        entityId
      }));
    }
  };
  
  const unsubscribe = (entityType: string, entityId?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        entityType,
        entityId
      }));
    }
  };
  
  const sendCommand = (command: string, data: any = {}): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        reject(new Error('Not connected'));
        return;
      }
      
      const requestId = `${Date.now()}-${Math.random()}`;
      
      requestCallbacks.current.set(requestId, (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
      
      wsRef.current.send(JSON.stringify({
        type: 'command',
        command,
        data,
        requestId
      }));
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (requestCallbacks.current.has(requestId)) {
          requestCallbacks.current.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  };
  
  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, []);
  
  // Handle reconnection attempts
  useEffect(() => {
    if (!connected && autoConnect && reconnectAttempts < maxReconnectAttempts && reconnectAttempts > 0) {
      toast(`Reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})`, {
        icon: '🔄'
      });
    }
  }, [reconnectAttempts]);
  
  return {
    connected,
    connecting,
    error,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    sendCommand
  };
}

export default useRealTimeSync;