'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

type Agent = {
  id: number;
  full_name: string;
  dni: string;
};

type AgentFullProfile = {
  id: number;
  full_name: string;
  dni: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  address?: string | null;
  birth_date?: string | null;
};

export default function DocentesPage() {
  const [filters, setFilters] = useState({
    dni: '',
    apellido: '',
    nombre: '',
    materia: '',
  });

  const [results, setResults] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentFullProfile | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [message, setMessage] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleSearch = async () => {
    try {
      setLoading(true);
      setMessage('');
      setResults([]);
      setSelectedAgent(null);
      setIsProfileOpen(false);

      const params: Record<string, string> = {};

      if (filters.dni.trim()) params.dni = filters.dni.trim();
      if (filters.apellido.trim()) params.apellido = filters.apellido.trim();
      if (filters.nombre.trim()) params.nombre = filters.nombre.trim();
      if (filters.materia.trim()) params.materia = filters.materia.trim();

      if (Object.keys(params).length === 0) {
        setMessage('Ingresá al menos un criterio de búsqueda');
        return;
      }

      const response = await api.get('/agents/search', { params });

      setResults(response.data);
    } catch (error) {
      console.error(error);
      setMessage('Error al buscar docentes');
    } finally {
      setLoading(false);
    }
  };
    const handleSelectAgent = async (agent: Agent) => {
    try {
      setLoadingProfile(true);
      setSelectedAgent(null);

      const response = await api.get(`/agents/${agent.id}/full-profile`);

      setSelectedAgent(response.data);
      setIsProfileOpen(true);
    } catch (error) {
      console.error(error);
      setMessage('Error al cargar perfil');
    } finally {
      setLoadingProfile(false);
    }
  };

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Docentes</h1>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <input
          placeholder="DNI"
          value={filters.dni}
          onChange={(e) => setFilters({ ...filters, dni: e.target.value })}
          className="border p-2 rounded"
        />
        <input
          placeholder="Apellido"
          value={filters.apellido}
          onChange={(e) => setFilters({ ...filters, apellido: e.target.value })}
          className="border p-2 rounded"
        />
        <input
          placeholder="Nombre"
          value={filters.nombre}
          onChange={(e) => setFilters({ ...filters, nombre: e.target.value })}
          className="border p-2 rounded"
        />
        <input
          placeholder="Materia"
          value={filters.materia}
          onChange={(e) => setFilters({ ...filters, materia: e.target.value })}
          className="border p-2 rounded"
        />
      </div>

      <button
        onClick={handleSearch}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {loading ? 'Buscando...' : 'Buscar'}
      </button>

      {message && <p className="text-red-500">{message}</p>}

      {/* Resultados */}
      <div className="space-y-2">
        {results.map((agent) => (
          <div
            key={agent.id}
            className="border p-3 rounded flex justify-between items-center"
          >
            <div>
              <p className="font-medium">{agent.full_name}</p>
              <p className="text-sm text-gray-500">DNI: {agent.dni}</p>
            </div>

            <button
              onClick={() => handleSelectAgent(agent)}
              className="bg-slate-800 text-white px-3 py-1 rounded"
            >
              Ver
            </button>
          </div>
        ))}
      </div>
            {/* Perfil */}
      {isProfileOpen && selectedAgent && (
        <div className="mt-6 border rounded p-4 bg-white shadow">
          <h2 className="text-xl font-bold mb-2">Perfil</h2>

          {loadingProfile ? (
            <p>Cargando...</p>
          ) : (
            <div className="space-y-1">
              <p><b>Nombre:</b> {selectedAgent.full_name}</p>
              <p><b>DNI:</b> {selectedAgent.dni}</p>
              <p><b>Email:</b> {selectedAgent.email || '-'}</p>
              <p><b>Teléfono:</b> {selectedAgent.phone || '-'}</p>
              <p><b>Celular:</b> {selectedAgent.mobile || '-'}</p>
              <p><b>Domicilio:</b> {selectedAgent.address || '-'}</p>
              <p><b>Fecha nacimiento:</b> {selectedAgent.birth_date || '-'}</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}