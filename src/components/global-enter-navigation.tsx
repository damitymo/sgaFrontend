'use client';

import { useEffect } from 'react';

type FocusableElement = HTMLElement & {
  disabled?: boolean;
  readOnly?: boolean;
};

function isVisible(element: HTMLElement) {
  const style = window.getComputedStyle(element);

  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    element.offsetParent !== null
  );
}

function isFocusable(el: Element): el is FocusableElement {
  if (!(el instanceof HTMLElement)) return false;

  const tag = el.tagName.toLowerCase();

  const validTag =
    tag === 'input' ||
    tag === 'select' ||
    tag === 'textarea' ||
    tag === 'button' ||
    tag === 'a';

  const validTabIndex = el.hasAttribute('tabindex');

  if (!validTag && !validTabIndex) return false;
  if (!isVisible(el)) return false;
  if ((el as FocusableElement).disabled) return false;
  if (el.getAttribute('tabindex') === '-1') return false;

  return true;
}

function getFocusableElements(scope: ParentNode) {
  const selectors = [
    'input:not([type="hidden"]):not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'button:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  return Array.from(scope.querySelectorAll(selectors)).filter(isFocusable);
}

function isSubmitButton(el: Element): el is HTMLButtonElement {
  if (!(el instanceof HTMLButtonElement)) return false;
  // type="submit" es el default de <button> dentro de <form>.
  const type = el.getAttribute('type');
  return type === null || type === '' || type === 'submit';
}

export function GlobalEnterNavigation() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter') return;
      if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;

      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const tag = target.tagName.toLowerCase();

      // En textarea dejamos Enter normal para permitir múltiples líneas
      if (tag === 'textarea') return;

      // En botones: dejamos que el browser dispare click (submit / onClick)
      if (tag === 'button') return;

      // En links y elementos con tabindex custom también dejamos pasar
      if (tag === 'a') return;

      const isField = tag === 'input' || tag === 'select';
      if (!isField) return;

      const form = target.closest('form');
      // Si no hay form, el "scope" puede ser un modal marcado con
      // data-modal-root. Si tampoco hay modal, cae al documento entero.
      const modal = target.closest<HTMLElement>('[data-modal-root]');
      const scope: ParentNode = form ?? modal ?? document;

      const focusable = getFocusableElements(scope);
      const currentIndex = focusable.indexOf(target as FocusableElement);

      if (currentIndex === -1) return;

      // En un modal buscamos el botón principal marcado
      // data-modal-submit para dispararlo cuando se presiona Enter en
      // el último campo (o en el campo anterior al botón).
      const modalSubmit =
        modal?.querySelector<HTMLButtonElement>(
          'button[data-modal-submit]:not([disabled])',
        ) ?? null;

      // Detectamos cuál sería el "próximo" campo real saltando el botón
      // submit si está inmediatamente después.
      let next = focusable[currentIndex + 1];

      if (
        next &&
        ((form && isSubmitButton(next) && form.contains(next)) ||
          (modal && next === modalSubmit))
      ) {
        // Si el "siguiente" es el botón submit, evaluamos si hay otro
        // campo después. Si no hay, disparamos submit directo.
        const afterSubmit = focusable[currentIndex + 2];
        if (!afterSubmit) {
          if (form) {
            // Dejamos pasar el Enter: submit implícito del browser.
            return;
          }
          if (modal && modalSubmit) {
            event.preventDefault();
            modalSubmit.click();
            return;
          }
        }
        // Si hay otro campo después del botón, saltamos el botón.
        next = afterSubmit;
      }

      // Si no hay "siguiente" pero estamos en un modal con botón
      // submit, lo disparamos.
      if (!next && modal && modalSubmit) {
        event.preventDefault();
        modalSubmit.click();
        return;
      }

      // Si no hay siguiente, dejamos pasar el Enter (si hay form, el
      // submit implícito del browser se encarga).
      if (!next) return;

      event.preventDefault();
      next.focus();

      if (
        next instanceof HTMLInputElement &&
        ['text', 'search', 'email', 'number', 'tel', 'url', 'password'].includes(
          next.type,
        )
      ) {
        next.select?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return null;
}
