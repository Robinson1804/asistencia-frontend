const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').trim();

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `Error ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  // Empleados
  getEmpleados: () => apiFetch('/api/empleados'),
  getEmpleado: (id: string) => apiFetch(`/api/empleados/${id}`),
  getEmpleadoByDni: (dni: string) => apiFetch(`/api/empleados/by-dni/${dni}`),
  getConocimientos: (employeeId: string) => apiFetch(`/api/conocimientos/${employeeId}`),
  saveConocimientos: (data: any) => apiFetch('/api/conocimientos', { method: 'POST', body: JSON.stringify(data) }),
  createEmpleado: (data: any) => apiFetch('/api/empleados', { method: 'POST', body: JSON.stringify(data) }),
  updateEmpleado: (id: string, data: any) => apiFetch(`/api/empleados/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEmpleado: (id: string) => apiFetch(`/api/empleados/${id}`, { method: 'DELETE' }),

  // Asistencias
  getAsistencias: (fecha: string) => apiFetch(`/api/asistencias?fecha=${fecha}`),
  saveAsistencias: (fecha: string, records: any[]) =>
    apiFetch('/api/asistencias/batch', { method: 'POST', body: JSON.stringify({ fecha, records }) }),

  // Catálogos
  getSedes: () => apiFetch('/api/sedes?activo=true'),
  createSede: (data: any) => apiFetch('/api/sedes', { method: 'POST', body: JSON.stringify(data) }),
  updateSede: (id: string, data: any) => apiFetch(`/api/sedes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSede: (id: string) => apiFetch(`/api/sedes/${id}`, { method: 'DELETE' }),

  getDivisiones: () => apiFetch('/api/divisiones'),
  getDtt: () => apiFetch('/api/dtt'),
  getProyectos: () => apiFetch('/api/proyectos'),
  getModalidades: () => apiFetch('/api/modalidades'),
  getTiposContrato: () => apiFetch('/api/tipos-contrato'),
  getCoordinadores: () => apiFetch('/api/coordinadores'),
  getScrumMasters: () => apiFetch('/api/scrum-masters'),
  getRelacionesDivision: () => apiFetch('/api/relaciones-division'),

  // Proyectos CRUD
  createProyecto: (data: any) => apiFetch('/api/proyectos', { method: 'POST', body: JSON.stringify(data) }),
  updateProyecto: (id: string, data: any) => apiFetch(`/api/proyectos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Justificaciones
  getJustificaciones: (params?: { employee_id?: string; fecha?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return apiFetch(`/api/justificaciones${q ? `?${q}` : ''}`);
  },
  createJustificacion: (data: any) =>
    apiFetch('/api/justificaciones', { method: 'POST', body: JSON.stringify(data) }),
};
