'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useEscapeKey } from '@/lib/use-escape-key';

export type EditableAssignment = {
  id: number;
  legal_norm_type: string | null;
  legal_norm_number: string | null;
  character_type: string | null;
  assignment_date: string | null;
  end_date: string | null;
  notes: string | null;
};

type Props = {
  agentName: string;
  plazaLabel: string;
  assignment: EditableAssignment;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
};

type FormState = {
  legal_norm_type: '' | 'DECRETO' | 'RESOLUCION_MINISTERIAL' | 'DISPOSICION' | 'RI';
  legal_norm_number: string;
  character_type: '' | 'TITULAR' | 'INTERINO' | 'SUPLENTE';
  assignment_date: string;
  end_date: string;
  notes: string;
};

function toInputDate(date?: string | null) {
  if (!date) return '';
  const safe = new Date(date);
  if (Number.isNaN(safe.getTime())) return '';
  return safe.toISOString().slice(0, 10);
}

function buildInitialForm(assignment: EditableAssignment): FormState {
  return {
    legal_norm_type: (assignment.legal_norm_type as FormState['legal_norm_type']) || '',
    legal_norm_number: assignment.legal_norm_number || '',
    character_type: (assignment.character_type as FormState['character_type']) || '',
    assignment_date: toInputDate(assignment.assignment_date),
    end_date: toInputDate(assignment.end_date),
    notes: assignment.notes || '',
  };
}

/**
 * Edita los campos de una designación/baja existente vía PATCH
 * /assignments/:id. A diferencia de AssignmentModal (que crea un
 * movimiento nuevo por número de plaza), este modal corrige los datos de
 * un movimiento ya cargado — útil para arreglar un error de tipeo sin
 * tener que dar de baja y volver a designar.
 */
export function EditAssignmentModal({
  agentName,
  plazaLabel,
  assignment,
  onClose,
  onSuccess,
}: Props) {
  const [form, setForm] = useState<FormState>(buildInitialForm(assignment));
  const [saving, setSaving] = useState(false);

  useEscapeKey(() => {
    if (!saving) onClose();
  });

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);

      await api.patch(`/assignments/${assignment.id}`, {
        legal_norm_type: form.legal_norm_type || undefined,
        legal_norm_number: form.legal_norm_number.trim() || undefined,
        character_type: form.character_type || undefined,
        assignment_date: form.assignment_date || undefined,
        end_date: form.end_date || undefined,
        notes: form.notes.trim() || undefined,
      });

      await onSuccess();
      onClose();
    } catch (error: unknown) {
      console.error(error);

      let message = 'No se pudo guardar el cargo.';

      if (typeof error === 'object' && error !== null && 'response' in error) {
        const err = error as {
          response?: { data?: { message?: string | string[] } };
        };
        const backendMessage = err.response?.data?.message;

        if (Array.isArray(backendMessage)) {
          message = backendMessage.join(', ');
        } else if (typeof backendMessage === 'string') {
          message = backendMessage;
        }
      }

      alert(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4 print:hidden">
      <div
        data-modal-root
        role="dialog"
        aria-modal="true"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Cargos y asignaciones
            </p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              Modificar cargo
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {agentName} · {plazaLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Cerrar
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Carácter">
            <select
              value={form.character_type}
              onChange={(e) =>
                updateField('character_type', e.target.value as FormState['character_type'])
              }
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Sin cambios</option>
              <option value="TITULAR">Titular</option>
              <option value="INTERINO">Interino</option>
              <option value="SUPLENTE">Suplente</option>
            </select>
          </FormField>

          <FormField label="Norma legal">
            <select
              value={form.legal_norm_type}
              onChange={(e) =>
                updateField('legal_norm_type', e.target.value as FormState['legal_norm_type'])
              }
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Sin cambios</option>
              <option value="DECRETO">Decreto</option>
              <option value="RESOLUCION_MINISTERIAL">Resolución Ministerial</option>
              <option value="DISPOSICION">Disposición</option>
              <option value="RI">Resolución Interna (R.I.)</option>
            </select>
          </FormField>

          <FormField label="Número de norma">
            <input
              type="text"
              value={form.legal_norm_number}
              onChange={(e) => updateField('legal_norm_number', e.target.value)}
              placeholder="Ej: 123/26"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </FormField>

          <FormField label="Desde">
            <input
              type="date"
              value={form.assignment_date}
              onChange={(e) => updateField('assignment_date', e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </FormField>

          <FormField label="Hasta">
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => updateField('end_date', e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </FormField>

          <FormField label="Observaciones" full>
            <textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </FormField>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            data-modal-submit
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-2xl bg-slate-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  children,
  full = false,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </label>
      {children}
    </div>
  );
}
