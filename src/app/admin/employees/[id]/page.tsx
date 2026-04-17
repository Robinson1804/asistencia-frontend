'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, apiFetch } from '@/lib/api';
import { useApiData } from '@/hooks/use-api-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

const employeeSchema = z.object({
  apellidosNombres: z.string().min(3, "El nombre es requerido"),
  dni: z.string().length(8, "El DNI debe tener 8 dígitos"),
  orden: z.string().optional(),
  email: z.string().email("Correo inválido").optional().or(z.literal('')),
  telefono: z.string().optional(),
  activo: z.boolean().default(true),
  proyectoId: z.string().optional(),
  sedeId: z.string().optional(),
  modalidadId: z.string().optional(),
  tipoContratoId: z.string().optional(),
  dttId: z.string().optional(),
  scrumMasterId: z.string().optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

export default function EmployeeFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === 'new';
  const { toast } = useToast();

  const [loadingEmployee, setLoadingEmployee] = useState(!isNew);
  const [formInitialized, setFormInitialized] = useState(false);
  const [resolvedCoordinador, setResolvedCoordinador] = useState('');
  const [resolvedDivision, setResolvedDivision] = useState('');

  const { data: proyectosData } = useApiData<any>('/api/proyectos');
  const { data: sedesData } = useApiData<any>('/api/sedes');
  const { data: modalidadesData } = useApiData<any>('/api/modalidades');
  const { data: tiposContratoData } = useApiData<any>('/api/tipos-contrato');
  const { data: dttsData } = useApiData<any>('/api/dtt');
  const { data: scrumMastersData } = useApiData<any>('/api/scrum-masters');
  const { data: relacionesData } = useApiData<any>('/api/relaciones-division');

  const { control, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      apellidosNombres: '', dni: '', orden: '', email: '', telefono: '',
      activo: true, proyectoId: undefined, sedeId: undefined,
      modalidadId: undefined, tipoContratoId: undefined, dttId: undefined,
      scrumMasterId: undefined,
    }
  });

  const scrumMasterId = watch('scrumMasterId');

  useEffect(() => {
    if (!isNew) {
      api.getEmpleado(id)
        .then((emp: any) => {
          if (!emp) return;
          // Find scrumMasterId from relacion_division_id
          const loadForm = (smId?: string) => {
            reset({
              apellidosNombres: emp.apellidos_nombres || '',
              dni: emp.dni || '',
              orden: emp.orden || '',
              email: emp.email || '',
              telefono: emp.telefono || '',
              activo: emp.activo ?? true,
              proyectoId: emp.proyecto_id || undefined,
              sedeId: emp.sede_id || undefined,
              modalidadId: emp.modalidad_id || undefined,
              tipoContratoId: emp.tipo_contrato_id || undefined,
              dttId: emp.dtt_id || undefined,
              scrumMasterId: smId || undefined,
            });
            setFormInitialized(true);
          };

          if (emp.relacion_division_id && relacionesData) {
            const rel = relacionesData.find((r: any) => r.id === emp.relacion_division_id);
            if (rel) {
              setResolvedCoordinador(rel.nombre_coordinador || '');
              setResolvedDivision(rel.nombre_division || '');
              loadForm(rel.scrum_master_id);
            } else {
              loadForm();
            }
          } else {
            loadForm();
          }
        })
        .catch(() => toast({ variant: 'destructive', title: 'Error al cargar empleado' }))
        .finally(() => setLoadingEmployee(false));
    } else {
      setFormInitialized(true);
    }
  }, [id, isNew, relacionesData]);

  // Auto-fill coordinador/division display when scrumMasterId changes (after init)
  useEffect(() => {
    if (!formInitialized || !relacionesData) return;
    if (!scrumMasterId || scrumMasterId === 'none') {
      setResolvedCoordinador('');
      setResolvedDivision('');
      return;
    }
    const rel = relacionesData.find((r: any) => r.scrum_master_id === scrumMasterId);
    if (rel) {
      setResolvedCoordinador(rel.nombre_coordinador || '');
      setResolvedDivision(rel.nombre_division || '');
    }
  }, [scrumMasterId, relacionesData, formInitialized]);

  const onSubmit = async (data: EmployeeFormData) => {
    const smId = data.scrumMasterId && data.scrumMasterId !== 'none' ? data.scrumMasterId : null;
    const relacion = smId && relacionesData
      ? relacionesData.find((r: any) => r.scrum_master_id === smId)
      : null;

    const payload: any = {
      apellidos_nombres: data.apellidosNombres,
      dni: data.dni,
      orden: data.orden || null,
      email: data.email || null,
      telefono: data.telefono || null,
      activo: data.activo,
      proyecto_id: data.proyectoId && data.proyectoId !== 'none' ? data.proyectoId : null,
      sede_id: data.sedeId && data.sedeId !== 'none' ? data.sedeId : null,
      modalidad_id: data.modalidadId && data.modalidadId !== 'none' ? data.modalidadId : null,
      tipo_contrato_id: data.tipoContratoId && data.tipoContratoId !== 'none' ? data.tipoContratoId : null,
      dtt_id: data.dttId && data.dttId !== 'none' ? data.dttId : null,
      relacion_division_id: relacion ? relacion.id : null,
    };

    try {
      if (isNew) {
        await api.createEmpleado(payload);
      } else {
        await api.updateEmpleado(id, payload);
      }
      toast({ title: `Empleado ${isNew ? 'creado' : 'actualizado'}`, description: `${data.apellidosNombres} guardado exitosamente.` });
      if (isNew) router.push('/admin/employees');
      else router.back();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error al guardar', description: error?.message || 'Hubo un problema.' });
    }
  };

  if (loadingEmployee) {
    return <div className="flex min-h-screen items-center justify-center"><p>Cargando datos...</p></div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver a la lista
      </Button>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>{isNew ? 'Añadir Nuevo Empleado' : 'Editar Empleado'}</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="apellidosNombres">Apellidos y Nombres</Label>
              <Controller name="apellidosNombres" control={control}
                render={({ field }) => <Input id="apellidosNombres" {...field} />} />
              {errors.apellidosNombres && <p className="text-sm text-destructive">{errors.apellidosNombres.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dni">DNI</Label>
              <Controller name="dni" control={control}
                render={({ field }) => <Input id="dni" {...field} disabled={!isNew} />} />
              {errors.dni && <p className="text-sm text-destructive">{errors.dni.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="orden">Orden</Label>
              <Controller name="orden" control={control}
                render={({ field }) => <Input id="orden" {...field} />} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Controller name="email" control={control}
                render={({ field }) => <Input id="email" type="email" {...field} />} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Controller name="telefono" control={control}
                render={({ field }) => <Input id="telefono" {...field} />} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dttId">DTT</Label>
              <Controller name="dttId" control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar DTT..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin DTT</SelectItem>
                      {(dttsData || []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.nombre_dtt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proyectoId">Proyecto</Label>
              <Controller name="proyectoId" control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar proyecto..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin Proyecto</SelectItem>
                      {(proyectosData || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.codigo_proyecto} - {p.nombre_proyecto}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sedeId">Sede</Label>
              <Controller name="sedeId" control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar sede..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin Sede</SelectItem>
                      {(sedesData || []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nombre_sede}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modalidadId">Modalidad</Label>
              <Controller name="modalidadId" control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar modalidad..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin Modalidad</SelectItem>
                      {(modalidadesData || []).map((m: any) => <SelectItem key={m.id} value={m.id}>{m.nombre_modalidad}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipoContratoId">Tipo de Contrato</Label>
              <Controller name="tipoContratoId" control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar tipo de contrato..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin Tipo de Contrato</SelectItem>
                      {(tiposContratoData || []).map((t: any) => <SelectItem key={t.id} value={t.id}>{t.tipo_contrato}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scrumMasterId">Scrum Master</Label>
              <Controller name="scrumMasterId" control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar Scrum Master..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin Scrum Master</SelectItem>
                      {(scrumMastersData || []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nombre_scrum_master}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
            </div>

            <div className="space-y-2">
              <Label>Coordinador</Label>
              <Input value={resolvedCoordinador || 'Se asigna por Scrum Master'} disabled className="text-muted-foreground" />
            </div>

            <div className="space-y-2">
              <Label>División</Label>
              <Input value={resolvedDivision || 'Se asigna por Scrum Master'} disabled className="text-muted-foreground" />
            </div>

            <div className="flex items-center space-x-2">
              <Controller name="activo" control={control}
                render={({ field }) => <Switch id="activo" checked={field.value} onCheckedChange={field.onChange} />} />
              <Label htmlFor="activo">Activo</Label>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
