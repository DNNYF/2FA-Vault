import React, { useState, useEffect } from 'react';
import { Plus, Search, Copy, Trash, Edit, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import * as OTPAuth from 'otpauth';

interface Entry {
  id: number;
  service_name: string;
  username: string;
  secret: string;
}

export function DashboardPage({ onRecycleUpdate }: { onRecycleUpdate: () => void }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [search, setSearch] = useState('');
  const [now, setNow] = useState(Date.now());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form State
  const [formService, setFormService] = useState('');
  const [formUser, setFormUser] = useState('');
  const [formSecret, setFormSecret] = useState('');
  const [previewCode, setPreviewCode] = useState('');
  const [previewError, setPreviewError] = useState('');

  const loadData = async () => {
    try {
      const data = await api.get('/entries');
      setEntries(data);
    } catch (e: any) {
      toast({ title: 'Error loading data', description: e.message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!formSecret) {
      setPreviewCode('');
      setPreviewError('');
      return;
    }
    try {
      const cleanSecret = formSecret.replace(/[\s\-=]/g, '').toUpperCase();
      const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(cleanSecret) });
      setPreviewCode(totp.generate());
      setPreviewError('');
    } catch (e) {
      setPreviewCode('');
      setPreviewError('Invalid Base32 secret key format');
    }
  }, [formSecret, now]);

  const saveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (previewError || !formSecret) {
      toast({ title: 'Invalid secret', description: 'Please provide a valid Base32 secret key', variant: 'destructive' });
      return;
    }
    try {
      const body = { service_name: formService, username: formUser, secret: formSecret };
      if (editingId) {
        await api.put(`/entries/${editingId}`, body);
        toast({ title: 'Updated', variant: 'success' });
      } else {
        await api.post('/entries', body);
        toast({ title: 'Added', variant: 'success' });
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      toast({ title: 'Error saving entry', description: err.message, variant: 'destructive' });
    }
  };

  const deleteEntry = async (id: number) => {
    try {
      await api.delete(`/entries/${id}`);
      toast({ title: 'Moved to Recycle Bin' });
      loadData();
      onRecycleUpdate();
    } catch (err: any) {
      toast({ title: 'Error deleting', description: err.message, variant: 'destructive' });
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setFormService('');
    setFormUser('');
    setFormSecret('');
    setPreviewCode('');
    setPreviewError('');
    setModalOpen(true);
  };

  const openEdit = (entry: Entry) => {
    setEditingId(entry.id);
    setFormService(entry.service_name);
    setFormUser(entry.username);
    setFormSecret(entry.secret);
    setModalOpen(true);
  };

  const getHslColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${hash % 360}, 65%, 55%)`;
  };

  const filtered = entries.filter(e => 
    e.service_name.toLowerCase().includes(search.toLowerCase()) || 
    (e.username && e.username.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full relative">
      <div className="p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Authenticator Codes</h1>
          <p className="text-muted-foreground">Manage and view your 2-step verification codes.</p>
        </div>
        <Button onClick={openAdd} className="shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Add Account
        </Button>
      </div>

      <div className="p-6 md:p-8 flex-1">
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search services or usernames..." 
            className="pl-9 bg-background/50 backdrop-blur-sm"
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl border-dashed bg-muted/20">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-1">No accounts found</h2>
            <p className="text-muted-foreground text-sm mb-4">You haven't added any 2FA accounts matching your search.</p>
          </div>
        ) : (
          <div className="flex flex-col space-y-2 pb-20">
            {filtered.map((entry, idx) => (
              <div 
                key={entry.id} 
                className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-backwards"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <TotpRow entry={entry} now={now} onEdit={() => openEdit(entry)} onDelete={() => deleteEntry(entry.id)} getHslColor={getHslColor} />
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent onClose={() => setModalOpen(false)}>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Account' : 'Add Account'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveEntry} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Service Name</label>
              <Input required placeholder="e.g., Google, GitHub" value={formService} onChange={e => setFormService(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Username/Email (Optional)</label>
              <Input placeholder="user@example.com" value={formUser} onChange={e => setFormUser(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Secret Key</label>
              <Input required placeholder="Base32 Secret" value={formSecret} onChange={e => setFormSecret(e.target.value)} />
              {previewError && <p className="text-xs text-destructive mt-1">{previewError}</p>}
            </div>
            {previewCode && !previewError && (
              <div className="p-4 bg-muted/50 rounded-lg text-center mt-4 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Live Preview</p>
                <div className="font-mono text-3xl tracking-widest font-bold text-primary">
                  {previewCode.substring(0,3)} <span className="opacity-80">{previewCode.substring(3)}</span>
                </div>
              </div>
            )}
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save Account</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TotpRow({ entry, now, onEdit, onDelete, getHslColor }: any) {
  const [code, setCode] = useState('------');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    try {
      const clean = entry.secret.replace(/[\s\-=]/g, '').toUpperCase();
      const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(clean) });
      setCode(totp.generate());
      const epoch = Math.floor(now / 1000);
      const remaining = totp.period - (epoch % totp.period);
      setProgress((remaining / totp.period) * 100);
    } catch {
      setCode('Error');
      setProgress(0);
    }
  }, [now, entry.secret]);

  const copyToClipboard = () => {
    if (code !== 'Error') {
      navigator.clipboard.writeText(code);
      toast({ title: 'Copied to clipboard', description: `${entry.service_name} code copied` });
    }
  };

  const initials = entry.service_name.substring(0, 2).toUpperCase();
  const radius = 12;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const isExpiring = progress < 15;

  return (
    <div className="group flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border bg-card hover:border-primary/30 hover:shadow-sm transition-all gap-4 md:gap-6">
      
      {/* Left: Icon + Info */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0" style={{ backgroundColor: getHslColor(entry.service_name) }}>
          {initials}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-lg truncate leading-tight">{entry.service_name}</h3>
          {entry.username ? (
            <p className="text-sm text-muted-foreground truncate">{entry.username}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic opacity-50">No username</p>
          )}
        </div>
      </div>
      
      {/* Right: Timer, Code, Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
        
        {/* Timer & Code */}
        <div className="flex items-center justify-between sm:justify-start gap-4 bg-muted/30 sm:bg-transparent p-3 sm:p-0 rounded-lg sm:rounded-none">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative flex items-center justify-center shrink-0">
              <svg className="transform -rotate-90 w-8 h-8 sm:w-10 sm:h-10" width="40" height="40" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-muted" />
                <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="transparent" 
                  strokeDasharray={2 * Math.PI * 16} 
                  strokeDashoffset={(2 * Math.PI * 16) - (progress / 100) * (2 * Math.PI * 16)} 
                  className={`transition-all duration-1000 ease-linear ${isExpiring ? 'text-destructive' : 'text-primary'}`} />
              </svg>
            </div>
            <div className="font-mono text-3xl sm:text-4xl font-bold tracking-[0.15em] tabular-nums" style={{ color: isExpiring ? 'var(--destructive)' : 'inherit' }}>
              {code.substring(0,3)}<span className="opacity-60">{code.substring(3)}</span>
            </div>
          </div>
          
          {/* Mobile Actions in the same row as code */}
          <div className="flex sm:hidden items-center gap-1">
            <Button variant="ghost" size="icon" onClick={copyToClipboard} title="Copy code" className="h-9 w-9">
              <Copy className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onEdit} title="Edit account" className="h-9 w-9">
              <Edit className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} title="Delete account" className="h-9 w-9 text-destructive hover:bg-destructive/10">
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Desktop Actions */}
        <div className="hidden sm:flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" onClick={copyToClipboard} title="Copy code" className="h-9 w-9">
            <Copy className="h-4 w-4 text-muted-foreground" />
          </Button>
          <div className="h-6 w-px bg-border mx-1"></div>
          <Button variant="ghost" size="icon" onClick={onEdit} title="Edit account" className="h-9 w-9">
            <Edit className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} title="Delete account" className="h-9 w-9 hover:text-destructive hover:bg-destructive/10">
            <Trash className="h-4 w-4" />
          </Button>
        </div>

      </div>
    </div>
  );
}
