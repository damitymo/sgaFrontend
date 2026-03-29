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

      const isField =
        tag === 'input' ||
        tag === 'select' ||
        tag === 'button' ||
        target.hasAttribute('tabindex');

      if (!isField) return;

      const form = target.closest('form');
      const scope: ParentNode = form ?? document;

      const focusable = getFocusableElements(scope);
      const currentIndex = focusable.indexOf(target as FocusableElement);

      if (currentIndex === -1) return;

      const next = focusable[currentIndex + 1];

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