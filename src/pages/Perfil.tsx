import { useState, useRef, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Save, Lock, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { validatePassword, isPasswordStrong } from '@/lib/passwordValidation';

const db = supabase as any;

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  staff: 'Vendedor',
  technician: 'Técnico',
  super_admin: 'Super Admin',
};

export default function Perfil() {
  const { profile, role, tenant, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Sync form state when profile loads
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setPhone(profile.phone || '');
      setUsername(profile.username || '');
    }
  }, [profile]);

  // Load avatar on mount
  useEffect(() => {
    if (user) {
      db.from('profiles').select('avatar_url').eq('user_id', user.id).single()
        .then(({ data }: any) => {
          if (data?.avatar_url) setAvatarUrl(data.avatar_url);
        });
    }
  }, [user]);

  const initials = profile?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '?';

  const handleSaveProfile = async () => {
    if (!user || !fullName.trim()) {
      toast.error('El nombre no puede estar vacío');
      return;
    }
    setSaving(true);
    try {
      const { error } = await db.from('profiles').update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        username: username.trim() || null,
      }).eq('user_id', user.id);
      if (error) throw error;
      toast.success('Perfil actualizado');
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen no debe superar 2MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const url = urlData.publicUrl + '?t=' + Date.now();

      await db.from('profiles').update({ avatar_url: url }).eq('user_id', user.id);
      setAvatarUrl(url);
      toast.success('Foto actualizada');
    } catch (err: any) {
      toast.error(err.message || 'Error al subir foto');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const passwordChecks = validatePassword(newPassword);

  const handleChangePassword = async () => {
    if (!isPasswordStrong(newPassword)) {
      toast.error('La contraseña no cumple todos los requisitos');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Contraseña actualizada');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Error al cambiar contraseña');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <Layout>
      <div className="page-container max-w-xl space-y-6">
        <h1 className="page-title">Mi Perfil</h1>

        {/* Avatar + Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Avatar className="h-16 w-16 text-lg">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold">{initials}</AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
              <div>
                <CardTitle>{profile?.full_name}</CardTitle>
                <p className="text-sm text-muted-foreground">{roleLabels[role] || role}</p>
                <p className="text-xs text-muted-foreground">{tenant?.name}</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Edit Profile */}
        <Card>
          <CardHeader><CardTitle className="text-base">Datos Personales</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nombre Completo</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div>
              <Label>Usuario</Label>
              <Input value={username} onChange={e => setUsername(e.target.value)} />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar Cambios
            </Button>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader><CardTitle className="text-base">Cambiar Contraseña</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nueva Contraseña</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
              {newPassword && (
                <ul className="mt-2 space-y-1">
                  {passwordChecks.map((check, i) => (
                    <li key={i} className={`flex items-center gap-1.5 text-xs ${check.met ? 'text-green-500' : 'text-muted-foreground'}`}>
                      {check.met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      {check.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <Label>Confirmar Contraseña</Label>
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repetir contraseña" />
            </div>
            <Button variant="outline" onClick={handleChangePassword} disabled={changingPassword || !isPasswordStrong(newPassword)}>
              {changingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
              Cambiar Contraseña
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
