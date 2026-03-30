import { useState, useCallback, useRef } from 'react';
import {
  startRun, cancelRun, respondHumanReview,
  onNodeStart, onNodeDone, onNodeError, onNodeToken,
  onRunComplete, onRunCancelled, onHumanReview,
} from '../api/runEngine.js';

/**
 * Manages live execution state for one graph run.
 *
 * nodeStates: Map<nodeId, {
 *   status:        'pending'|'running'|'done'|'error'|'cancelled',
 *   output:        string | null,   // set once when the node completes
 *   partialOutput: string | null,   // live token accumulation while running
 *   error:         string | null,
 * }>
 */
export function useRunEngine(graph, apiKey, brief, onError) {
  const [runState,      setRunState]      = useState(null);
  // pendingReview: { runId, nodeId, nodeName, instructions, content, timeoutMins } | null
  const [pendingReview, setPendingReview] = useState(null);
  const unlistenersRef = useRef([]);
  const runIdRef = useRef(null);

  const clearListeners = () => {
    unlistenersRef.current.forEach(fn => fn());
    unlistenersRef.current = [];
  };

  const startExecution = useCallback(async () => {
    if (!graph.nodes.length) return;
    if (!brief?.trim()) {
      onError?.('Enter a prompt in the Brief panel before running.');
      return;
    }
    if (!window.__TAURI_INTERNALS__) {
      onError?.('Execution requires the Tauri desktop app — open via npm run dev, not localhost.');
      return;
    }

    // Clean up any stale listeners from a previous completed run before starting a new one.
    // We do NOT call clearListeners() inside onRunComplete because Tauri may still have
    // pending run:node-done events in its queue when run:complete arrives — removing the
    // listener synchronously there would silently drop those events and wipe the output.
    clearListeners();

    // Build initial pending state for all nodes
    const initialStates = new Map(
      graph.nodes.map(n => [n.id, { status: 'pending', output: null, partialOutput: null, error: null }])
    );

    setRunState({ runId: null, mode: 'running', nodeStates: initialStates });

    // Subscribe BEFORE invoking to avoid missing early events
    const updateNode = (nodeId, patch) => {
      setRunState(prev => {
        if (!prev) return prev;
        const next = new Map(prev.nodeStates);
        next.set(nodeId, { ...(next.get(nodeId) || {}), ...patch });
        return { ...prev, nodeStates: next };
      });
    };

    const [u1, u2, u3, u4, u5, u6, u7] = await Promise.all([
      onNodeStart(({ nodeId }) =>
        updateNode(nodeId, { status: 'running', partialOutput: null })
      ),
      onNodeDone(({ nodeId, output }) =>
        // Final output arrived — clear partialOutput so the UI shows the finished version
        updateNode(nodeId, { status: 'done', output, partialOutput: null })
      ),
      onNodeError(({ nodeId, error }) =>
        updateNode(nodeId, { status: 'error', error, partialOutput: null })
      ),
      // Token event — append to partialOutput for the streaming live preview
      onNodeToken(({ nodeId, token }) => {
        setRunState(prev => {
          if (!prev) return prev;
          const next    = new Map(prev.nodeStates);
          const current = next.get(nodeId) || {};
          next.set(nodeId, {
            ...current,
            partialOutput: (current.partialOutput ?? '') + token,
          });
          return { ...prev, nodeStates: next };
        });
      }),
      onRunComplete(({ runId, status }) => {
        const mode = status === 'cancelled' ? 'cancelled' : status === 'error' ? 'error' : 'done';
        setRunState(prev => prev ? { ...prev, runId, mode } : prev);
        setPendingReview(null);
        runIdRef.current = null;
      }),
      onRunCancelled(() => {
        setRunState(prev => prev ? { ...prev, mode: 'cancelled' } : prev);
        setPendingReview(null);
      }),
      onHumanReview(payload => setPendingReview(payload)),
    ]);
    unlistenersRef.current = [u1, u2, u3, u4, u5, u6, u7];

    try {
      const runId = await startRun(graph, apiKey, brief);
      runIdRef.current = runId;
      setRunState(prev => prev ? { ...prev, runId } : prev);
    } catch (err) {
      clearListeners();
      runIdRef.current = null;
      setRunState(null);
      onError?.(err.message);
    }
  }, [graph, apiKey, brief, onError]);

  const stopExecution = useCallback(async () => {
    const runId = runIdRef.current;
    if (!runId) return;
    try {
      await cancelRun(runId);
    } catch {
      // best-effort — the run may have already finished
    }
  }, []);

  const clearRun = useCallback(() => {
    clearListeners();
    runIdRef.current = null;
    setRunState(null);
    setPendingReview(null);
  }, []);

  const submitReview = useCallback(async (approved, feedback = '') => {
    if (!pendingReview) return;
    const { runId, nodeId } = pendingReview;
    setPendingReview(null);
    try {
      await respondHumanReview(runId, nodeId, approved, feedback);
    } catch (err) {
      onError?.(err.message);
    }
  }, [pendingReview, onError]);

  return {
    runState,
    pendingReview,
    startExecution,
    stopExecution,
    clearRun,
    submitReview,
    isRunning: runState?.mode === 'running',
  };
}
