

import { FormSelect } from '../../../../../lib/ui/components/FormControls'
import { Card } from '../../../../../lib/ui/9ui/card'
import { Input } from '../../../../../lib/ui/9ui/input'

export function TitleCard(props: {
  isEditMode: boolean
  title: string
  activityType: string
  onChangeTitle?: (next: string) => void
  onChangeActivityType?: (next: string) => void
  errors?: { title?: string; activityType?: string }
}) {
  const { isEditMode, title, activityType, onChangeTitle, onChangeActivityType, errors } = props

  if (!isEditMode) return null

  return (
    <Card className="bg-surface border border-slate-700 rounded-2xl p-5">
      <h1 className="text-2xl font-bold text-white mb-3">Title</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <Input
            value={title}
            onChange={(e) => onChangeTitle?.(e.target.value)}
            placeholder="Invite title"
            required
            className={`w-full bg-slate-900 border rounded-lg py-3 px-4 text-white outline-none ${
              errors?.title ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-primary'
            }`}
          />
          {errors?.title ? <div className="text-xs text-red-400 mt-1">{errors.title}</div> : null}
        </div>
        <div className="md:col-span-1">
          <FormSelect
            value={activityType}
            onChange={(e) => onChangeActivityType?.(e.target.value)}
            required
            size="lg"
            variant="surface"
            className={errors?.activityType ? 'border-red-500 focus:border-red-500' : ''}
          >
            <option value="Social">Social</option>
            <option value="Sport">Sport</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Food">Food</option>
            <option value="Work">Work</option>
            <option value="Travel">Travel</option>
          </FormSelect>
          {errors?.activityType ? <div className="text-xs text-red-400 mt-1">{errors.activityType}</div> : null}
        </div>
      </div>
    </Card>
  )
}

