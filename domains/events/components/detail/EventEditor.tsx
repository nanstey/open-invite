import type { User } from '../../../../lib/types'
import type { SocialEvent } from '../../types'
import { EventDetail } from './EventDetail'
import type { EventTab } from './route/routing'
import { useEventEditorController } from '../../hooks/useEventEditorController'

type EditorMode = 'create' | 'update'

export function EventEditor(props: {
  mode: EditorMode
  currentUser: User
  initialEvent?: SocialEvent
  activeTab?: EventTab
  onTabChange?: (tab: EventTab) => void
  onCancel: () => void
  onSuccess: (event: SocialEvent) => void
}) {
  const { previewEvent, editModel } = useEventEditorController({
    mode: props.mode,
    currentUser: props.currentUser,
    initialEvent: props.initialEvent,
    onCancel: props.onCancel,
    onSuccess: props.onSuccess,
  })

  return (
    <EventDetail
      event={previewEvent}
      currentUser={props.currentUser}
      onUpdateEvent={() => {}}
      onClose={props.onCancel}
      showBackButton
      layout="shell"
      mode="edit"
      activeTab={props.activeTab}
      onTabChange={props.onTabChange}
      edit={editModel}
    />
  )
}


