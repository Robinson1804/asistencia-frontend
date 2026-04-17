'use client';
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';

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
  const { toast } = useToast();
  const [loading, setLoading] = useState(!isNew);

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: { codigoProyecto: '', nombreProyecto: '', descripcion: '', activo: true }
  });

  useEffect(() => {
    if (!isNew) {
      apiFetch(`/api/proyectos/${id}`)
        .then((p: any) => {
          if (p) reset({ codigoProyecto: p.codigo_proyecto, nombreProyecto: p.nombre_proyecto, descripcion: p.descripcion || '', activo: p.activo });
        })
        .catch(() => toast({ variant: 'destructive', title: 'Error al cargar proyecto' }))
        .finally(() => setLoading(false));
    }
  }, [id, isNew]);

  const onSubmit = async (data: ProjectFormData) => {
    const payload = { codigo_proyecto: data.codigoProyecto, nombre_proyecto: data.nombreProyecto, descripcion: data.descripcion || null, activo: data.activo };
    try {
      if (isNew) {
        await api.createProyecto(payload);
      } else {
        await api.updateProyecto(id, payload);
      }
      toast({ title: `Proyecto ${isNew ? 'creado' : 'actualizado'}`, description: `${data.nombreProyecto} guardado exitosamente.` });
      router.push('/admin/projects');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error al guardar', description: error?.message || 'Hubo un problema.' });
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><p>Cargando datos del proyecto...</p></div>;
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
              <Controller name="codigoProyecto" control={control}
                render={({ field }) => <Input id="codigoProyecto" {...field} disabled={!isNew} />} />
              {errors.codigoProyecto && <p className="text-sm text-destructive">{errors.codigoProyecto.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombreProyecto">Nombre del Proyecto</Label>
              <Controller name="nombreProyecto" control={control}
                render={({ field }) => <Input id="nombreProyecto" {...field} />} />
              {errors.nombreProyecto && <p className="text-sm text-destructive">{errors.nombreProyecto.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Controller name="descripcion" control={control}
                render={({ field }) => <Textarea id="descripcion" {...field} />} />
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
