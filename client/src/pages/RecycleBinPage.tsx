import React, { useState, useEffect } from 'react';
import { Trash2, RefreshCcw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface DeletedEntry {
  id: number;
  service_name: string;
  username: string;
  deleted_at: string;
}

export function RecycleBinPage({ onUpdate }: { onUpdate: () => void }) {
  const [items, setItems] = useState<DeletedEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const data = await api.get('/recycle');
      setItems(data);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const restore = async (id: number) => {
    try {
      await api.post(`/recycle/${id}/restore`);
      toast({ title: 'Restored', variant: 'success' });
      loadData();
      onUpdate();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DeletedEntry | 'all' | null>(null);

  const requestRemove = (item: DeletedEntry) => {
    setDeleteTarget(item);
    setConfirmText('');
    setConfirmOpen(true);
  };

  const requestEmptyAll = () => {
    setDeleteTarget('all');
    setConfirmText('');
    setConfirmOpen(true);
  };

  const doRemove = async (id: number) => {
    try {
      await api.delete(`/recycle/${id}`);
      toast({ title: 'Permanently deleted' });
      loadData();
      onUpdate();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const doEmptyAll = async () => {
    try {
      await api.delete('/recycle/empty/all');
      toast({ title: 'Recycle bin emptied' });
      loadData();
      onUpdate();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="p-6 md:p-8 flex items-center justify-between border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recycle Bin</h1>
          <p className="text-muted-foreground">Recover recently deleted items.</p>
        </div>
        {items.length > 0 && (
          <Button variant="destructive" onClick={requestEmptyAll}>
            Empty Bin
          </Button>
        )}
      </div>
      
      <div className="p-6 md:p-8 flex-1">
        <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Items in the recycle bin will be permanently deleted automatically after 10 days.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <RefreshCcw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 border border-dashed rounded-xl bg-muted/20">
            <Trash2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <h2 className="text-lg font-semibold mb-1">Recycle bin is empty</h2>
            <p className="text-muted-foreground text-sm">No recently deleted items.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-backwards"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-4">
                  <div>
                    <h3 className="font-semibold">{item.service_name}</h3>
                    {item.username && <p className="text-sm text-muted-foreground">{item.username}</p>}
                    <p className="text-xs text-muted-foreground mt-1">Deleted: {new Date(item.deleted_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => restore(item.id)}>
                      <RefreshCcw className="h-4 w-4 mr-2" /> Restore
                    </Button>
                    <Button variant="destructive" size="sm" className="flex-1 sm:flex-none" onClick={() => requestRemove(item)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent onClose={() => setConfirmOpen(false)}>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Permanent Deletion
            </DialogTitle>
            <DialogDescription>
              {deleteTarget === 'all' ? (
                <span>
                  This will permanently delete <span className="font-semibold text-foreground">ALL items</span> from the recycle bin. This action cannot be undone.
                </span>
              ) : (
                <span>
                  Are you sure you want to permanently delete the entry for <span className="font-semibold text-foreground">{(deleteTarget as DeletedEntry)?.service_name}</span> {((deleteTarget as DeletedEntry)?.username) && `(${(deleteTarget as DeletedEntry)?.username})`}? This action cannot be undone.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 space-y-2">
            <p className="text-xs text-muted-foreground">
              Please type <span className="font-bold text-foreground">DELETE</span> to confirm permanent deletion:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE here..."
              className="w-full bg-background/50"
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== 'DELETE'}
              onClick={async () => {
                if (confirmText !== 'DELETE') return;
                if (deleteTarget === 'all') {
                  await doEmptyAll();
                } else if (deleteTarget) {
                  await doRemove((deleteTarget as DeletedEntry).id);
                }
                setConfirmOpen(false);
              }}
            >
              Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
