import { useState, useEffect, useRef, useCallback } from 'react';
import { createStatusStream } from '../services/trafficApi';

export function useTrafficSSE() {
  const [progress, setProgress] = useState(null);
  const eventSourceRef = useRef(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  const connect = useCallback((taskId) => {
    disconnect();
    retryCountRef.current = 0;

    const es = createStatusStream(taskId);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setProgress(data);

        if (data.status !== 'RUNNING') {
          es.close();
          eventSourceRef.current = null;
        }
      } catch (e) {
        console.error('SSE parse error:', e);
      }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;

      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        setTimeout(() => connect(taskId), 1000 * retryCountRef.current);
      }
    };
  }, []);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    disconnect();
    setProgress(null);
  }, [disconnect]);

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return { progress, connect, disconnect, reset };
}
