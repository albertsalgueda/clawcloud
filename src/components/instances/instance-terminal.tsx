'use client'

import { InstanceTerminalWorkspace } from '@/components/instances/instance-terminal-workspace'
import type { Instance } from '@/types/instance'

export function InstanceTerminal({ instance }: { instance: Instance }) {
  return <InstanceTerminalWorkspace instance={instance} />
}
