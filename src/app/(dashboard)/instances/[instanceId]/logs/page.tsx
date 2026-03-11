import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Terminal } from 'lucide-react'

export default function InstanceLogsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Logs</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Instance Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Log streaming will be available in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
