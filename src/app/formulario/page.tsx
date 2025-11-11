
'use client';

import { SkillForm } from '@/components/formulario/SkillForm';

export default function FormularioPage() {
  return (
    <div className="min-h-screen bg-muted/40">
      <div className="container mx-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
           <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-primary tracking-tight">ACTUALIZACIÓN DE DATOS DE OTIN</h1>
                <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
                ¡El presente formulario se encuentra destinado a recabar información actualizada sobre sus datos personales y su trayectoria profesional, con el fin de mantener un registro completo y preciso!
                </p>
            </div>
            <SkillForm />
        </div>
      </div>
    </div>
  );
}

