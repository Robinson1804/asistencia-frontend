import type { Employee } from '@/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const employeeImages = PlaceHolderImages.filter(img => img.id.startsWith('employee-'));

export const employees: Employee[] = [
  {
    id: 'EMP001',
    name: 'Ana García',
    position: 'Desarrolladora Frontend',
    avatarUrl: employeeImages.find(img => img.id === 'employee-1')?.imageUrl || '',
  },
  {
    id: 'EMP002',
    name: 'Carlos Rodríguez',
    position: 'Desarrollador Backend',
    avatarUrl: employeeImages.find(img => img.id === 'employee-2')?.imageUrl || '',
  },
  {
    id: 'EMP003',
    name: 'Beatriz López',
    position: 'Diseñadora UX/UI',
    avatarUrl: employeeImages.find(img => img.id === 'employee-3')?.imageUrl || '',
  },
  {
    id: 'EMP004',
    name: 'David Martínez',
    position: 'Jefe de Proyecto',
    avatarUrl: employeeImages.find(img => img.id === 'employee-4')?.imageUrl || '',
  },
  {
    id: 'EMP005',
    name: 'Elena Sánchez',
    position: 'Analista de QA',
    avatarUrl: employeeImages.find(img => img.id === 'employee-5')?.imageUrl || '',
  },
  {
    id: 'EMP006',
    name: 'Fernando Pérez',
    position: 'Administrador de Sistemas',
    avatarUrl: employeeImages.find(img => img.id === 'employee-6')?.imageUrl || '',
  },
];
