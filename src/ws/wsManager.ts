import { WebSocket } from 'ws';

type SubscriberMap = Map<string, Set<WebSocket>>;

class WsManager {
  private subscribers: SubscriberMap = new Map();

  addSubscriber(orderId: string, socket: WebSocket) {
    if (!this.subscribers.has(orderId)) this.subscribers.set(orderId, new Set());
    this.subscribers.get(orderId)!.add(socket);
    socket.on('close', () => this.removeSubscriber(orderId, socket));
  }

  removeSubscriber(orderId: string, socket: WebSocket) {
    const set = this.subscribers.get(orderId);
    if (!set) return;
    set.delete(socket);
    if (set.size === 0) this.subscribers.delete(orderId);
  }

  broadcast(orderId: string, message: Record<string, unknown>) {
    const set = this.subscribers.get(orderId);
    if (!set) return;
    const payload = JSON.stringify(message);
    set.forEach((sock) => {
      if (sock.readyState === sock.OPEN) sock.send(payload);
    });
  }
}

export const wsManager = new WsManager();
