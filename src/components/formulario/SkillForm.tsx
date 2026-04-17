'use client';

import { useState } from 'react';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search } from 'lucide-react';
import { SkillMatrix } from './SkillMatrix';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Textarea } from '../ui/textarea';

const skillLevels = ['DESCONOCE', 'BÁSICO', 'INTERMEDIO', 'AVANZADO'] as const;
const skillLevelsTuple: [string, ...string[]] = [...skillLevels];

const createSkillSchema = (keys: string[]) => {
  return z.object(
    keys.reduce((acc, key) => {
      acc[key] = z.enum(skillLevelsTuple);
      return acc;
    }, {} as Record<string, z.ZodEnum<[string, ...string[]]>>)
  );
};

const frontendSkills = ['React', 'Angular', 'Vue.js', 'Next.js', 'Vite', 'HTML/CSS', 'JavaScript', 'TypeScript', 'TailwindCSS', 'Bootstrap', 'Material UI / NextUI / Otras librerías UI', 'Redux / Pinia / Context API', 'NPM/Yarn', 'Testing (Jest/Vitest)'];
const backendSkills = ['JavaScript/Node.js', 'TypeScript', 'Python', 'Java', 'PHP', 'NestJS', 'Express', 'Django', 'Laravel', 'ASP.NET Core', 'Prisma / TypeORM / Sequelize', 'Entity Framework', 'REST APIs', 'GraphQL', 'JWT / OAuth / Auth Libraries'];
const databaseSkills = ['PostgreSQL', 'MySQL', 'SQL Server', 'Oracle', 'MongoDB', 'Firebase / Firestore', 'Redis', 'SQL (Queries, Joins, Procedimientos)', 'Diseño de Bases de Datos (Normalización, ER)'];
const devopsSkills = ['Git / GitHub / GitLab', 'Docker', 'CI/CD (GitHub Actions/Jenkins)', 'AWS / Azure / Google Cloud', 'Testing (Jest/Vitest/Postman)'];

