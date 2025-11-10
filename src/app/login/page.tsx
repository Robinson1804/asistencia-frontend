
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!auth || !firestore) {
        toast({
            variant: "destructive",
            title: "Error de inicialización",
            description: "Los servicios de autenticación o base de datos no están disponibles.",
        });
        return;
    }
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDocRef = doc(firestore, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      let userData;
      let role;

      if (userDocSnap.exists()) {
        userData = userDocSnap.data();
        role = userData.role;
      } else {
        // El documento del usuario no existe, así que lo creamos.
        console.warn(`User document for ${user.uid} not found. Creating it.`);
        
        // Asignamos rol 'admin' si el email es el de admin, si no, 'registrador'.
        const newRole = email === 'admin@inei.gob.pe' ? 'admin' : 'registrador';
        
        const newUserPayload = {
          email: user.email,
          role: newRole,
          createdAt: serverTimestamp(),
        };
        
        await setDoc(userDocRef, newUserPayload);
        
        userData = newUserPayload;
        role = newRole;

        toast({
            title: "Perfil creado",
            description: "Hemos creado tu perfil de usuario automáticamente."
        });
      }

      toast({
        title: "Inicio de sesión exitoso",
        description: `Bienvenido, ${userData.email}. Redirigiendo...`,
      });

      if (role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/');
      }

    } catch (error: any) {
      console.error("Failed to sign in", error);
      let description = "Las credenciales son incorrectas o el usuario no tiene un perfil asignado.";
      if (error.code === 'auth/invalid-credential') {
        description = "Correo electrónico o contraseña incorrectos."
      }

      toast({
        variant: "destructive",
        title: "Error al iniciar sesión",
        description: description,
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background/80 backdrop-blur-sm px-4">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleLogin}>
          <CardHeader>
            <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
            <CardDescription>
              Ingresa tus credenciales para acceder al sistema de asistencia.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@ejemplo.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Ingresando..." : "Ingresar"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

