
'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, setDoc, collection } from 'firebase/firestore';
import type { Employee, Proyecto, Sede, Modalidad, TipoContrato, Dtt, Coordinador, Division, ScrumMaster, RelacionDivision } from '@/types';
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
  coordinadorId: z.string().optional(),
  divisionId: z.string().optional(),
  scrumMasterId: z.string().optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;


export default function EmployeeFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === 'new';

  const firestore = useFirestore();
  const { toast } = useToast();
  const [formInitialized, setFormInitialized] = useState(false);

  const employeeRef = useMemoFirebase(() => {
    if (!firestore || isNew) return null;
    return doc(firestore, 'empleados', id);
  }, [firestore, id, isNew]);

  const { data: employeeData, isLoading: loadingEmployee } = useDoc<Employee>(employeeRef);

  const { data: projectsData, isLoading: loadingProjects } = useCollection<Proyecto>(
    useMemoFirebase(() => firestore ? collection(firestore, 'proyectos') : null, [firestore])
  );
  const { data: sedesData, isLoading: loadingSedes } = useCollection<Sede>(
    useMemoFirebase(() => firestore ? collection(firestore, 'sedes') : null, [firestore])
  );
  const { data: modalidadesData, isLoading: loadingModalidades } = useCollection<Modalidad>(
     useMemoFirebase(() => firestore ? collection(firestore, 'modalidades') : null, [firestore])
  );
  const { data: tiposContratoData, isLoading: loadingTiposContrato } = useCollection<TipoContrato>(
     useMemoFirebase(() => firestore ? collection(firestore, 'tiposContrato') : null, [firestore])
  );
  const { data: dttsData, isLoading: loadingDtts } = useCollection<Dtt>(
     useMemoFirebase(() => firestore ? collection(firestore, 'dtt') : null, [firestore])
  );
  const { data: coordinadoresData, isLoading: loadingCoordinadores } = useCollection<Coordinador>(
    useMemoFirebase(() => firestore ? collection(firestore, 'coordinadoresDivision') : null, [firestore])
  );
  const { data: divisionesData, isLoading: loadingDivisiones } = useCollection<Division>(
    useMemoFirebase(() => firestore ? collection(firestore, 'divisiones') : null, [firestore])
  );
  const { data: scrumMastersData, isLoading: loadingScrumMasters } = useCollection<ScrumMaster>(
    useMemoFirebase(() => firestore ? collection(firestore, 'scrumMasters') : null, [firestore])
  );
  const { data: relacionesData, isLoading: loadingRelaciones } = useCollection<RelacionDivision>(
    useMemoFirebase(() => firestore ? collection(firestore, 'relacionesDivision') : null, [firestore])
  );


  const { control, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      apellidosNombres: '',
      dni: '',
      orden: '',
      email: '',
      telefono: '',
      activo: true,
      proyectoId: undefined,
      sedeId: undefined,
      modalidadId: undefined,
      tipoContratoId: undefined,
      dttId: undefined,
      coordinadorId: undefined,
      divisionId: undefined,
      scrumMasterId: undefined,
    }
  });

  const scrumMasterId = watch('scrumMasterId');

  // Reset form initialization when employee ID changes
  useEffect(() => {
    console.log('🔄 Employee ID changed to:', id);
    setFormInitialized(false);
  }, [id]);

  // Only auto-fill coordinador and division after form is initialized
  // to prevent overwriting loaded values during initial form population
  useEffect(() => {
    // Skip this effect during initial form load
    if (!formInitialized) return;

    if (scrumMasterId && relacionesData) {
      if (scrumMasterId === 'none') {
        setValue('coordinadorId', undefined);
        setValue('divisionId', undefined);
        return;
      }
      const relacion = relacionesData.find(r => r.scrumMasterId === scrumMasterId);
      if (relacion) {
        setValue('coordinadorId', relacion.coordinadorId, { shouldValidate: true });
        setValue('divisionId', relacion.divisionId, { shouldValidate: true });
      }
    } else if (!scrumMasterId) {
        setValue('coordinadorId', undefined);
        setValue('divisionId', undefined);
    }
  }, [scrumMasterId, setValue, relacionesData, formInitialized]);


  // Reset form immediately when employee data loads
  useEffect(() => {
    if (employeeData && !formInitialized) {
      console.log('📝 Employee data loaded:', employeeData);
      console.log('🔑 IDs encontrados:', {
        proyectoId: employeeData.proyectoId,
        sedeId: employeeData.sedeId,
        modalidadId: employeeData.modalidadId,
        tipoContratoId: employeeData.tipoContratoId,
        dttId: employeeData.dttId,
        coordinadorId: employeeData.coordinadorId,
        divisionId: employeeData.divisionId,
        scrumMasterId: employeeData.scrumMasterId,
      });

      const formData = {
        apellidosNombres: employeeData.apellidosNombres || '',
        dni: employeeData.dni || '',
        orden: employeeData.orden || '',
        email: employeeData.email || '',
        telefono: employeeData.telefono || '',
        activo: employeeData.activo ?? true,
        proyectoId: employeeData.proyectoId || undefined,
        sedeId: employeeData.sedeId || undefined,
        modalidadId: employeeData.modalidadId || undefined,
        tipoContratoId: employeeData.tipoContratoId || undefined,
        dttId: employeeData.dttId || undefined,
        coordinadorId: employeeData.coordinadorId || undefined,
        divisionId: employeeData.divisionId || undefined,
        scrumMasterId: employeeData.scrumMasterId || undefined,
      };

      console.log('✅ Reseteando formulario con:', formData);

      // Reset with keepDefaultValues: false to ensure complete reset
      reset(formData, { keepDefaultValues: false });

      // Also set values individually to ensure they're applied
      setTimeout(() => {
        if (employeeData.proyectoId) setValue('proyectoId', employeeData.proyectoId);
        if (employeeData.sedeId) setValue('sedeId', employeeData.sedeId);
        if (employeeData.modalidadId) setValue('modalidadId', employeeData.modalidadId);
        if (employeeData.tipoContratoId) setValue('tipoContratoId', employeeData.tipoContratoId);
        if (employeeData.dttId) setValue('dttId', employeeData.dttId);
        if (employeeData.scrumMasterId) setValue('scrumMasterId', employeeData.scrumMasterId);
        if (employeeData.coordinadorId) setValue('coordinadorId', employeeData.coordinadorId);
        if (employeeData.divisionId) setValue('divisionId', employeeData.divisionId);
        console.log('✅ Valores individuales aplicados');
      }, 100);

      setFormInitialized(true);
    }
  }, [employeeData, formInitialized, reset, setValue]);


  const onSubmit = async (data: EmployeeFormData) => {
    if (!firestore) return;

    console.log('💾 Guardando empleado con datos:', data);

    const project = projectsData?.find(p => p.id === data.proyectoId);
    const sede = sedesData?.find(s => s.id === data.sedeId);
    const modalidad = modalidadesData?.find(m => m.id === data.modalidadId);
    const tipoContrato = tiposContratoData?.find(t => t.id === data.tipoContratoId);
    const dtt = dttsData?.find(d => d.id === data.dttId);
    const coordinador = coordinadoresData?.find(c => c.id === data.coordinadorId);
    const division = divisionesData?.find(d => d.id === data.divisionId);
    const scrumMaster = scrumMastersData?.find(s => s.id === data.scrumMasterId);

    console.log('🔍 Datos encontrados:', {
      project,
      sede,
      modalidad,
      tipoContrato,
      dtt,
      coordinador,
      division,
      scrumMaster
    });

    const employeePayload = {
      apellidosNombres: data.apellidosNombres,
      dni: data.dni,
      orden: data.orden || '',
      email: data.email || '',
      telefono: data.telefono || '',
      activo: data.activo,
      // Nested objects
      proyecto: project ? { nombre: project.nombreProyecto, codigo: project.codigoProyecto, descripcion: project.descripcion } : null,
      sede: sede ? { nombre: sede.nombreSede, direccion: sede.direccion } : null,
      modalidad: modalidad ? { nombre: modalidad.nombreModalidad, descripcion: modalidad.descripcion } : null,
      tipoContrato: tipoContrato ? { tipo: tipoContrato.tipoContrato, descripcion: tipoContrato.descripcion } : null,
      dtt: dtt ? { nombre: dtt.nombreDTT, codigo: dtt.codigoDTT, descripcion: dtt.descripcion } : null,
      coordinador: coordinador ? { nombre: coordinador.nombreCoordinador } : null,
      division: division ? { nombre: division.nombreDivision } : null,
      scrumMaster: scrumMaster ? { nombre: scrumMaster.nombreScrumMaster } : null,
      // Foreign keys
      proyectoId: data.proyectoId || null,
      sedeId: data.sedeId || null,
      modalidadId: data.modalidadId || null,
      tipoContratoId: data.tipoContratoId || null,
      dttId: data.dttId || null,
      coordinadorId: data.coordinadorId || null,
      divisionId: data.divisionId || null,
      scrumMasterId: data.scrumMasterId === 'none' ? null : (data.scrumMasterId || null),
      updatedAt: new Date(),
      ...(isNew && { createdAt: new Date() })
    };

    console.log('📦 Payload a guardar:', employeePayload);

    try {
      const docRef = doc(firestore, 'empleados', data.dni);
      console.log('🚀 Guardando en Firestore...');
      await setDoc(docRef, employeePayload, { merge: true });
      console.log('✅ Guardado exitoso!');
      toast({
        title: `Empleado ${isNew ? 'creado' : 'actualizado'}`,
        description: `${data.apellidosNombres} ha sido guardado exitosamente.`,
      });
      // Use router.back() to preserve filters instead of router.push()
      if (isNew) {
        router.push('/admin/employees');
      } else {
        router.back();
      }
    } catch (error: any) {
      console.error("❌ Error completo:", error);
      console.error("Código de error:", error?.code);
      console.error("Mensaje:", error?.message);
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: error?.message || 'Hubo un problema al guardar el empleado.',
      });
    }
  };

  const isLoadingData = loadingEmployee || loadingProjects || loadingSedes || loadingModalidades || loadingTiposContrato || loadingDtts || loadingCoordinadores || loadingDivisiones || loadingScrumMasters || loadingRelaciones;

  if (isLoadingData) {
    return <div className="flex min-h-screen items-center justify-center"><p>Cargando datos...</p></div>;
  }
  
  if (!isNew && !employeeData) {
      return <div className="flex min-h-screen items-center justify-center"><p>Empleado no encontrado.</p></div>
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
        <form key={`employee-form-${id}`} onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="apellidosNombres">Apellidos y Nombres</Label>
                <Controller
                  name="apellidosNombres"
                  control={control}
                  render={({ field }) => <Input id="apellidosNombres" {...field} />}
                />
                {errors.apellidosNombres && <p className="text-sm text-destructive">{errors.apellidosNombres.message}</p>}
              </div>

             <div className="space-y-2">
                <Label htmlFor="dni">DNI</Label>
                <Controller
                  name="dni"
                  control={control}
                  render={({ field }) => <Input id="dni" {...field} disabled={!isNew} />}
                />
                {errors.dni && <p className="text-sm text-destructive">{errors.dni.message}</p>}
              </div>

               <div className="space-y-2">
                <Label htmlFor="orden">Orden</Label>
                <Controller
                  name="orden"
                  control={control}
                  render={({ field }) => <Input id="orden" {...field} />}
                />
              </div>

               <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => <Input id="email" type="email" {...field} />}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>

               <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Controller
                  name="telefono"
                  control={control}
                  render={({ field }) => <Input id="telefono" {...field} />}
                />
              </div>
              
            <div className="space-y-2">
                <Label htmlFor="dttId">DTT</Label>
                <Controller
                    name="dttId"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar DTT..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Sin DTT</SelectItem>
                                {(dttsData || []).map(d => <SelectItem key={d.id} value={d.id}>{d.nombreDTT}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="proyectoId">Proyecto</Label>
                <Controller
                    name="proyectoId"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar proyecto..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Sin Proyecto</SelectItem>
                                {(projectsData || []).map(p => <SelectItem key={p.id} value={p.id}>{p.codigoProyecto} - {p.nombreProyecto}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="sedeId">Sede</Label>
                 <Controller
                    name="sedeId"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar sede..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Sin Sede</SelectItem>
                                {(sedesData || []).map(s => <SelectItem key={s.id} value={s.id}>{s.nombreSede}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>

             <div className="space-y-2">
                <Label htmlFor="modalidadId">Modalidad</Label>
                 <Controller
                    name="modalidadId"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar modalidad..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Sin Modalidad</SelectItem>
                                {(modalidadesData || []).map(m => <SelectItem key={m.id} value={m.id}>{m.nombreModalidad}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="tipoContratoId">Tipo de Contrato</Label>
                 <Controller
                    name="tipoContratoId"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar tipo de contrato..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Sin Tipo de Contrato</SelectItem>
                                {(tiposContratoData || []).map(t => <SelectItem key={t.id} value={t.id}>{t.tipoContrato}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>

             <div className="space-y-2">
                <Label htmlFor="scrumMasterId">Scrum Master</Label>
                 <Controller
                    name="scrumMasterId"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar Scrum Master..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Sin Scrum Master</SelectItem>
                                {(scrumMastersData || []).map(s => <SelectItem key={s.id} value={s.id}>{s.nombreScrumMaster}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="coordinadorId">Coordinador</Label>
                 <Controller
                    name="coordinadorId"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ''} disabled>
                            <SelectTrigger><SelectValue placeholder="Se asigna automáticamente..." /></SelectTrigger>
                            <SelectContent>
                                {(coordinadoresData || []).map(c => <SelectItem key={c.id} value={c.id}>{c.nombreCoordinador}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="divisionId">División</Label>
                 <Controller
                    name="divisionId"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ''} disabled>
                            <SelectTrigger><SelectValue placeholder="Se asigna automáticamente..." /></SelectTrigger>
                            <SelectContent>
                                {(divisionesData || []).map(d => <SelectItem key={d.id} value={d.id}>{d.nombreDivision}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>

              <div className="flex items-center space-x-2">
                <Controller
                    name="activo"
                    control={control}
                    render={({ field }) => <Switch id="activo" checked={field.value} onCheckedChange={field.onChange} />}
                />
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

    