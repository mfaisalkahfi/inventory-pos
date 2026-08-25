'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Users, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import type { Member } from '@/types';

const tierColors: Record<string, string> = {
  bronze: 'bg-amber-100 text-amber-800',
  silver: 'bg-gray-100 text-gray-800',
  gold: 'bg-yellow-100 text-yellow-800',
  platinum: 'bg-purple-100 text-purple-800',
};

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [searchPhone, setSearchPhone] = useState('');
  const [foundMember, setFoundMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '' });

  const handleSearch = async () => {
    if (!searchPhone) return;
    setLoading(true);
    try {
      const res = await api.get(`/pos/members/phone/${searchPhone}`);
      setFoundMember(res.data.data ?? res.data);
    } catch {
      setFoundMember(null);
      alert('Member not found');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMember = async () => {
    setLoading(true);
    try {
      const res = await api.post('/pos/members', form);
      setFoundMember(res.data.data ?? res.data);
      setShowForm(false);
      setForm({ name: '', phone: '', email: '' });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Members</h1>
        <p className="text-muted-foreground">Manage loyalty members</p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Search by phone number..."
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>Search</Button>
            <Button variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Member
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create Member Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Register New Member</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="081234567890" />
              </div>
              <div>
                <label className="text-sm font-medium">Email (optional)</label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateMember} disabled={loading}>{loading ? 'Creating...' : 'Create Member'}</Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Member Detail */}
      {foundMember && (
        <Card className="border-2 border-primary">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{foundMember.name}</h3>
                  <p className="text-muted-foreground">{foundMember.code}</p>
                  <p className="text-sm">{foundMember.phone} | {foundMember.email || '-'}</p>
                </div>
              </div>
              <span className={cn('px-3 py-1 rounded text-sm font-medium capitalize flex items-center gap-1', tierColors[foundMember.tier])}>
                <Crown className="h-3 w-3" />
                {foundMember.tier}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{Number(foundMember.points).toLocaleString('id-ID')}</p>
                  <p className="text-sm text-muted-foreground">Points</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">Rp {Number(foundMember.totalSpending).toLocaleString('id-ID')}</p>
                  <p className="text-sm text-muted-foreground">Total Spending</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{foundMember.isActive ? 'Active' : 'Inactive'}</p>
                  <p className="text-sm text-muted-foreground">Status</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
