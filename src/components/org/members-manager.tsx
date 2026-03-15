'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Users, UserPlus, Trash2, Shield } from 'lucide-react'
import { toast } from 'sonner'

interface Member {
  id: string
  role: string
  created_at: string
  user: {
    id: string
    email: string
    name: string | null
  }
}

export function MembersManager({ orgSlug }: { orgSlug: string }) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/organizations/${orgSlug}/members`)
      const data = await res.json()
      setMembers(data.members ?? [])
    } catch {
      toast.error('Failed to load members')
    } finally {
      setLoading(false)
    }
  }, [orgSlug])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail) return

    setInviting(true)
    try {
      const res = await fetch(`/api/organizations/${orgSlug}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Failed to add member')
        return
      }

      toast.success(`${inviteEmail} added as ${inviteRole}`)
      setInviteEmail('')
      setInviteRole('member')
      fetchMembers()
    } catch {
      toast.error('Failed to add member')
    } finally {
      setInviting(false)
    }
  }

  async function handleRemove(memberId: string, email: string) {
    if (!confirm(`Remove ${email} from this organization?`)) return

    try {
      const res = await fetch(`/api/organizations/${orgSlug}/members?memberId=${memberId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? 'Failed to remove member')
        return
      }

      toast.success(`${email} removed`)
      fetchMembers()
    } catch {
      toast.error('Failed to remove member')
    }
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    try {
      const res = await fetch(`/api/organizations/${orgSlug}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, role: newRole }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? 'Failed to update role')
        return
      }

      toast.success('Role updated')
      fetchMembers()
    } catch {
      toast.error('Failed to update role')
    }
  }

  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'default' as const
      case 'admin': return 'secondary' as const
      default: return 'outline' as const
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Member
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <div className="w-full space-y-2 sm:w-36">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={(val) => { if (val) setInviteRole(val) }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={inviting} className="h-10 rounded-xl">
              {inviting ? 'Adding...' : 'Add'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members found.</p>
          ) : (
            <div className="divide-y divide-border">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {member.user.name || member.user.email}
                      </span>
                      <Badge variant={roleBadgeVariant(member.role)} className="rounded-full text-xs">
                        {member.role}
                      </Badge>
                    </div>
                    {member.user.name && (
                      <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {member.role !== 'owner' && (
                      <>
                        <Select
                          value={member.role}
                          onValueChange={(val) => { if (val) handleRoleChange(member.id, val) }}
                        >
                          <SelectTrigger className="h-8 w-24 text-xs">
                            <Shield className="mr-1 h-3 w-3" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemove(member.id, member.user.email)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
