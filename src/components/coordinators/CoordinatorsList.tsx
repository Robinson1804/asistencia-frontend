"use client";

import { useCollection, useFirestore } from "@/firebase";
import type { Coordinador } from "@/types";
import { collection } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserSquare } from "lucide-react";

export function CoordinatorsList() {
  const firestore = useFirestore();
  const { data: coordinadores = [], loading } = useCollection<Coordinador>(
    firestore ? collection(firestore, "coordinadoresDivision") : null
  );

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6 font-headline text-center md:text-left">
        Lista de Coordinadores
      </h2>
      {loading && <p>Cargando coordinadores...</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {coordinadores.map((coordinador) => (
          <Card key={coordinador.id} className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {coordinador.nombreCoordinador}
              </CardTitle>
              <UserSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                {coordinador.activo ? "Activo" : "Inactivo"}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
