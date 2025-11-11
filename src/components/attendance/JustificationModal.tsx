
'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useFirestore } from '@/firebase';
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { Employee, Justification, AttendanceStatus } from '@/types';
import { startOfDay } from 'date-fns';

const justificationSchema = z.object({
  type: z.string().min(1, 'Debe seleccionar un tipo de justificación'),
  notes: z.string().min(10, 'Las notas deben tener al menos 10 caracteres'),
});

type JustificationFormData = z.infer<typeof justificationSchema>;

const justificationTypes = [
  'Salud',
  'Motivos personales o familiares',
  'Estudio o capacitación',
  'Laborales',
  'Transporte',
  'Otros',
];

interface JustificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  date: Date;
  status: AttendanceStatus;
  onJustificationSaved: (justification: Justification) => void;
}

export function JustificationModal({ isOpen, onClose, employee, date, status, onJustificationSaved }: JustificationModalProps) {
  const firestore = useFirestore();

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<JustificationFormData>({
    resolver: zodResolver(justificationSchema),
    defaultValues: {
      type: '',
      notes: '',
    },
  });

  const onSubmit = async (data: JustificationFormData) => {
    if (!firestore) return;

    const justificationPayload: Omit<Justification, 'id' | 'createdAt'> = {
      employeeId: employee.id,
      date: Timestamp.fromDate(startOfDay(date)),
      type: data.type,
      notes: data.notes,
    };
    
    try {
        const docRef = await addDoc(collection(firestore, 'justificaciones'), {
            ...justificationPayload,
            createdAt: serverTimestamp(),
        });
        
        onJustificationSaved({
            ...justificationPayload,
            id: docRef.id,
            createdAt: new Date(),
        });

        reset();

    } catch (error) {
        console.error('Error saving justification:', error);
        // Aquí podrías usar un toast para notificar el error.
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Justificar Inasistencia</DialogTitle>
            <DialogDescription>
              Registrar la justificación para {employee.apellidosNombres} por la {status.toLowerCase()} del día {date.toLocaleDateString()}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Justificación</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Seleccione un motivo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {justificationTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas de Justificación</Label>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <Textarea id="notes" placeholder="Explique brevemente el motivo..." {...field} />
                )}
              />
              {errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="secondary">Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar Justificación'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
