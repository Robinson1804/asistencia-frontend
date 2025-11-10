

export type AttendanceStatus = 'Presente' | 'Tardanza' | 'Falta' | 'No Registrado';

export interface Employee {
  id: string;
  apellidosNombres: string;
  dni: string;
  orden?: string;
  email: string | null;
  telefono: string | null;
  activo: boolean;
  avatarUrl?: string;
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
}

export interface AttendanceRecord  {
  employeeId: string;
  status: AttendanceStatus;
  timestamp?: any;
};

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

    
