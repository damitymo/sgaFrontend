'use client';

import { useEffect } from 'react';

/**
 * Registra un handler global de tecla Escape. Pensado para cerrar modales.
 *
 * - Si `enabled` es false no engancha el listener (útil cuando el modal
 *   está cerrado o montado condicionalmente).
 * - Ignora Esc cuando hay modificadores (Ctrl/Alt/Meta/Shift).
 * - Ignora Esc si el foco está dentro de un elemento
 *   `[data-prevent-escape="true"]` — útil por ejemplo cuando un combobox
 *   interno maneja Esc por su cuenta.
 */
export function useEscapeKey(handler: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target?.closest?.('[data-prevent-escape="true"]')) {
        return;
      }

      event.preventDefault();
      handler();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [handler, enabled]);
}
