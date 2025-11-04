export type AttendanceStatus = 'Presente' | 'Tardanza' | 'Falta' | 'No Registrado';

export interface Employee {
  id: string;
  apellidosNombres: string;
  dni: string;
  email: string;
  telefono: string;
  activo: boolean;
  avatarUrl?: string;
  proyecto?: {
    nombre: string;
  };
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

export type AttendanceRecord = {
  employeeId: string;
  status: AttendanceStatus;
  timestamp?: Date;
};

export interface Sede {
  id: string;
  NombreSede: string;
  Direccion: string;
  Activo: boolean;
}

export interface Proyecto {
  id: string;
  CodigoProyecto: string;
  NombreProyecto: string;
  Descripcion: string;
  Activo: boolean;
}
