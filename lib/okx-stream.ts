/**
 * OKX public WebSocket ticker stream. Browser-only.
 *
 * Connects to wss://ws.okx.com:8443/ws/v5/public, subscribes to one or more
 * `tickers:{instId}` channels, and emits the parsed `last` price to the
 * caller. Handles ping/pong (OKX requires a `ping` text frame every 25s) and
 * reconnects with exponential backoff on transient failures.
 */

import { logger } from './logger';

export type StreamStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

export interface TickerUpdate {
  instId: string;
  last: number;
  ts: number;
}

type TickerCallback = (update: TickerUpdate) => void;
type StatusCallback = (status: StreamStatus) => void;

const OKX_PUBLIC_WS_URL = 'wss://ws.okx.com:8443/ws/v5/public';
const PING_INTERVAL_MS = 25_000;
const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

interface OkxTickerEvent {
  arg?: { channel: string; instId: string };
  data?: Array<{ instId: string; last: string; ts: string }>;
  event?: string;
  code?: string;
  msg?: string;
}

export class OKXTickerStream {
  private ws: WebSocket | null = null;
  private instIds: string[] = [];
  private callbacks: Set<TickerCallback> = new Set();
  private statusCallbacks: Set<StatusCallback> = new Set();
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private backoffMs = INITIAL_BACKOFF_MS;
  private closed = false;
  private currentStatus: StreamStatus = 'idle';

  subscribe(instIds: string[], callback: TickerCallback) {
    this.instIds = instIds;
    this.callbacks.add(callback);
  }

  onStatus(callback: StatusCallback) {
    this.statusCallbacks.add(callback);
    callback(this.currentStatus);
  }

  connect() {
    if (typeof window === 'undefined') return;
    if (this.closed) return;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    this.setStatus('connecting');
    try {
      this.ws = new WebSocket(OKX_PUBLIC_WS_URL);
    } catch (e) {
      logger.warn('okx_stream_open_failed', { error: String(e) });
      this.scheduleReconnect();
      return;
    }

    this.ws.addEventListener('open', this.handleOpen);
    this.ws.addEventListener('message', this.handleMessage);
    this.ws.addEventListener('close', this.handleClose);
    this.ws.addEventListener('error', this.handleError);
  }

  close() {
    this.closed = true;
    this.clearTimers();
    if (this.ws) {
      this.ws.removeEventListener('open', this.handleOpen);
      this.ws.removeEventListener('message', this.handleMessage);
      this.ws.removeEventListener('close', this.handleClose);
      this.ws.removeEventListener('error', this.handleError);
      try {
        this.ws.close();
      } catch {
        // Ignore close errors
      }
      this.ws = null;
    }
    this.callbacks.clear();
    this.statusCallbacks.clear();
  }

  private setStatus(next: StreamStatus) {
    this.currentStatus = next;
    this.statusCallbacks.forEach(cb => cb(next));
  }

  private clearTimers() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.closed) return;
    this.setStatus('disconnected');
    this.clearTimers();
    const delay = Math.min(this.backoffMs, MAX_BACKOFF_MS);
    this.backoffMs = Math.min(this.backoffMs * 2, MAX_BACKOFF_MS);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private handleOpen = () => {
    this.backoffMs = INITIAL_BACKOFF_MS;
    this.setStatus('connected');

    if (this.instIds.length && this.ws) {
      const subscribeMsg = {
        op: 'subscribe',
        args: this.instIds.map(instId => ({ channel: 'tickers', instId })),
      };
      this.ws.send(JSON.stringify(subscribeMsg));
    }

    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
      }
    }, PING_INTERVAL_MS);
  };

  private handleMessage = (event: MessageEvent) => {
    const text = typeof event.data === 'string' ? event.data : '';
    if (text === 'pong') return;

    let parsed: OkxTickerEvent;
    try {
      parsed = JSON.parse(text);
    } catch {
      return;
    }

    if (parsed.event === 'error') {
      logger.warn('okx_stream_error_event', { code: parsed.code, msg: parsed.msg });
      return;
    }

    if (parsed.arg?.channel !== 'tickers' || !parsed.data?.length) return;

    for (const tick of parsed.data) {
      const last = parseFloat(tick.last);
      if (Number.isNaN(last)) continue;
      const update: TickerUpdate = {
        instId: tick.instId,
        last,
        ts: parseInt(tick.ts, 10),
      };
      this.callbacks.forEach(cb => cb(update));
    }
  };

  private handleClose = () => {
    this.scheduleReconnect();
  };

  private handleError = () => {
    this.setStatus('error');
  };
}
