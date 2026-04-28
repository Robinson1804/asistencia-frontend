
'use client';

import { useEffect, useState } from 'react';
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
import type { Employee, Justification, TurnoNumber } from '@/types';
import { TURNOS } from '@/types';
import { format } from 'date-fns';

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
  turno?: TurnoNumber;
  justification?: Justification;
  onJustificationSaved: (justification: Justification) => void;
  allowEdit?: boolean;
}

export function JustificationModal({ isOpen, onClose, employee, date, turno, justification, onJustificationSaved, allowEdit = false }: JustificationModalProps) {
  const [isEditing, setIsEditing] = useState(false);

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<JustificationFormData>({
    resolver: zodResolver(justificationSchema),
    defaultValues: { type: '', notes: '' },
  });

  useEffect(() => {
    if (justification) {
      reset({ type: justification.type, notes: justification.notes });
    } else {
      reset({ type: '', notes: '' });
    }
    setIsEditing(false);
  }, [justification, reset, isOpen]);

  const turnoLabel = turno ? TURNOS.find(t => t.turno === turno)?.label : undefined;

  const onSubmit = async (data: JustificationFormData) => {
    const justificationPayload: Justification = {
      employeeId: employee.id,
      date: format(date, 'yyyy-MM-dd') as any,
      type: data.type,
      notes: data.notes,
      turno,
    };
    onJustificationSaved(justificationPayload);
    setIsEditing(false);
    reset();
  };

  const isReadOnly = !!justification && !isEditing;

  const turnoDesc = turnoLabel ? ` (horario ${turnoLabel})` : '';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{isReadOnly ? 'Detalles de la Justificación' : 'Justificar Falta'}</DialogTitle>
            <DialogDescription>
              {isReadOnly
                ? `Justificación para ${employee.apellidosNombres}${turnoDesc} del ${date.toLocaleDateString()}.`
                : `Registrar justificación para ${employee.apellidosNombres}${turnoDesc} del ${date.toLocaleDateString()}.`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Justificación</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Seleccione un motivo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {justificationTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
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
                  <Textarea id="notes" placeholder="Explique brevemente el motivo..." {...field} readOnly={isReadOnly} />
                )}
              />
              {errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="secondary">Cerrar</Button>
            </DialogClose>
            {justification && !isEditing && allowEdit && (
              <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>
                Editar
              </Button>
            )}
            {!isReadOnly && (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Guardar Justificación'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
