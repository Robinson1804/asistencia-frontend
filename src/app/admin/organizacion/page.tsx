'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useApiData } from '@/hooks/use-api-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Edit, Check, X } from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type SimpleItem = { id: string; nombre: string; activo?: boolean };
type Relacion = { id: string; scrum_master_id: string; coordinador_id: string; division_id: string; nombre_scrum_master?: string; nombre_coordinador?: string; nombre_division?: string };

// ─── Hook genérico para CRUD de catálogos simples ────────────────────────────
function useCatalog(endpoint: string, nombreField: string) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const { toast } = useToast();

  const load = () => {
    setLoading(true);
    apiFetch(endpoint).then(setItems).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      const item = await apiFetch(endpoint, { method: 'POST', body: JSON.stringify({ [nombreField]: newName.trim(), activo: true }) });
      setItems(prev => [...prev, item]);
      setNewName('');
      toast({ title: 'Agregado correctamente' });
    } catch { toast({ variant: 'destructive', title: 'Error al agregar' }); }
  };

  const handleEdit = async (id: string) => {
    if (!editName.trim()) return;
    try {
      const updated = await apiFetch(`${endpoint}/${id}`, { method: 'PUT', body: JSON.stringify({ [nombreField]: editName.trim() }) });
      setItems(prev => prev.map(i => i.id === id ? updated : i));
      setEditId(null);
      toast({ title: 'Actualizado correctamente' });
    } catch { toast({ variant: 'destructive', title: 'Error al actualizar' }); }
  };

  const handleDelete = async (id: string, nombre: string) => {
    try {
      await apiFetch(`${endpoint}/${id}`, { method: 'DELETE' });
      setItems(prev => prev.filter(i => i.id !== id));
      toast({ title: `"${nombre}" eliminado` });
    } catch { toast({ variant: 'destructive', title: 'Error al eliminar' }); }
  };

  return { items, loading, newName, setNewName, editId, setEditId, editName, setEditName, handleAdd, handleEdit, handleDelete };
}

