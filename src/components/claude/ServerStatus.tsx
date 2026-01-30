"use client";

interface ServerStatusProps {
  connected: boolean;
}

export function ServerStatus({ connected }: ServerStatusProps) {
  return (
    <div className={`server-status ${connected ? "connected" : "disconnected"}`}>
      {connected ? "サーバー接続中" : "サーバー未接続"}
    </div>
  );
}
