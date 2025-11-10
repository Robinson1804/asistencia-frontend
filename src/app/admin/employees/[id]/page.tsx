
'use client';
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, setDoc, collection } from 'firebase/firestore';
import type { Employee, Proyecto, Sede, Modalidad, TipoContrato, Dtt, Coordinador, Division, ScrumMaster } from '@/types';
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
     useMemoFirebase(() => firestore ? collection(firestore, 'dtts') : null, [firestore])
  );
  const { data: coordinadoresData, isLoading: loadingCoordinadores } = useCollection<Coordinador>(
    useMemoFirebase(() => firestore ? collection(firestore, 'coordinadores') : null, [firestore])
  );
  const { data: divisionesData, isLoading: loadingDivisiones } = useCollection<Division>(
    useMemoFirebase(() => firestore ? collection(firestore, 'divisiones') : null, [firestore])
  );
  const { data: scrumMastersData, isLoading: loadingScrumMasters } = useCollection<ScrumMaster>(
    useMemoFirebase(() => firestore ? collection(firestore, 'scrumMasters') : null, [firestore])
  );


  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      apellidosNombres: '',
      dni: '',
      orden: '',
      email: '',
      telefono: '',
      activo: true,
    }
  });

  useEffect(() => {
    if (employeeData) {
      reset({
        apellidosNombres: employeeData.apellidosNombres,
        dni: employeeData.dni,
        orden: employeeData.orden,
        email: employeeData.email || '',
        telefono: employeeData.telefono || '',
        activo: employeeData.activo,
        proyectoId: employeeData.proyecto?.codigo,
        sedeId: employeeData.sede?.nombre,
        modalidadId: employeeData.modalidad?.nombre,
        tipoContratoId: employeeData.tipoContrato?.tipo,
        dttId: employeeData.dtt?.codigo,
        coordinadorId: employeeData.coordinador?.nombre,
        divisionId: employeeData.division?.nombre,
        scrumMasterId: employeeData.scrumMaster?.nombre,
      });
    }
  }, [employeeData, reset]);

  const onSubmit = async (data: EmployeeFormData) => {
    if (!firestore) return;
    
    const project = projectsData?.find(p => p.CodigoProyecto === data.proyectoId);
    const sede = sedesData?.find(s => s.nombreSede === data.sedeId);
    const modalidad = modalidadesData?.find(m => m.nombreModalidad === data.modalidadId);
    const tipoContrato = tiposContratoData?.find(t => t.tipoContrato === data.tipoContratoId);
    const dtt = dttsData?.find(d => d.codigoDTT === data.dttId);
    const coordinador = coordinadoresData?.find(c => c.nombreCoordinador === data.coordinadorId);
    const division = divisionesData?.find(d => d.nombreDivision === data.divisionId);
    const scrumMaster = scrumMastersData?.find(s => s.nombreScrumMaster === data.scrumMasterId);


    const employeePayload = {
      apellidosNombres: data.apellidosNombres,
      dni: data.dni,
      orden: data.orden,
      email: data.email,
      telefono: data.telefono,
      activo: data.activo,
      proyecto: project ? { nombre: project.NombreProyecto, codigo: project.CodigoProyecto, descripcion: project.Descripcion } : null,
      sede: sede ? { nombre: sede.nombreSede, direccion: sede.direccion } : null,
      modalidad: modalidad ? { nombre: modalidad.nombreModalidad, descripcion: modalidad.descripcion } : null,
      tipoContrato: tipoContrato ? { tipo: tipoContrato.tipoContrato, descripcion: tipoContrato.descripcion } : null,
      dtt: dtt ? { nombre: dtt.nombreDTT, codigo: dtt.codigoDTT, descripcion: dtt.descripcion } : null,
      coordinador: coordinador ? { nombre: coordinador.nombreCoordinador } : null,
      division: division ? { nombre: division.nombreDivision } : null,
      scrumMaster: scrumMaster ? { nombre: scrumMaster.nombreScrumMaster } : null,
      updatedAt: new Date(),
      ...(isNew && { createdAt: new Date() })
    };

    try {
      const docRef = doc(firestore, 'empleados', data.dni);
      await setDoc(docRef, employeePayload, { merge: true });
      toast({
        title: `Empleado ${isNew ? 'creado' : 'actualizado'}`,
        description: `${data.apellidosNombres} ha sido guardado exitosamente.`,
      });
      router.push('/admin/employees');
    } catch (error) {
      console.error("Error saving employee:", error);
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: 'Hubo un problema al guardar el empleado.',
      });
    }
  };

  if (loadingEmployee || loadingProjects || loadingSedes || loadingModalidades || loadingTiposContrato || loadingDtts || loadingCoordinadores || loadingDivisiones || loadingScrumMasters) {
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
        <form onSubmit={handleSubmit(onSubmit)}>
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
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar DTT..." /></SelectTrigger>
                            <SelectContent>
                                {dttsData?.map(d => <SelectItem key={d.id} value={d.codigoDTT}>{d.nombreDTT}</SelectItem>)}
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
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar proyecto..." /></SelectTrigger>
                            <SelectContent>
                                {projectsData?.map(p => <SelectItem key={p.id} value={p.CodigoProyecto}>{p.NombreProyecto}</SelectItem>)}
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
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar sede..." /></SelectTrigger>
                            <SelectContent>
                                {sedesData?.map(s => <SelectItem key={s.id} value={s.nombreSede}>{s.nombreSede}</SelectItem>)}
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
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar modalidad..." /></SelectTrigger>
                            <SelectContent>
                                {modalidadesData?.map(m => <SelectItem key={m.id} value={m.nombreModalidad}>{m.nombreModalidad}</SelectItem>)}
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
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar tipo de contrato..." /></SelectTrigger>
                            <SelectContent>
                                {tiposContratoData?.map(t => <SelectItem key={t.id} value={t.tipoContrato}>{t.tipoContrato}</SelectItem>)}
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
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar coordinador..." /></SelectTrigger>
                            <SelectContent>
                                {coordinadoresData?.map(c => <SelectItem key={c.id} value={c.nombreCoordinador}>{c.nombreCoordinador}</SelectItem>)}
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
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar división..." /></SelectTrigger>
                            <SelectContent>
                                {divisionesData?.map(d => <SelectItem key={d.id} value={d.nombreDivision}>{d.nombreDivision}</SelectItem>)}
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
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar Scrum Master..." /></SelectTrigger>
                            <SelectContent>
                                {scrumMastersData?.map(s => <SelectItem key={s.id} value={s.nombreScrumMaster}>{s.nombreScrumMaster}</SelectItem>)}
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
