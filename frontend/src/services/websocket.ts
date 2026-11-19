import { Client, IMessage, StompSubscription } from '@stomp/stompjs';

type MessageCallback = (data: any) => void;

class WebSocketService {
  private client: Client | null = null;
  private isConnected: boolean = false;
  private token: string | null = null;
  private subscribers: Map<string, Set<MessageCallback>> = new Map();
  private activeSubscriptions: Map<string, StompSubscription> = new Map();

  public connect(token: string) {
    if (this.isConnected && this.token === token) {
      return;
    }

    if (this.client) {
      this.disconnect();
    }

    this.token = token;

    // Build native WebSocket endpoint URL
    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const host = (typeof window !== 'undefined' && window.location.hostname) || 'localhost';
    const wsUrl = import.meta.env.VITE_WS_URL || `${isSecure ? 'wss:' : 'ws:'}//${host}:8080/ws-raw`;

    try {
      this.client = new Client({
        brokerURL: wsUrl,
        connectHeaders: {
          Authorization: `Bearer ${token}`,
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
      });

      this.client.onConnect = () => {
        this.isConnected = true;
        console.log('⚡ [WebSocket] Connected to MarketForge STOMP Broker via Native WebSocket');

        // Re-subscribe all registered listeners
        this.subscribers.forEach((_, destination) => {
          if (!this.activeSubscriptions.has(destination)) {
            this.subscribeStomp(destination);
          }
        });
      };

      this.client.onDisconnect = () => {
        this.isConnected = false;
        this.activeSubscriptions.clear();
      };

      this.client.onStompError = (frame) => {
        console.warn('⚠️ [WebSocket] STOMP Error:', frame.headers['message']);
      };

      this.client.onWebSocketError = (event) => {
        console.warn('⚠️ [WebSocket] WebSocket network notice:', event);
      };

      this.client.activate();
    } catch (err) {
      console.warn('Failed to initialize WebSocket client:', err);
    }
  }

  public disconnect() {
    if (this.client) {
      try {
        this.activeSubscriptions.forEach((sub) => sub.unsubscribe());
        this.activeSubscriptions.clear();
        this.client.deactivate();
      } catch (err) {
        console.warn('Error during WebSocket disconnect:', err);
      }
      this.client = null;
      this.isConnected = false;
      this.token = null;
    }
  }

  public subscribe(destination: string, callback: MessageCallback): () => void {
    if (!this.subscribers.has(destination)) {
      this.subscribers.set(destination, new Set());
    }

    this.subscribers.get(destination)!.add(callback);

    if (this.isConnected && !this.activeSubscriptions.has(destination)) {
      this.subscribeStomp(destination);
    }

    // Return un-subscriber
    return () => {
      const callbacks = this.subscribers.get(destination);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscribers.delete(destination);
          const sub = this.activeSubscriptions.get(destination);
          if (sub) {
            try {
              sub.unsubscribe();
            } catch {
              // ignore
            }
            this.activeSubscriptions.delete(destination);
          }
        }
      }
    };
  }

  public send(destination: string, body: any) {
    if (this.client && this.isConnected) {
      try {
        this.client.publish({
          destination,
          body: JSON.stringify(body),
        });
      } catch (err) {
        console.warn('⚠️ [WebSocket] Failed to publish frame:', err);
      }
    }
  }

  private subscribeStomp(destination: string) {
    if (!this.client || !this.isConnected) return;

    try {
      const sub = this.client.subscribe(destination, (message: IMessage) => {
        try {
          const payload = JSON.parse(message.body);
          const callbacks = this.subscribers.get(destination);
          if (callbacks) {
            callbacks.forEach((cb) => cb(payload));
          }
        } catch {
          const callbacks = this.subscribers.get(destination);
          if (callbacks) {
            callbacks.forEach((cb) => cb(message.body));
          }
        }
      });
      this.activeSubscriptions.set(destination, sub);
    } catch (err) {
      console.warn('Failed to subscribe to destination:', destination, err);
    }
  }
}

export const wsService = new WebSocketService();
