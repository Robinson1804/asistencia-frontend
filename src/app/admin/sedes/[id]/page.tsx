'use client';
import { useEffect, useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

const sedeSchema = z.object({
  nombreSede: z.string().min(3, "El nombre de la sede es requerido"),
  direccion: z.string().min(3, "La dirección es requerida"),
  activo: z.boolean().default(true),
});

type SedeFormData = z.infer<typeof sedeSchema>;

export default function SedeFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === 'new';
  const { toast } = useToast();
  const [loading, setLoading] = useState(!isNew);

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SedeFormData>({
    resolver: zodResolver(sedeSchema),
    defaultValues: { nombreSede: '', direccion: '', activo: true }
  });

  useEffect(() => {
    if (!isNew) {
      apiFetch(`/api/sedes/${id}`)
        .then((s: any) => {
          if (s) reset({ nombreSede: s.nombre_sede, direccion: s.direccion, activo: s.activo });
        })
        .catch(() => toast({ variant: 'destructive', title: 'Error al cargar sede' }))
        .finally(() => setLoading(false));
    }
  }, [id, isNew]);

  const onSubmit = async (data: SedeFormData) => {
    const payload = { nombre_sede: data.nombreSede, direccion: data.direccion, activo: data.activo };
    try {
      if (isNew) {
        await api.createSede(payload);
      } else {
        await api.updateSede(id, payload);
      }
      toast({ title: `Sede ${isNew ? 'creada' : 'actualizada'}`, description: `${data.nombreSede} guardada exitosamente.` });
      router.push('/admin/sedes');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error al guardar', description: error?.message || 'Hubo un problema.' });
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><p>Cargando datos de la sede...</p></div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver a la lista
      </Button>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{isNew ? 'Añadir Nueva Sede' : 'Editar Sede'}</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label htmlFor="nombreSede">Nombre de la Sede</Label>
              <Controller name="nombreSede" control={control}
                render={({ field }) => <Input id="nombreSede" {...field} />} />
              {errors.nombreSede && <p className="text-sm text-destructive">{errors.nombreSede.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Controller name="direccion" control={control}
                render={({ field }) => <Input id="direccion" {...field} />} />
              {errors.direccion && <p className="text-sm text-destructive">{errors.direccion.message}</p>}
            </div>

            <div className="flex items-center space-x-2">
              <Controller name="activo" control={control}
                render={({ field }) => <Switch id="activo" checked={field.value} onCheckedChange={field.onChange} />} />
              <Label htmlFor="activo">Activa</Label>
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
