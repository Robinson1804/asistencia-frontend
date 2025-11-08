export type AttendanceStatus = 'Presente' | 'Tardanza' | 'Falta' | 'No Registrado';

export interface Employee {
  id: string;
  apellidosNombres: string;
  dni: string;
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
  // IDs
  dttId?: string;
  proyectoId?: string;
  relacionDivisionId?: string;
  tipoContratoId?: string;
  modalidadId?: string;
  sedeId?: string;
  fechaInicio?: any;
  fechaFin?: any;
  createdAt?: any;
}

export interface AttendanceRecord  {
  employeeId: string;
  status: AttendanceStatus;
  timestamp?: Date;
};

export interface Sede {
  id: string;
  nombreSede: string;
  direccion: string;
  activo: boolean;
}

export interface Proyecto {
  id:string;
  CodigoProyecto: string;
  NombreProyecto: string;
  Descripcion: string;
  Activo: boolean;
}

export interface Coordinador {
  id: string;
  nombreCoordinador: string;
  activo: boolean;
}
