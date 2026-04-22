'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useEscapeKey } from '@/lib/use-escape-key';

type Props = {
  agentId: number;
  agentName: string;
  movementType: 'DESIGNACION' | 'BAJA';
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
};

type FormState = {
  plaza_number: string;
  legal_norm_type:
    | ''
    | 'DECRETO'
    | 'RESOLUCION_MINISTERIAL'
    | 'DISPOSICION'
    | 'RI';
  legal_norm_number: string;
  assignment_date: string;
  end_date: string;
  character_type: '' | 'TITULAR' | 'INTERINO' | 'SUPLENTE';
  notes: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const initialForm: FormState = {
  plaza_number: '',
  legal_norm_type: '',
  legal_norm_number: '',
  assignment_date: '',
  end_date: '',
  character_type: '',
  notes: '',
};

function validateForm(
  form: FormState,
  movementType: 'DESIGNACION' | 'BAJA',
): FormErrors {
  const errors: FormErrors = {};

  if (!form.plaza_number.trim()) {
    errors.plaza_number = 'La plaza es obligatoria.';
  }

  if (!form.legal_norm_type) {
    errors.legal_norm_type = 'Seleccioná el tipo de norma legal.';
  }

  if (!form.legal_norm_number.trim()) {
    errors.legal_norm_number = 'El número de norma es obligatorio.';
  }

  if (!form.assignment_date) {
    errors.assignment_date = 'La fecha desde es obligatoria.';
  }

  if (movementType === 'BAJA' && !form.end_date) {
    errors.end_date = 'La fecha hasta es obligatoria para la baja.';
  }

  if (
    movementType === 'BAJA' &&
    form.assignment_date &&
    form.end_date &&
    form.end_date < form.assignment_date
  ) {
    errors.end_date =
      'La fecha hasta no puede ser anterior a la fecha desde.';
  }

  if (!form.character_type) {
    errors.character_type = 'Seleccioná el carácter.';
  }

  return errors;
}

function legalNormLabel(value: FormState['legal_norm_type']) {
  switch (value) {
    case 'DECRETO':
      return 'Decreto';
    case 'RESOLUCION_MINISTERIAL':
      return 'Resolución Ministerial';
    case 'DISPOSICION':
      return 'Disposición';
    case 'RI':
      return 'Resolución Interna (R.I.)';
    default:
      return '-';
  }
}

export function AssignmentModal({
  agentId,
  agentName,
  movementType,
  onClose,
  onSuccess,
}: Props) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  useEscapeKey(() => {
    if (!saving) onClose();
  });

  const title = useMemo(
    () =>
      movementType === 'DESIGNACION'
        ? 'Ficha de designación'
        : 'Ficha de baja',
    [movementType],
  );

  const updateField = <K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }));
  };

  const handleSubmit = async () => {
    const validation = validateForm(form, movementType);
    setErrors(validation);

    if (Object.keys(validation).length > 0) return;

    try {
      setSaving(true);

      await api.post('/assignments/by-plaza-number', {
        agent_id: agentId,
        plaza_number: form.plaza_number.trim(),
        movement_type: movementType,
        legal_norm_type: form.legal_norm_type,
        legal_norm_number: form.legal_norm_number.trim(),
        assignment_date: form.assignment_date,
        end_date: movementType === 'BAJA' ? form.end_date : undefined,
        character_type: form.character_type,
        notes: form.notes.trim() || undefined,
      });

      await onSuccess();
      onClose();
    } catch (error: unknown) {
      console.error(error);

      let message = 'No se pudo guardar el movimiento.';

      if (typeof error === 'object' && error !== null && 'response' in error) {
        const err = error as {
          response?: {
            data?: {
              message?: string | string[];
            };
          };
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
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Movimientos
            </p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {title}
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {agentName}
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
          <FormField label="Nombre del docente" full>
            <input
              type="text"
              value={agentName}
              disabled
              className="w-full rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            />
          </FormField>

          <FormField label="Plaza" error={errors.plaza_number}>
            <input
              type="text"
              value={form.plaza_number}
              onChange={(e) => updateField('plaza_number', e.target.value)}
              placeholder="Ej: 1234"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </FormField>

          <FormField label="Carácter" error={errors.character_type}>
            <select
              value={form.character_type}
              onChange={(e) =>
                updateField(
                  'character_type',
                  e.target.value as FormState['character_type'],
                )
              }
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Seleccionar</option>
              <option value="TITULAR">Titular</option>
              <option value="INTERINO">Interino</option>
              <option value="SUPLENTE">Suplente</option>
            </select>
          </FormField>

          <FormField label="Norma legal" error={errors.legal_norm_type}>
            <select
              value={form.legal_norm_type}
              onChange={(e) =>
                updateField(
                  'legal_norm_type',
                  e.target.value as FormState['legal_norm_type'],
                )
              }
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Seleccionar</option>
              <option value="DECRETO">Decreto</option>
              <option value="RESOLUCION_MINISTERIAL">
                Resolución Ministerial
              </option>
              <option value="DISPOSICION">Disposición</option>
              <option value="RI">Resolución Interna (R.I.)</option>
            </select>
          </FormField>

          <FormField label="Número de norma" error={errors.legal_norm_number}>
            <input
              type="text"
              value={form.legal_norm_number}
              onChange={(e) => updateField('legal_norm_number', e.target.value)}
              placeholder="Ej: 123/26"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </FormField>

          <FormField label="Desde" error={errors.assignment_date}>
            <input
              type="date"
              value={form.assignment_date}
              onChange={(e) => updateField('assignment_date', e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </FormField>

          <FormField label="Hasta" error={errors.end_date}>
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => updateField('end_date', e.target.value)}
              disabled={movementType !== 'BAJA'}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-700"
            />
          </FormField>

          <FormField label="Resumen" full>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {legalNormLabel(form.legal_norm_type)}{' '}
              {form.legal_norm_number ? `Nº ${form.legal_norm_number}` : ''} |{' '}
              {form.character_type || '-'}
            </div>
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
            {saving ? 'Guardando...' : 'Guardar movimiento'}
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
  error,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
  error?: string;
}) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}