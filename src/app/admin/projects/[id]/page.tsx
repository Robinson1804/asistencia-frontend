
'use client';
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import type { Proyecto } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

const projectSchema = z.object({
  codigoProyecto: z.string().min(1, "El código es requerido"),
  nombreProyecto: z.string().min(3, "El nombre es requerido"),
  descripcion: z.string().optional(),
  activo: z.boolean().default(true),
});

type ProjectFormData = z.infer<typeof projectSchema>;

export default function ProjectFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === 'new';

  const firestore = useFirestore();
  const { toast } = useToast();

  const projectRef = useMemoFirebase(() => {
    if (!firestore || isNew) return null;
    return doc(firestore, 'proyectos', id);
  }, [firestore, id, isNew]);

  const { data: projectData, isLoading: loadingProject } = useDoc<Proyecto>(projectRef);

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      codigoProyecto: '',
      nombreProyecto: '',
      descripcion: '',
      activo: true,
    }
  });

  useEffect(() => {
    if (projectData) {
      reset({
        codigoProyecto: projectData.codigoProyecto,
        nombreProyecto: projectData.nombreProyecto,
        descripcion: projectData.descripcion || '',
        activo: projectData.activo,
      });
    }
  }, [projectData, reset]);

  const onSubmit = async (data: ProjectFormData) => {
    if (!firestore) return;
    
    const docId = isNew ? data.codigoProyecto : id;

    const projectPayload = {
      ...data,
      updatedAt: new Date(),
      ...(isNew && { createdAt: new Date() })
    };

    try {
      const docRef = doc(firestore, 'proyectos', docId);
      await setDoc(docRef, projectPayload, { merge: true });
      toast({
        title: `Proyecto ${isNew ? 'creado' : 'actualizado'}`,
        description: `${data.nombreProyecto} ha sido guardado exitosamente.`,
      });
      router.push('/admin/projects');
    } catch (error) {
      console.error("Error saving project:", error);
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: 'Hubo un problema al guardar el proyecto.',
      });
    }
  };

  if (loadingProject) {
    return <div className="flex min-h-screen items-center justify-center"><p>Cargando datos del proyecto...</p></div>;
  }
  
  if (!isNew && !projectData) {
      return <div className="flex min-h-screen items-center justify-center"><p>Proyecto no encontrado.</p></div>
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
       <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver a la lista
      </Button>

      <Card className="max-w-2xl mx-auto">
         <CardHeader>
          <CardTitle>{isNew ? 'Añadir Nuevo Proyecto' : 'Editar Proyecto'}</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <Label htmlFor="codigoProyecto">Código del Proyecto</Label>
                <Controller
                  name="codigoProyecto"
                  control={control}
                  render={({ field }) => <Input id="codigoProyecto" {...field} disabled={!isNew} />}
                />
                {errors.codigoProyecto && <p className="text-sm text-destructive">{errors.codigoProyecto.message}</p>}
              </div>

             <div className="space-y-2">
                <Label htmlFor="nombreProyecto">Nombre del Proyecto</Label>
                <Controller
                  name="nombreProyecto"
                  control={control}
                  render={({ field }) => <Input id="nombreProyecto" {...field} />}
                />
                {errors.nombreProyecto && <p className="text-sm text-destructive">{errors.nombreProyecto.message}</p>}
              </div>

               <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Controller
                  name="descripcion"
                  control={control}
                  render={({ field }) => <Textarea id="descripcion" {...field} />}
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
