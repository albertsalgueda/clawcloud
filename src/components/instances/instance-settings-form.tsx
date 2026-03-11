'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, X } from 'lucide-react'
import type { Instance } from '@/types/instance'

export function InstanceSettingsForm({ instance }: { instance: Instance }) {
  const router = useRouter()
  const [name, setName] = useState(instance.name)
  const [envVars, setEnvVars] = useState<Array<{ key: string; value: string }>>(
    Object.entries(instance.env_vars ?? {}).map(([key, value]) => ({ key, value }))
  )
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  function addEnvVar() {
    setEnvVars([...envVars, { key: '', value: '' }])
  }

  function removeEnvVar(index: number) {
    setEnvVars(envVars.filter((_, i) => i !== index))
  }

  function updateEnvVar(index: number, field: 'key' | 'value', val: string) {
    const updated = [...envVars]
    updated[index][field] = val
    setEnvVars(updated)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const envObj: Record<string, string> = {}
      envVars.forEach(({ key, value }) => {
        if (key.trim()) envObj[key.trim()] = value
      })

      const res = await fetch(`/api/instances/${instance.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, env_vars: envObj }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? 'Failed to save')
        return
      }

      toast.success('Settings saved')
      router.refresh()
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/instances/${instance.id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        toast.error('Failed to delete')
        return
      }
      toast.success('Instance deleted')
      router.push('/instances')
    } catch {
      toast.error('Failed to delete')
    } finally {
      setDeleteLoading(false)
      setDeleteOpen(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instance-name">Instance Name</Label>
            <Input id="instance-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
          <CardDescription>These are passed to your OpenClaw instance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {envVars.map((env, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input placeholder="KEY" value={env.key} onChange={(e) => updateEnvVar(i, 'key', e.target.value)} className="font-mono" />
              <Input placeholder="value" value={env.value} onChange={(e) => updateEnvVar(i, 'value', e.target.value)} className="font-mono" />
              <Button variant="ghost" size="icon" onClick={() => removeEnvVar(i)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addEnvVar}>
            <Plus className="mr-2 h-4 w-4" /> Add Variable
          </Button>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Changes
      </Button>

      <Separator />

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Permanently delete this instance and all associated data</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete Instance
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Instance"
        description={`This will permanently delete "${instance.name}" and cancel its subscription. This action cannot be undone.`}
        confirmLabel="Delete Instance"
        onConfirm={handleDelete}
        loading={deleteLoading}
        destructive
      />
    </div>
  )
}
