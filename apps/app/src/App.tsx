import { SCAFFOLD_STATUS } from '@coda/core/contracts';
import { invoke } from '@tauri-apps/api/core';
import { useState, type ReactElement } from 'react';

type HealthResponse = {
  message: string;
};

const APP_TITLE = 'Coda Mission Control';

export const App = (): ReactElement => {
  const [healthMessage, setHealthMessage] = useState<string>('Idle');
  const [loading, setLoading] = useState<boolean>(false);

  const runHealthCheck = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await invoke<HealthResponse>('get_health_message', {
        projectName: SCAFFOLD_STATUS.projectName,
      });
      setHealthMessage(response.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="layout">
      <header className="panel">
        <p className="kicker">Milestone 1 Scaffold</p>
        <h1>{APP_TITLE}</h1>
        <p>Roundtrip status for app shell + Rust command bridge.</p>
      </header>

      <section className="panel">
        <h2>Health Check</h2>
        <p>{healthMessage}</p>
        <button type="button" onClick={() => void runHealthCheck()} disabled={loading}>
          {loading ? 'Checking...' : 'Run Tauri Command'}
        </button>
      </section>

      <section className="panel">
        <h2>Plan / Work Placeholder</h2>
        <p>Project: {SCAFFOLD_STATUS.projectName}</p>
        <p>Milestone: {SCAFFOLD_STATUS.milestone}</p>
        <p>Readiness: {SCAFFOLD_STATUS.readiness}</p>
      </section>
    </main>
  );
};
