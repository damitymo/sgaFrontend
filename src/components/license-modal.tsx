'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useEscapeKey } from '@/lib/use-escape-key';

export type LicenseTypeOption = {
  id: number;
  article: string;
  description: string;
  max_days_per_year?: number | null;
  max_days_continuous?: number | null;
};

type ExistingLicense = {
  id: number;
  license_type_id: number;
  start_date: string;
  days_count: number;
};

export type LicenseEditTarget = {
  id: number;
  license_type_id: number;
  start_date: string;
  end_date: string;
  observations?: string | null;
};

type Props = {
  agentId: number;
  agentName: string;
  license?: LicenseEditTarget | null;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
};

type FormState = {
  license_type_id: string;
  start_date: string;
  end_date: string;
  observations: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

function toInputDate(date?: string | null) {
  if (!date) return '';
  const safe = new Date(date);
  if (Number.isNaN(safe.getTime())) return '';
  return safe.toISOString().slice(0, 10);
}

function buildInitialForm(license?: LicenseEditTarget | null): FormState {
  if (!license) {
    return {
      license_type_id: '',
      start_date: '',
      end_date: '',
      observations: '',
    };
  }

  return {
    license_type_id: String(license.license_type_id),
    start_date: toInputDate(license.start_date),
    end_date: toInputDate(license.end_date),
    observations: license.observations || '',
  };
}

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.license_type_id) {
    errors.license_type_id = 'Seleccioná el tipo de licencia.';
  }

  if (!form.start_date) {
    errors.start_date = 'La fecha desde es obligatoria.';
  }

  if (!form.end_date) {
    errors.end_date = 'La fecha hasta es obligatoria.';
  }

  if (
    form.start_date &&
    form.end_date &&
    form.end_date < form.start_date
  ) {
    errors.end_date = 'La fecha hasta no puede ser anterior a la fecha desde.';
  }

  return errors;
}

function computeDaysCount(startDate: string, endDate: string): number | null {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  const diff = Math.round(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );
  return diff >= 0 ? diff + 1 : null;
}

export function LicenseModal({
  agentId,
  agentName,
  license,
  onClose,
  onSuccess,
}: Props) {
  const isEdit = Boolean(license);

  const [licenseTypes, setLicenseTypes] = useState<LicenseTypeOption[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [existingLicenses, setExistingLicenses] = useState<ExistingLicense[]>([]);
  const [form, setForm] = useState<FormState>(buildInitialForm(license));
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  useEscapeKey(() => {
    if (!saving) onClose();
  });

  useEffect(() => {
    const loadTypes = async () => {
      try {
        setLoadingTypes(true);
        const response = await api.get<LicenseTypeOption[]>('/license-types');
        setLicenseTypes(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingTypes(false);
      }
    };

    void loadTypes();
  }, []);

  useEffect(() => {
    const loadExisting = async () => {
      try {
        const response = await api.get<ExistingLicense[]>(
          `/licenses/agent/${agentId}`,
        );
        setExistingLicenses(response.data);
      } catch (error) {
        console.error(error);
      }
    };

    void loadExisting();
  }, [agentId]);

  const daysCount = useMemo(
    () => computeDaysCount(form.start_date, form.end_date),
    [form.start_date, form.end_date],
  );

  const limitWarning = useMemo(() => {
    if (!form.license_type_id || !form.start_date || daysCount === null) {
      return null;
    }

    const type = licenseTypes.find((t) => t.id === Number(form.license_type_id));
    if (!type) return null;

    if (type.max_days_continuous && daysCount > type.max_days_continuous) {
      return `Esta licencia son ${daysCount} día(s) corridos y el tope continuo de ${type.article} es de ${type.max_days_continuous} día(s).`;
    }

    if (type.max_days_per_year) {
      const year = new Date(form.start_date).getFullYear();
      const usedByOthers = existingLicenses
        .filter(
          (l) =>
            l.license_type_id === type.id &&
            l.id !== license?.id &&
            new Date(l.start_date).getFullYear() === year,
        )
        .reduce((sum, l) => sum + l.days_count, 0);

      const total = usedByOthers + daysCount;

      if (total > type.max_days_per_year) {
        return `Con esta licencia el/la docente usaría ${total} de ${type.max_days_per_year} día(s) anuales para ${type.article}.`;
      }
    }

    return null;
  }, [form.license_type_id, form.start_date, daysCount, licenseTypes, existingLicenses, license?.id]);

  const updateField = <K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async () => {
    const validation = validateForm(form);
    setErrors(validation);

    if (Object.keys(validation).length > 0) return;

    try {
      setSaving(true);

      const payload = {
        agent_id: agentId,
        license_type_id: Number(form.license_type_id),
        start_date: form.start_date,
        end_date: form.end_date,
        observations: form.observations.trim() || undefined,
      };

      if (isEdit && license) {
        await api.patch(`/licenses/${license.id}`, payload);
      } else {
        await api.post('/licenses', payload);
      }

      await onSuccess();
      onClose();
    } catch (error: unknown) {
      console.error(error);

      let message = 'No se pudo guardar la licencia.';

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
              Licencias
            </p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {isEdit ? 'Modificar licencia' : 'Nueva licencia'}
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

        <div className="grid grid-cols-1 gap-4">
          <FormField label="Tipo de licencia" error={errors.license_type_id}>
            <select
              value={form.license_type_id}
              onChange={(e) =>
                updateField('license_type_id', e.target.value)
              }
              disabled={loadingTypes}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">
                {loadingTypes ? 'Cargando...' : 'Seleccionar'}
              </option>
              {licenseTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.article} — {type.description}
                </option>
              ))}
            </select>
            {!loadingTypes && licenseTypes.length === 0 ? (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                No hay tipos de licencia cargados. Configuralos primero en
                &quot;Configurar tipos de licencia&quot;.
              </p>
            ) : null}
          </FormField>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Desde" error={errors.start_date}>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => updateField('start_date', e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </FormField>

            <FormField label="Hasta" error={errors.end_date}>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => updateField('end_date', e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </FormField>
          </div>

          <FormField label="Días">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {daysCount !== null ? `${daysCount} día(s)` : '-'}
            </div>
          </FormField>

          <FormField label="Observaciones">
            <textarea
              value={form.observations}
              onChange={(e) => updateField('observations', e.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </FormField>
        </div>

        {limitWarning ? (
          <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            ⚠ Atención: {limitWarning}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            data-modal-submit
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-2xl bg-slate-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {saving ? 'Guardando...' : 'Guardar licencia'}
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
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
