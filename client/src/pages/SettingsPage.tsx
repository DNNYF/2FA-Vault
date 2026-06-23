import React, { useRef, useState } from 'react';
import { Download, Upload, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

export function SettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleExport = async () => {
    try {
      const data = await api.get('/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `2fa_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'Export successful', description: 'Backup file has been downloaded.', variant: 'success' });
    } catch (e: any) {
      toast({ title: 'Export failed', description: e.message, variant: 'destructive' });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const entries = JSON.parse(text);
      if (!Array.isArray(entries)) throw new Error('Invalid backup format. Must be an array.');

      const res = await api.post('/import', { entries });
      toast({ title: 'Import successful', description: `Imported ${res.imported} entries. Skipped ${res.skipped} duplicates.`, variant: 'success' });
    } catch (e: any) {
      toast({ title: 'Import failed', description: e.message, variant: 'destructive' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="p-6 md:p-8 border-b">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your vault and backups.</p>
      </div>
      
      <div className="p-6 md:p-8 flex-1 max-w-3xl">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Data Backup & Recovery
              </CardTitle>
              <CardDescription>Export your 2FA accounts to a JSON file or import them from a previous backup.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={handleExport} className="flex-1">
                  <Download className="mr-2 h-4 w-4" /> Export Backup
                </Button>
                <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="flex-1" disabled={importing}>
                  <Upload className="mr-2 h-4 w-4" /> {importing ? 'Importing...' : 'Restore Backup'}
                </Button>
                <input 
                  type="file" 
                  accept=".json" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleImport} 
                />
              </div>
              <p className="text-sm text-muted-foreground bg-muted p-4 rounded-md border">
                <strong>Important:</strong> Exported JSON files contain your raw secret keys. Keep them safe and do not share them. Anyone with this file can generate your 2FA codes.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
