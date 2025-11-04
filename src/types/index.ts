export type AttendanceStatus = 'Presente' | 'Tardanza' | 'Falta' | 'No Registrado';

export interface Employee {
  id: string;
  ApellidosNombres: string;
  DNI: string;
  Email: string;
  Telefono: string;
  Activo: boolean;
  avatarUrl?: string;
  Cargo?: string;
  DTTID?: string;
  ProyectoID?: string;
  RelacionDivisionID?: string;
  TipoContratoID?: string;
  ModalidadID?: string;
  SedeID?: string;
  FechaInicio?: any; 
  FechaFin?: any;
  FechaRegistro?: any;
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
