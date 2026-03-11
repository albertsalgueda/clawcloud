import { CreateInstanceForm } from '@/components/instances/create-instance-form'

export default function NewInstancePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Create Instance</h1>
      <CreateInstanceForm />
    </div>
  )
}
