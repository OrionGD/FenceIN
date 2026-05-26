export interface TerminalLogEntry {
  timestamp: string;
  user: string;
  action: string;
}

type LogSubscriber = (log: TerminalLogEntry) => void;
const subscribers = new Set<LogSubscriber>();

export const terminalLogs: TerminalLogEntry[] = [];

export const subscribeToTerminalLogs = (callback: LogSubscriber) => {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
};

export const logFrontendAction = (action: string, email?: string, role?: string) => {
  const now = new Date();
  const time = now.toLocaleTimeString();
  const date = now.toLocaleDateString();
  const timestamp = `${date} ${time}`;
  const userStr = email ? `${email} [${role || 'UNKNOWN'}]` : 'UNAUTHENTICATED GUEST';

  const entry: TerminalLogEntry = { timestamp, user: userStr, action };
  
  // Stream to dedicated background terminal server
  fetch('http://localhost:5566/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry)
  }).catch(() => {
    // Suppress errors silently if telemetry server is offline
  });

  terminalLogs.push(entry);

  if (terminalLogs.length > 100) {
    terminalLogs.shift();
  }

  subscribers.forEach((cb) => cb(entry));
};
