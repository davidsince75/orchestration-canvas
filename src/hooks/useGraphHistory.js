import { useState, useCallback } from 'react';

export function useGraphHistory(initializer) {
  const [state, setState] = useState(() => ({
    past: [],
    present: typeof initializer === 'function' ? initializer() : initializer,
    future: []
  }));

  // History-tracked set (for generate, refine, template load, node edits)
  const setGraph = useCallback((updater) => {
    setState(prev => {
      const newPresent = typeof updater === 'function' ? updater(prev.present) : updater;
      return {
        past: [...prev.past.slice(-49), prev.present],
        present: newPresent,
        future: []
      };
    });
  }, []);

  // Silent set (for drag — no history entry)
  const setGraphSilent = useCallback((updater) => {
    setState(prev => ({
      ...prev,
      present: typeof updater === 'function' ? updater(prev.present) : updater
    }));
  }, []);

  const undo = useCallback(() => {
    setState(prev => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      return {
        past: prev.past.slice(0, -1),
        present: previous,
        future: [prev.present, ...prev.future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState(prev => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: prev.future.slice(1)
      };
    });
  }, []);

  return {
    graph: state.present,
    setGraph,
    setGraphSilent,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0
  };
}