const formSchema = z.object({
  apellidosNombres: z.string(),
  dni: z.string().length(8, 'DNI debe tener 8 dígitos'),
  edad: z.number({ coerce: true }).min(18, 'Debe ser mayor de edad'),
  correoPersonal: z.string().email('Correo personal inválido'),
  gradoInstruccion: z.string(),
  gradoInstruccionOtro: z.string().optional(),
  cargo: z.string(),
  cargoOtro: z.string().optional(),
  añosExperiencia: z.string().min(1, 'Años de experiencia requeridos'),
  frontend: createSkillSchema(frontendSkills),
  backend: createSkillSchema(backendSkills),
  databases: createSkillSchema(databaseSkills),
  devops: createSkillSchema(devopsSkills),
  proyectosOtin: z.string().min(1, 'Este campo es requerido'),
  tecnologiasAprender: z.string().min(1, 'Este campo es requerido'),
  otrasTecnologias: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const defaultValues: FormData = {
  apellidosNombres: '', dni: '', edad: 0, correoPersonal: '',
  gradoInstruccion: '', gradoInstruccionOtro: '', cargo: '', cargoOtro: '', añosExperiencia: '',
  frontend: Object.fromEntries(frontendSkills.map(s => [s, 'DESCONOCE'])) as any,
  backend: Object.fromEntries(backendSkills.map(s => [s, 'DESCONOCE'])) as any,
  databases: Object.fromEntries(databaseSkills.map(s => [s, 'DESCONOCE'])) as any,
  devops: Object.fromEntries(devopsSkills.map(s => [s, 'DESCONOCE'])) as any,
  proyectosOtin: '', tecnologiasAprender: '', otrasTecnologias: '',
};

export function SkillForm() {
  const [dniInput, setDniInput] = useState('');
  const [employee, setEmployee] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const methods = useForm<FormData>({ resolver: zodResolver(formSchema), defaultValues });
  const { control, handleSubmit, reset, watch } = methods;

  const gradoInstruccion = watch('gradoInstruccion');
  const cargo = watch('cargo');

  const handleSearchEmployee = async () => {
    if (dniInput.length !== 8) { setError('Por favor, ingrese un DNI válido de 8 dígitos.'); return; }
    setIsLoading(true);
    setError(null);
    setEmployee(null);

    try {
      const emp = await api.getEmpleadoByDni(dniInput);
      setEmployee(emp);

      let initialData: FormData = {
        ...defaultValues,
        apellidosNombres: emp.apellidos_nombres,
        dni: emp.dni,
        edad: emp.edad || 0,
        correoPersonal: emp.correo_personal || '',
      };

      try {
        const conocimientos = await api.getConocimientos(emp.id);
        if (conocimientos) {
          initialData = {
            ...initialData,
            gradoInstruccion: conocimientos.grado_instruccion || '',
            gradoInstruccionOtro: conocimientos.grado_instruccion_otro || '',
            cargo: conocimientos.cargo || '',
            cargoOtro: conocimientos.cargo_otro || '',
            añosExperiencia: conocimientos.anos_experiencia || '',
            frontend: { ...defaultValues.frontend, ...conocimientos.frontend },
            backend: { ...defaultValues.backend, ...conocimientos.backend },
            databases: { ...defaultValues.databases, ...conocimientos.databases },
            devops: { ...defaultValues.devops, ...conocimientos.devops },
            proyectosOtin: conocimientos.proyectos_otin || '',
            tecnologiasAprender: conocimientos.tecnologias_aprender || '',
            otrasTecnologias: conocimientos.otras_tecnologias || '',
          };
        }
      } catch {
        // No existing conocimientos — use defaults
      }

      reset(initialData);
      toast({ title: 'Empleado encontrado', description: `Actualizando datos para ${emp.apellidos_nombres}.` });
    } catch {
      setError('No se encontró ningún empleado con el DNI proporcionado.');
      reset(defaultValues);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!employee) return;
    setIsSubmitting(true);
    try {
      await api.updateEmpleado(employee.id, {
        apellidos_nombres: data.apellidosNombres,
        edad: data.edad,
        correo_personal: data.correoPersonal,
      });

      await api.saveConocimientos({
        employee_id: employee.id,
        grado_instruccion: data.gradoInstruccion,
        grado_instruccion_otro: data.gradoInstruccionOtro || null,
        cargo: data.cargo,
        cargo_otro: data.cargoOtro || null,
        anos_experiencia: data.añosExperiencia,
        frontend: data.frontend,
        backend: data.backend,
        databases: data.databases,
        devops: data.devops,
        proyectos_otin: data.proyectosOtin,
        tecnologias_aprender: data.tecnologiasAprender,
        otras_tecnologias: data.otrasTecnologias || null,
      });

      toast({ title: '¡Datos actualizados!', description: 'Tu información ha sido guardada exitosamente.' });
      setEmployee(null);
      reset(defaultValues);
    } catch {
      toast({ variant: 'destructive', title: 'Error al guardar', description: 'Ocurrió un problema al guardar tus datos. Inténtalo de nuevo.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <div className="p-6">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Ingresa tu DNI"
            value={dniInput}
            onChange={(e) => setDniInput(e.target.value)}
            maxLength={8}
            className="w-full sm:w-1/3"
            disabled={isLoading}
          />
          <Button onClick={handleSearchEmployee} disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : <Search className="mr-2" />}
            Buscar y Cargar Datos
          </Button>
        </div>
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      </div>

      {employee && (
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-8">
              <section className="space-y-4">
                <h2 className="text-xl font-semibold border-b pb-2">Datos Personales y Profesionales</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre y Apellidos completos</Label>
                    <Controller name="apellidosNombres" control={control} render={({ field }) => <Input {...field} readOnly />} />
                  </div>
                  <div className="space-y-2">
                    <Label>DNI</Label>
                    <Controller name="dni" control={control} render={({ field }) => <Input {...field} readOnly />} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edad">Edad</Label>
                    <Controller name="edad" control={control} render={({ field }) => <Input id="edad" type="number" {...field} />} />
                    {methods.formState.errors.edad && <p className="text-sm text-destructive">{methods.formState.errors.edad.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="correoPersonal">Correo Personal</Label>
                    <Controller name="correoPersonal" control={control} render={({ field }) => <Input id="correoPersonal" type="email" {...field} />} />
                    {methods.formState.errors.correoPersonal && <p className="text-sm text-destructive">{methods.formState.errors.correoPersonal.message}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>¿Cuál es tu grado de instrucción?</Label>
                  <Controller name="gradoInstruccion" control={control} render={({ field }) => (
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-1">
                      {['Tecnico', 'Estudiante Universitario', 'Bachiller Universitario y/o Titulado', 'Maestria', 'Doctorado', 'Other'].map(opt => (
                        <div key={opt} className="flex items-center space-x-2">
                          <RadioGroupItem value={opt} id={`grado-${opt}`} />
                          <Label htmlFor={`grado-${opt}`}>{opt === 'Other' ? 'Otro:' : opt}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )} />
                  {gradoInstruccion === 'Other' && (
                    <Controller name="gradoInstruccionOtro" control={control} render={({ field }) => <Input {...field} placeholder="Por favor, especifica" className="mt-2" />} />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>¿Cuál es tu cargo según contrato?</Label>
                  <Controller name="cargo" control={control} render={({ field }) => (
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-1">
                      {['Programador', 'Programador Gis', 'Analista Programador', 'Administrador Web', 'Desarrollador de Base de Datos', 'Administrador de Base de Datos', 'Asistente Administrador de Base de Datos', 'Other'].map(opt => (
                        <div key={opt} className="flex items-center space-x-2">
                          <RadioGroupItem value={opt} id={`cargo-${opt}`} />
                          <Label htmlFor={`cargo-${opt}`}>{opt === 'Other' ? 'Otro:' : opt}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )} />
                  {cargo === 'Other' && (
                    <Controller name="cargoOtro" control={control} render={({ field }) => <Input {...field} placeholder="Por favor, especifica" className="mt-2" />} />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="añosExperiencia">¿Cuántos años tienes de experiencia?</Label>
                  <Controller name="añosExperiencia" control={control} render={({ field }) => <Input id="añosExperiencia" {...field} />} />
                  {methods.formState.errors.añosExperiencia && <p className="text-sm text-destructive">{methods.formState.errors.añosExperiencia.message}</p>}
                </div>
              </section>

              <Separator />

              <SkillMatrix
                title="FRONTEND"
                description="Instrucción: Marca tu nivel de conocimiento para cada tecnología"
                skillGroupName="frontend"
                skillsBySubgroup={{
                  'Frameworks y Librerías JavaScript': ['React', 'Angular', 'Vue.js', 'Next.js', 'Vite'],
                  'Lenguajes': ['HTML/CSS', 'JavaScript', 'TypeScript'],
                  'Estilos y UI': ['TailwindCSS', 'Bootstrap', 'Material UI / NextUI / Otras librerías UI'],
                  'Gestión de Estado': ['Redux / Pinia / Context API'],
                  'Herramientas': ['NPM/Yarn', 'Testing (Jest/Vitest)'],
                }}
              />

              <Separator />

              <SkillMatrix
                title="BACKEND"
                description="Instrucción: Marca tu nivel de conocimiento para cada tecnología"
                skillGroupName="backend"
                skillsBySubgroup={{
                  'Lenguajes de Programación': ['JavaScript/Node.js', 'TypeScript', 'Python', 'Java', 'PHP'],
                  'Frameworks': ['NestJS', 'Express', 'Django', 'Laravel', 'ASP.NET Core'],
                  'ORM y Acceso a Datos': ['Prisma / TypeORM / Sequelize', 'Entity Framework'],
                  'APIs y Servicios': ['REST APIs', 'GraphQL'],
                  'Autenticación y Seguridad': ['JWT / OAuth / Auth Libraries'],
                }}
              />

              <Separator />

              <SkillMatrix
                title="BASES DE DATOS"
                description="Instrucción: Marca tu nivel de conocimiento para cada tecnología"
                skillGroupName="databases"
                skillsBySubgroup={{
                  'Bases de Datos SQL (Relacionales)': ['PostgreSQL', 'MySQL', 'SQL Server', 'Oracle'],
                  'Bases de Datos NoSQL (No Relacionales)': ['MongoDB', 'Firebase / Firestore', 'Redis'],
                  'Consultas y Modelado': ['SQL (Queries, Joins, Procedimientos)', 'Diseño de Bases de Datos (Normalización, ER)'],
                }}
              />

              <Separator />

              <SkillMatrix
                title="HERRAMIENTAS Y DEVOPS"
                description="Instrucción: Marca tu nivel de conocimiento para cada tecnología"
                skillGroupName="devops"
                skillsBySubgroup={{
                  'Control de Versiones, CI/CD y Cloud': ['Git / GitHub / GitLab', 'Docker', 'CI/CD (GitHub Actions/Jenkins)', 'AWS / Azure / Google Cloud'],
                  'Testing': ['Testing (Jest/Vitest/Postman)'],
                }}
              />

              <Separator />

              <section className="space-y-4">
                <h2 className="text-xl font-semibold border-b pb-2">PREGUNTAS</h2>
                <div className="space-y-2">
                  <Label htmlFor="proyectosOtin">¿En qué proyectos de OTIN has trabajado? (menciona uno o mas)</Label>
                  <Controller name="proyectosOtin" control={control} render={({ field }) => <Textarea id="proyectosOtin" {...field} />} />
                  {methods.formState.errors.proyectosOtin && <p className="text-sm text-destructive">{methods.formState.errors.proyectosOtin.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tecnologiasAprender">¿Qué tecnologías te gustaría aprender o profundizar?</Label>
                  <Controller name="tecnologiasAprender" control={control} render={({ field }) => <Textarea id="tecnologiasAprender" {...field} />} />
                  {methods.formState.errors.tecnologiasAprender && <p className="text-sm text-destructive">{methods.formState.errors.tecnologiasAprender.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otrasTecnologias">¿Hay alguna tecnología que uses y no esté listada aquí?</Label>
                  <Controller name="otrasTecnologias" control={control} render={({ field }) => <Textarea id="otrasTecnologias" {...field} />} />
                </div>
              </section>

              <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Guardar y Enviar Mis Datos'}
              </Button>
            </CardContent>
          </form>
        </FormProvider>
      )}
    </Card>
  );
}