// ─── Tab genérico para Scrum Masters / Coordinadores / Divisiones ────────────
function SimpleCatalogTab({ endpoint, nombreField, label }: { endpoint: string; nombreField: string; label: string }) {
  const { items, loading, newName, setNewName, editId, setEditId, editName, setEditName, handleAdd, handleEdit, handleDelete } = useCatalog(endpoint, nombreField);
  const [search, setSearch] = useState('');

  const filtered = items.filter(item =>
    (item[nombreField] ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <Input placeholder={`Nombre del ${label}...`} value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()} className="max-w-sm" />
        <Button onClick={handleAdd}><PlusCircle className="mr-2 h-4 w-4" />Agregar</Button>
      </div>
      <Input placeholder={`Buscar ${label}...`} value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="text-right w-[120px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={2} className="text-center">Cargando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={2} className="text-center">No se encontraron registros.</TableCell></TableRow>
            ) : filtered.map(item => (
              <TableRow key={item.id}>
                <TableCell>
                  {editId === item.id ? (
                    <Input value={editName} onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleEdit(item.id)} className="max-w-sm" autoFocus />
                  ) : (
                    <span className="font-medium">{item[nombreField]}</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {editId === item.id ? (
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(item.id)}><Check className="h-4 w-4 text-green-600" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setEditId(null)}><X className="h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditId(item.id); setEditName(item[nombreField]); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar "{item[nombreField]}"?</AlertDialogTitle>
                            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(item.id, item[nombreField])} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-sm text-muted-foreground">{filtered.length} de {items.length} registros</p>
    </div>
  );
}

// ─── Tab Relaciones División ──────────────────────────────────────────────────
function RelacionesTab() {
  const [relaciones, setRelaciones] = useState<Relacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [newSM, setNewSM] = useState('');
  const [newCoord, setNewCoord] = useState('');
  const [newDiv, setNewDiv] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editSM, setEditSM] = useState('');
  const [editCoord, setEditCoord] = useState('');
  const [editDiv, setEditDiv] = useState('');
  const { toast } = useToast();

  const { data: scrumMasters } = useApiData<any>('/api/scrum-masters');
  const { data: coordinadores } = useApiData<any>('/api/coordinadores');
  const { data: divisiones } = useApiData<any>('/api/divisiones');

  const load = () => {
    setLoading(true);
    apiFetch('/api/relaciones-division').then(setRelaciones).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newSM || !newCoord || !newDiv) { toast({ variant: 'destructive', title: 'Completa todos los campos' }); return; }
    try {
      await apiFetch('/api/relaciones-division', { method: 'POST', body: JSON.stringify({ scrum_master_id: newSM, coordinador_id: newCoord, division_id: newDiv }) });
      setNewSM(''); setNewCoord(''); setNewDiv('');
      load();
      toast({ title: 'Relación agregada' });
    } catch { toast({ variant: 'destructive', title: 'Error al agregar' }); }
  };

  const handleEdit = async (id: string) => {
    if (!editSM || !editCoord || !editDiv) return;
    try {
      await apiFetch(`/api/relaciones-division/${id}`, { method: 'PUT', body: JSON.stringify({ scrum_master_id: editSM, coordinador_id: editCoord, division_id: editDiv }) });
      setEditId(null);
      load();
      toast({ title: 'Relación actualizada' });
    } catch { toast({ variant: 'destructive', title: 'Error al actualizar' }); }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/relaciones-division/${id}`, { method: 'DELETE' });
      setRelaciones(prev => prev.filter(r => r.id !== id));
      toast({ title: 'Relación eliminada' });
    } catch { toast({ variant: 'destructive', title: 'Error al eliminar' }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 p-4 border rounded-lg bg-muted/30">
        <Select value={newSM} onValueChange={setNewSM}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Scrum Master..." /></SelectTrigger>
          <SelectContent>{(scrumMasters || []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nombre_scrum_master}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={newCoord} onValueChange={setNewCoord}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Coordinador..." /></SelectTrigger>
          <SelectContent>{(coordinadores || []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nombre_coordinador}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={newDiv} onValueChange={setNewDiv}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="División..." /></SelectTrigger>
          <SelectContent>{(divisiones || []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.nombre_division}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={handleAdd}><PlusCircle className="mr-2 h-4 w-4" />Agregar</Button>
      </div>

      <Input placeholder="Buscar por Scrum Master, Coordinador o División..."
        value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scrum Master</TableHead>
              <TableHead>Coordinador</TableHead>
              <TableHead>División</TableHead>
              <TableHead className="text-right w-[120px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center">Cargando...</TableCell></TableRow>
            ) : relaciones.filter(r =>
                [r.nombre_scrum_master, r.nombre_coordinador, r.nombre_division].some(v =>
                  v?.toLowerCase().includes(search.toLowerCase())
                )
              ).length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center">No se encontraron relaciones.</TableCell></TableRow>
            ) : relaciones.filter(r =>
                [r.nombre_scrum_master, r.nombre_coordinador, r.nombre_division].some(v =>
                  v?.toLowerCase().includes(search.toLowerCase())
                )
              ).map(r => (
              <TableRow key={r.id}>
                {editId === r.id ? (
                  <>
                    <TableCell>
                      <Select value={editSM} onValueChange={setEditSM}>
                        <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{(scrumMasters || []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nombre_scrum_master}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={editCoord} onValueChange={setEditCoord}>
                        <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{(coordinadores || []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nombre_coordinador}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={editDiv} onValueChange={setEditDiv}>
                        <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{(divisiones || []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.nombre_division}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(r.id)}><Check className="h-4 w-4 text-green-600" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setEditId(null)}><X className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="font-medium">{r.nombre_scrum_master}</TableCell>
                    <TableCell>{r.nombre_coordinador}</TableCell>
                    <TableCell>{r.nombre_division}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditId(r.id); setEditSM(r.scrum_master_id); setEditCoord(r.coordinador_id); setEditDiv(r.division_id); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar esta relación?</AlertDialogTitle>
                              <AlertDialogDescription>Se eliminará el vínculo entre {r.nombre_scrum_master}, {r.nombre_coordinador} y {r.nombre_division}.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(r.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function OrganizacionPage() {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Organización</h1>
        <p className="text-muted-foreground">Gestiona Scrum Masters, Coordinadores y Relaciones de División.</p>
      </div>
      <Tabs defaultValue="scrum-masters">
        <TabsList className="mb-6">
          <TabsTrigger value="scrum-masters">Scrum Masters</TabsTrigger>
          <TabsTrigger value="coordinadores">Coordinadores</TabsTrigger>
          <TabsTrigger value="divisiones">Divisiones</TabsTrigger>
          <TabsTrigger value="relaciones">Relaciones División</TabsTrigger>
        </TabsList>
        <TabsContent value="scrum-masters">
          <SimpleCatalogTab endpoint="/api/scrum-masters" nombreField="nombre_scrum_master" label="Scrum Master" />
        </TabsContent>
        <TabsContent value="coordinadores">
          <SimpleCatalogTab endpoint="/api/coordinadores" nombreField="nombre_coordinador" label="Coordinador" />
        </TabsContent>
        <TabsContent value="divisiones">
          <SimpleCatalogTab endpoint="/api/divisiones" nombreField="nombre_division" label="División" />
        </TabsContent>
        <TabsContent value="relaciones">
          <RelacionesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
