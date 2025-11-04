export type AttendanceStatus = 'Presente' | 'Tardanza' | 'Falta' | 'No Registrado';

export type Employee = {
  id: string;
  name: string;
  position: string;
  avatarUrl: string;
};

export type AttendanceRecord = {
  employeeId: string;
  status: AttendanceStatus;
  timestamp?: Date;
};
