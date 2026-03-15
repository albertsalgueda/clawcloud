import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Terminal } from 'lucide-react'

export default function InstanceLogsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          Instance Logs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Log streaming is available in the ClawPort dashboard. Click &quot;Open Dashboard&quot; from the Overview tab to access live logs.
        </p>
      </CardContent>
    </Card>
  )
}
