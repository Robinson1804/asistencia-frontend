

export type AttendanceStatus = 'Presente' | 'Tardanza' | 'Falta' | 'Falta Justificada' | 'Tardanza Justificada' | 'No Registrado';

export interface Employee {
  id: string;
  apellidosNombres: string;
  dni: string;
  orden?: string;
  email: string | null;
  telefono: string | null;
  activo: boolean;
  avatarUrl?: string;
  edad?: number;
  correoPersonal?: string;
  // Campos anidados que tienes en Firebase
  proyecto?: {
    nombre: string;
    codigo?: string;
    descripcion?: string;
  };
  dtt?: {
    nombre: string;
    codigo?: string;
    descripcion?: string;
  };
  modalidad?: {
    nombre: string;
    descripcion?: string;
  };
  sede?: {
    nombre: string;
    direccion?: string;
  };
  tipoContrato?: {
    tipo: string;
    descripcion?: string;
  };
  coordinador?: {
    nombre: string;
  };
  division?: {
    nombre: string;
  };
  scrumMaster?: {
    nombre: string;
  };
  // IDs
  dttId?: string;
  proyectoId?: string;
  relacionDivisionId?: string;
  tipoContratoId?: string;
  modalidadId?: string;
  sedeId?: string;
  coordinadorId?: string;
  divisionId?: string;
  scrumMasterId?: string;
  fechaInicio?: any;
  fechaFin?: any;
  createdAt?: any;
  status?: AttendanceStatus;
  justification?: Justification;
}

export type NivelConocimiento = 'DESCONOCE' | 'BÁSICO' | 'INTERMEDIO' | 'AVANZADO';

export interface ConocimientoEmpleado {
    id?: string;
    employeeId: string;
    gradoInstruccion: string;
    gradoInstruccionOtro?: string;
    cargo: string;
    cargoOtro?: string;
    añosExperiencia: string;
    frontend: Record<string, NivelConocimiento>;
    backend: Record<string, NivelConocimiento>;
    databases: Record<string, NivelConocimiento>;
    devops: Record<string, NivelConocimiento>;
    proyectosOtin: string;
    tecnologiasAprender: string;
    otrasTecnologias: string;
    updatedAt?: any;
}


export interface AttendanceRecord  {
  id?: string;
  employeeId: string;
  status: AttendanceStatus;
  timestamp?: any;
  justificationType?: string;
  justificationNotes?: string;
};

export interface Justification {
  id?: string;
  employeeId: string;
  date: any;
  type: string;
  notes: string;
  turno?: TurnoNumber;
  createdAt?: any;
}

export type TurnoNumber = 1 | 2 | 3;
export type TurnoStatus = 'Presente' | 'Falta';
export type TurnoStatuses = { 1?: TurnoStatus; 2?: TurnoStatus; 3?: TurnoStatus };

export const TURNOS: { turno: TurnoNumber; label: string; short: string; cutoffHour: number }[] = [
  { turno: 1, label: '8:40am',  short: '8:40',  cutoffHour: 11 },
  { turno: 2, label: '12:00pm', short: '12:00', cutoffHour: 15 },
  { turno: 3, label: '4:00pm',  short: '16:00', cutoffHour: 24 },
];

export function getActiveTurno(): TurnoNumber {
  const h = new Date().getHours();
  if (h < 11) return 1;
  if (h < 15) return 2;
  return 3;
}

export function computeDailyStatus(ts: TurnoStatuses): string | null {
  if (!ts[1] && !ts[2] && !ts[3]) return null;
  if (!ts[1] || !ts[2] || !ts[3]) return null; // Not all registered
  const present = [ts[1], ts[2], ts[3]].filter(s => s === 'Presente').length;
  if (present === 3) return 'Presente';
  if (present === 2) return 'Tardanza';
  return 'Falta';
}

export interface Sede {
  id: string;
  nombreSede: string;
  direccion: string;
  activo: boolean;
}

export interface Proyecto {
  id:string;
  codigoProyecto: string;
  nombreProyecto: string;
  descripcion: string;
  activo: boolean;
}

export interface Coordinador {
  id: string;
  nombreCoordinador: string;
  activo: boolean;
}

export interface Dtt {
  id: string;
  nombreDTT: string;
  codigoDTT: string;
  descripcion: string;
}

export interface Modalidad {
    id: string;
    nombreModalidad: string;
    descripcion: string;
}

export interface TipoContrato {
    id: string;
    tipoContrato: string;
    descripcion: string;
}

export interface Division {
    id: string;
    nombreDivision: string;
    descripcion: string;
}

export interface ScrumMaster {
    id: string;
    nombreScrumMaster: string;
    activo: boolean;
}

export interface RelacionDivision {
  id: string;
  coordinadorId: string;
  divisionId: string;
  scrumMasterId: string;
}
    
