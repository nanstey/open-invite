import * as React from 'react'

export function useHeaderImageSelection(args: {
  initialSelectedUrl?: string
  onUpdate: (imageUrl: string) => Promise<void> | void
  onClose: () => void
}) {
  const { initialSelectedUrl, onUpdate, onClose } = args
  const [selectedUrl, setSelectedUrl] = React.useState<string>(initialSelectedUrl ?? '')
  const [isSaving, setIsSaving] = React.useState(false)

  const handleConfirm = React.useCallback(async () => {
    if (!selectedUrl) return
    setIsSaving(true)
    try {
      await onUpdate(selectedUrl)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }, [onClose, onUpdate, selectedUrl])

  return {
    selectedUrl,
    setSelectedUrl,
    isSaving,
    handleConfirm,
  }
}
