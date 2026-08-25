'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash2, Shield, Users, Key, MapPin, X, Building, Lock } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import type { Role, Permission } from '@/types';

type Tab = 'users' | 'roles' | 'permissions' | 'company' | 'profile';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);

  // Role form
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [roleForm, setRoleForm] = useState({ name: '', description: '' });
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  // Permission form
  const [showPermForm, setShowPermForm] = useState(false);
  const [permForm, setPermForm] = useState({ slug: '', name: '', description: '' });

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await api.get('/rbac/roles');
      setRoles(res.data.data ?? res.data ?? []);
    } catch (err) {
      console.error('Failed to fetch roles', err);
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await api.get('/rbac/permissions');
      setPermissions(res.data.data ?? res.data ?? []);
    } catch (err) {
      console.error('Failed to fetch permissions', err);
    }
  };

  const handleSaveRole = async () => {
    setLoading(true);
    try {
      if (editingRoleId) {
        await api.put(`/rbac/roles/${editingRoleId}`, {
          ...roleForm,
          permissionIds: selectedPermissions,
        });
      } else {
        await api.post('/rbac/roles', {
          ...roleForm,
          permissionIds: selectedPermissions,
        });
      }
      fetchRoles();
      resetRoleForm();
    } catch (err) {
      console.error('Failed to save role', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditRole = (role: Role) => {
    setEditingRoleId(role.id);
    setRoleForm({ name: role.name, description: role.description || '' });
    setSelectedPermissions(role.permissions.map((p) => p.id));
    setShowRoleForm(true);
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    try {
      await api.delete(`/rbac/roles/${id}`);
      fetchRoles();
    } catch (err) {
      console.error('Failed to delete role', err);
    }
  };

  const handleSavePermission = async () => {
    setLoading(true);
    try {
      await api.post('/rbac/permissions', permForm);
      fetchPermissions();
      setShowPermForm(false);
      setPermForm({ slug: '', name: '', description: '' });
    } catch (err) {
      console.error('Failed to save permission', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePermission = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await api.delete(`/rbac/permissions/${id}`);
      fetchPermissions();
    } catch (err) {
      console.error('Failed to delete permission', err);
    }
  };

  const resetRoleForm = () => {
    setShowRoleForm(false);
    setEditingRoleId(null);
    setRoleForm({ name: '', description: '' });
    setSelectedPermissions([]);
  };

  const togglePermission = (permId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId],
    );
  };

  const groupedPermissions = permissions.reduce<Record<string, Permission[]>>(
    (acc, perm) => {
      const module = perm.slug.split(':')[0];
      if (!acc[module]) acc[module] = [];
      acc[module].push(perm);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage users, roles, and permissions</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <Button variant={activeTab === 'users' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('users')}>
          <Users className="h-4 w-4 mr-1" /> Users
        </Button>
        <Button variant={activeTab === 'roles' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('roles')}>
          <Shield className="h-4 w-4 mr-1" /> Roles
        </Button>
        <Button variant={activeTab === 'permissions' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('permissions')}>
          <Key className="h-4 w-4 mr-1" /> Permissions
        </Button>
        <Button variant={activeTab === 'company' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('company')}>
          <Building className="h-4 w-4 mr-1" /> Company
        </Button>
        <Button variant={activeTab === 'profile' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('profile')}>
          <Lock className="h-4 w-4 mr-1" /> Password
        </Button>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && <UsersTab roles={roles} />}

      {/* Company Tab */}
      {activeTab === 'company' && <CompanyTab />}

      {/* Profile / Change Password Tab */}
      {activeTab === 'profile' && <ChangePasswordTab />}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Roles</h2>
            <Button onClick={() => setShowRoleForm(true)}><Plus className="h-4 w-4 mr-1" /> Add Role</Button>
          </div>

          {showRoleForm && (
            <Card>
              <CardHeader><CardTitle>{editingRoleId ? 'Edit Role' : 'Create Role'}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} placeholder="Role name" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Input value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} placeholder="Description" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Permissions</label>
                  <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-4">
                    {Object.entries(groupedPermissions).map(([module, perms]) => (
                      <div key={module}>
                        <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">{module}</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {perms.map((perm) => (
                            <label key={perm.id} className="flex items-center gap-2 text-sm cursor-pointer">
                              <input type="checkbox" checked={selectedPermissions.includes(perm.id)} onChange={() => togglePermission(perm.id)} className="rounded" />
                              {perm.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveRole} disabled={loading}>{loading ? 'Saving...' : 'Save Role'}</Button>
                  <Button variant="ghost" onClick={resetRoleForm}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-3">
            {roles.map((role) => (
              <Card key={role.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{role.name}</p>
                    <p className="text-sm text-muted-foreground">{role.description || 'No description'}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {role.permissions.slice(0, 5).map((perm) => (
                        <span key={perm.id} className="px-2 py-0.5 bg-secondary rounded text-xs">{perm.slug}</span>
                      ))}
                      {role.permissions.length > 5 && <span className="px-2 py-0.5 bg-muted rounded text-xs">+{role.permissions.length - 5} more</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEditRole(role)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteRole(role.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Permissions</h2>
            <Button onClick={() => setShowPermForm(true)}><Plus className="h-4 w-4 mr-1" /> Add Permission</Button>
          </div>

          {showPermForm && (
            <Card>
              <CardHeader><CardTitle>Create Permission</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Slug (module:action)</label>
                    <Input value={permForm.slug} onChange={(e) => setPermForm({ ...permForm, slug: e.target.value })} placeholder="e.g. inventory:read" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input value={permForm.name} onChange={(e) => setPermForm({ ...permForm, name: e.target.value })} placeholder="Display name" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Input value={permForm.description} onChange={(e) => setPermForm({ ...permForm, description: e.target.value })} placeholder="Optional" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSavePermission} disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
                  <Button variant="ghost" onClick={() => setShowPermForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {Object.entries(groupedPermissions).map(([module, perms]) => (
            <Card key={module}>
              <CardHeader className="pb-2"><CardTitle className="text-base capitalize">{module}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {perms.map((perm) => (
                    <div key={perm.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted">
                      <div>
                        <span className="text-sm font-medium">{perm.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">({perm.slug})</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeletePermission(perm.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// USERS TAB - Full user management with role & location mapping
// ============================================================
function UsersTab({ roles }: { roles: Role[] }) {
  const [users, setUsers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [userForm, setUserForm] = useState({ email: '', password: '', fullName: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  // Location assignment
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [assignForm, setAssignForm] = useState({ userId: '', roleId: '', locationType: '', locationId: '' });
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchLocations();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data.data ?? res.data ?? []);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const fetchLocations = async () => {
    try {
      const [whRes, outRes] = await Promise.all([
        api.get('/master/warehouses'),
        api.get('/master/outlets'),
      ]);
      setWarehouses(whRes.data.data ?? whRes.data ?? []);
      setOutlets(outRes.data.data ?? outRes.data ?? []);
    } catch {}
  };

  const handleCreateUser = async () => {
    if (!userForm.email || !userForm.password || !userForm.fullName) {
      alert('Email, password, dan nama wajib diisi');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        email: userForm.email,
        password: userForm.password,
        fullName: userForm.fullName,
        phone: userForm.phone || undefined,
      });
      const data = res.data.data ?? res.data;
      // Open assign modal for the new user
      setAssignForm({ userId: data.userId, roleId: '', locationType: '', locationId: '' });
      setShowAssignModal(true);
      setShowForm(false);
      setUserForm({ email: '', password: '', fullName: '', phone: '' });
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal membuat user');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async () => {
    if (!assignForm.userId || !assignForm.roleId) {
      alert('Pilih role');
      return;
    }
    setLoading(true);
    try {
      await api.post('/rbac/assign', { userId: assignForm.userId, roleId: assignForm.roleId });
      // If location selected, assign location too
      if (assignForm.locationType && assignForm.locationId) {
        await api.post('/master/user-locations', {
          userId: assignForm.userId,
          locationType: assignForm.locationType,
          locationId: assignForm.locationId,
        });
      }
      alert('Role & lokasi berhasil di-assign!');
      setShowAssignModal(false);
      setAssignForm({ userId: '', roleId: '', locationType: '', locationId: '' });
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal assign');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLocation = async (locationAssignmentId: string) => {
    if (!confirm('Remove location assignment?')) return;
    try {
      await api.delete(`/master/user-locations/${locationAssignmentId}`);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal hapus lokasi');
    }
  };

  const handleRevokeRole = async (userId: string, roleId: string) => {
    if (!confirm('Revoke role ini?')) return;
    try {
      await api.delete(`/rbac/revoke/${userId}/${roleId}`);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal revoke role');
    }
  };

  const handleToggleActive = async (user: any) => {
    try {
      await api.put(`/auth/users/${user.id}`, { isActive: !user.isActive });
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal update user');
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (!confirm(`Hapus user "${user.fullName}"? Data tidak bisa dikembalikan.`)) return;
    try {
      await api.delete(`/auth/users/${user.id}`);
      fetchUsers();
      toast.success('User deleted');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal hapus user');
    }
  };

  const handleResetPassword = async (user: any) => {
    const newPw = prompt(`Reset password untuk "${user.fullName}".\nMasukkan password baru (min 8 karakter):`);
    if (!newPw) return;
    if (newPw.length < 8) { toast.error('Password minimal 8 karakter'); return; }
    try {
      await api.post(`/auth/users/${user.id}/reset-password`, { newPassword: newPw });
      toast.success(`Password ${user.fullName} berhasil di-reset`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal reset password');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Users ({users.length})</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add User
        </Button>
      </div>

      {/* Create User Form */}
      {showForm && (
        <Card>
          <CardHeader><CardTitle>Create New User</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Full Name</label>
                <Input value={userForm.fullName} onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })} placeholder="John Doe" />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} placeholder="user@example.com" />
              </div>
              <div>
                <label className="text-sm font-medium">Password</label>
                <Input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} placeholder="Min 8 characters" />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} placeholder="081234567890" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateUser} disabled={loading}>{loading ? 'Creating...' : 'Create User'}</Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assign Role + Location Modal */}
      {showAssignModal && (
        <Card className="border-2 border-primary">
          <CardHeader><CardTitle>Assign Role & Location</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Role</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={assignForm.roleId}
                  onChange={(e) => setAssignForm({ ...assignForm, roleId: e.target.value })}
                >
                  <option value="">Select role...</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Location Type</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={assignForm.locationType}
                  onChange={(e) => setAssignForm({ ...assignForm, locationType: e.target.value, locationId: '' })}
                >
                  <option value="">No location (optional)</option>
                  <option value="warehouse">Warehouse</option>
                  <option value="outlet">Outlet</option>
                </select>
              </div>
              {assignForm.locationType && (
                <div>
                  <label className="text-sm font-medium">
                    {assignForm.locationType === 'warehouse' ? 'Warehouse' : 'Outlet'}
                  </label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={assignForm.locationId}
                    onChange={(e) => setAssignForm({ ...assignForm, locationId: e.target.value })}
                  >
                    <option value="">Select...</option>
                    {(assignForm.locationType === 'warehouse' ? warehouses : outlets).map((loc: any) => (
                      <option key={loc.id} value={loc.id}>{loc.code} - {loc.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAssignRole} disabled={loading || !assignForm.roleId}>
                {loading ? 'Assigning...' : 'Assign'}
              </Button>
              <Button variant="ghost" onClick={() => setShowAssignModal(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User List */}
      <div className="space-y-3">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{user.fullName}</p>
                    <span className={`px-2 py-0.5 rounded text-xs ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{user.email} {user.phone ? `| ${user.phone}` : ''}</p>

                  {/* Roles */}
                  <div className="flex items-center gap-1 flex-wrap mt-2">
                    <Shield className="h-3 w-3 text-muted-foreground" />
                    {user.roles?.length > 0 ? user.roles.map((role: any) => (
                      <span key={role.id} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs flex items-center gap-1">
                        {role.name}
                        <button onClick={() => handleRevokeRole(user.id, role.id)} className="hover:text-red-600">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )) : <span className="text-xs text-muted-foreground">No roles</span>}
                  </div>

                  {/* Locations */}
                  <div className="flex items-center gap-1 flex-wrap mt-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    {user.locations?.length > 0 ? user.locations.map((loc: any) => (
                      <span key={loc.id} className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs flex items-center gap-1">
                        {loc.location_type}: {loc.location_name || loc.location_id}
                        <button onClick={() => handleRemoveLocation(loc.id)} className="hover:text-red-600">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )) : <span className="text-xs text-muted-foreground">No location assigned</span>}
                  </div>
                </div>

                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAssignForm({ userId: user.id, roleId: '', locationType: '', locationId: '' });
                      setShowAssignModal(true);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Assign
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(user)}
                  >
                    {user.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResetPassword(user)}
                  >
                    <Key className="h-3 w-3 mr-1" /> Reset PW
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDeleteUser(user)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {users.length === 0 && (
          <Card><CardContent className="p-6 text-center text-muted-foreground">No users yet.</CardContent></Card>
        )}
      </div>
    </div>
  );
}


// ============================================================
// COMPANY TAB - Company profile settings
// ============================================================
function CompanyTab() {
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    companyName: '',
    tagline: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    taxId: '',
    logo: '',
    receiptHeader: '',
    receiptFooter: '',
    poFooter: '',
  });

  useEffect(() => {
    fetchCompany();
  }, []);

  const fetchCompany = async () => {
    try {
      const res = await api.get('/master/company');
      const data = res.data.data ?? res.data;
      if (data) {
        setCompany(data);
        setForm({
          companyName: data.companyName || '',
          tagline: data.tagline || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          website: data.website || '',
          taxId: data.taxId || '',
          logo: data.logo || '',
          receiptHeader: data.receiptHeader || '',
          receiptFooter: data.receiptFooter || '',
          poFooter: data.poFooter || '',
        });
      }
    } catch {}
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await api.put('/master/company', form);
      setCompany(res.data.data ?? res.data);
      alert('Company settings saved!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      alert('File terlalu besar (max 500KB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm({ ...form, logo: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Company Profile</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informasi Perusahaan</CardTitle>
          <p className="text-sm text-muted-foreground">Data ini akan ditampilkan di struk, surat PO, dan dokumen lainnya.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden bg-muted">
              {form.logo ? (
                <img src={form.logo} alt="Logo" className="h-full w-full object-contain" />
              ) : (
                <Building className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Logo Perusahaan</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={handleLogoUpload}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, atau SVG. Max 500KB.</p>
              {form.logo && (
                <Button variant="ghost" size="sm" className="mt-1 text-destructive" onClick={() => setForm({ ...form, logo: '' })}>
                  Remove Logo
                </Button>
              )}
            </div>
          </div>

          {/* Company Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Nama Perusahaan</label>
              <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="PT. Example Indonesia" />
            </div>
            <div>
              <label className="text-sm font-medium">Tagline</label>
              <Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="Your trusted partner" />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Alamat</label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Jl. Contoh No. 1, Jakarta" />
            </div>
            <div>
              <label className="text-sm font-medium">Telepon</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="021-1234567" />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="info@company.com" />
            </div>
            <div>
              <label className="text-sm font-medium">Website</label>
              <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="www.company.com" />
            </div>
            <div>
              <label className="text-sm font-medium">NPWP</label>
              <Input value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} placeholder="00.000.000.0-000.000" />
            </div>
          </div>

          {/* Receipt & Document Settings */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="text-sm font-semibold">Pengaturan Struk & Dokumen</h3>
            <div>
              <label className="text-sm font-medium">Header Struk (teks custom di atas struk)</label>
              <Input value={form.receiptHeader} onChange={(e) => setForm({ ...form, receiptHeader: e.target.value })} placeholder="e.g. Selamat Berbelanja!" />
            </div>
            <div>
              <label className="text-sm font-medium">Footer Struk (teks di bawah struk)</label>
              <Input value={form.receiptFooter} onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })} placeholder="e.g. Terima kasih atas kunjungan Anda!" />
            </div>
            <div>
              <label className="text-sm font-medium">Footer Surat PO</label>
              <Input value={form.poFooter} onChange={(e) => setForm({ ...form, poFooter: e.target.value })} placeholder="e.g. Barang yang sudah dikirim tidak dapat dikembalikan" />
            </div>
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? 'Saving...' : 'Save Company Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* Preview */}
      {form.companyName && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview Struk Header</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-xs bg-muted p-4 rounded-lg text-center space-y-1 max-w-xs mx-auto">
              {form.logo && <img src={form.logo} alt="Logo" className="h-10 mx-auto mb-2" />}
              <p className="font-bold text-sm">{form.companyName}</p>
              {form.tagline && <p>{form.tagline}</p>}
              {form.address && <p>{form.address}</p>}
              {form.phone && <p>Tel: {form.phone}</p>}
              {form.receiptHeader && <p className="mt-2 border-t pt-1">{form.receiptHeader}</p>}
              <p className="border-t border-dashed mt-2 pt-1 text-muted-foreground">--- items here ---</p>
              {form.receiptFooter && <p className="border-t mt-2 pt-1">{form.receiptFooter}</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


// ============================================================
// CHANGE PASSWORD TAB
// ============================================================
function ChangePasswordTab() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!form.currentPassword || !form.newPassword) {
      toast.error('Semua field wajib diisi');
      return;
    }
    if (form.newPassword.length < 8) {
      toast.error('Password baru minimal 8 karakter');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.error('Konfirmasi password tidak cocok');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success('Password berhasil diubah!');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal ubah password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Change Password</h2>
      <Card>
        <CardContent className="p-6 space-y-4 max-w-md">
          <div>
            <label className="text-sm font-medium">Password Lama</label>
            <Input
              type="password"
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              placeholder="Masukkan password saat ini"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Password Baru</label>
            <Input
              type="password"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              placeholder="Minimal 8 karakter"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Konfirmasi Password Baru</label>
            <Input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              placeholder="Ulangi password baru"
              className="mt-1"
            />
          </div>
          <Button onClick={handleChangePassword} disabled={loading}>
            {loading ? 'Saving...' : 'Ubah Password'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
