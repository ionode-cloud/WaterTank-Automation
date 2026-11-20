import { io } from 'socket.io-client';

const resolveSocketUrl = () => {
  let url = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5010';
  // If the browser page is loaded over HTTPS, upgrade any remote HTTP URL to HTTPS (wss://) to prevent Mixed Content blocking
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    if (url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
      url = url.replace(/^http:\/\//i, 'https://');
    }
  }
  return url;
};

const SOCKET_URL = resolveSocketUrl();
const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 2000,
  transports: ['websocket', 'polling'],
  secure: isHttpsPage,
});
