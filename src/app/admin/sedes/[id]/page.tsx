
'use client';
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import type { Sede } from '@/types';
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

  const firestore = useFirestore();
  const { toast } = useToast();

  const sedeRef = useMemoFirebase(() => {
    if (!firestore || isNew) return null;
    return doc(firestore, 'sedes', id);
  }, [firestore, id, isNew]);

  const { data: sedeData, isLoading: loadingSede } = useDoc<Sede>(sedeRef);

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SedeFormData>({
    resolver: zodResolver(sedeSchema),
    defaultValues: {
      nombreSede: '',
      direccion: '',
      activo: true,
    }
  });

  useEffect(() => {
    if (sedeData) {
      reset({
        nombreSede: sedeData.nombreSede,
        direccion: sedeData.direccion,
        activo: sedeData.activo,
      });
    }
  }, [sedeData, reset]);

  const onSubmit = async (data: SedeFormData) => {
    if (!firestore) return;

    const sedePayload = {
      ...data,
      updatedAt: new Date(),
    };

    try {
      let docRef;
      if (isNew) {
        docRef = await addDoc(collection(firestore, 'sedes'), { ...sedePayload, createdAt: new Date() });
      } else {
        docRef = doc(firestore, 'sedes', id);
        await setDoc(docRef, sedePayload, { merge: true });
      }
      
      toast({
        title: `Sede ${isNew ? 'creada' : 'actualizada'}`,
        description: `${data.nombreSede} ha sido guardada exitosamente.`,
      });
      router.push('/admin/sedes');
    } catch (error) {
      console.error("Error saving sede:", error);
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: 'Hubo un problema al guardar la sede.',
      });
    }
  };

  if (loadingSede) {
    return <div className="flex min-h-screen items-center justify-center"><p>Cargando datos de la sede...</p></div>;
  }
  
  if (!isNew && !sedeData) {
      return <div className="flex min-h-screen items-center justify-center"><p>Sede no encontrada.</p></div>
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
                <Controller
                  name="nombreSede"
                  control={control}
                  render={({ field }) => <Input id="nombreSede" {...field} />}
                />
                {errors.nombreSede && <p className="text-sm text-destructive">{errors.nombreSede.message}</p>}
              </div>

             <div className="space-y-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Controller
                  name="direccion"
                  control={control}
                  render={({ field }) => <Input id="direccion" {...field} />}
                />
                {errors.direccion && <p className="text-sm text-destructive">{errors.direccion.message}</p>}
              </div>
              
              <div className="flex items-center space-x-2">
                <Controller
                    name="activo"
                    control={control}
                    render={({ field }) => <Switch id="activo" checked={field.value} onCheckedChange={field.onChange} />}
                />
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
