import Swal from 'sweetalert2'

const POPUP_CLASSES = {
  popup:         'rounded-2xl',
  title:         'text-slate-900 text-lg font-semibold',
  htmlContainer: 'text-slate-500 text-sm',
  confirmButton: 'rounded-xl text-sm font-semibold px-5 py-2.5',
  cancelButton:  'rounded-xl text-sm font-semibold px-5 py-2.5',
}

/**
 * General-purpose confirm dialog.
 * Returns true if the user clicked Confirm.
 *
 * Usage:
 *   onClick={async () => {
 *     if (await showConfirm({ message: 'Sure?' })) mutate(...)
 *   }}
 */
export async function showConfirm(options: {
  title?:       string
  message:      string
  confirmText?: string
  cancelText?:  string
  danger?:      boolean
  icon?:        'warning' | 'question' | 'info' | 'error'
}): Promise<boolean> {
  const {
    title       = 'Confirm Action',
    message,
    confirmText = 'Confirm',
    cancelText  = 'Cancel',
    danger      = true,
    icon        = 'warning',
  } = options

  const result = await Swal.fire({
    title,
    text: message,
    icon,
    showCancelButton:    true,
    confirmButtonColor:  danger ? '#ef4444' : '#6366f1',
    cancelButtonColor:   '#6b7280',
    confirmButtonText:   confirmText,
    cancelButtonText:    cancelText,
    buttonsStyling:      true,
    customClass:         POPUP_CLASSES,
  })
  return result.isConfirmed
}

/**
 * Delete confirmation dialog — pre-configured for destructive deletes.
 * Returns true if the user confirmed.
 *
 * Usage:
 *   onClick={async () => {
 *     if (await confirmDelete('My Item')) mutate(id)
 *   }}
 */
export async function confirmDelete(itemName?: string): Promise<boolean> {
  return showConfirm({
    title:       'Delete?',
    message:     itemName
      ? `"${itemName}" will be permanently deleted. This cannot be undone.`
      : 'This action cannot be undone.',
    confirmText: 'Yes, delete',
    icon:        'warning',
    danger:      true,
  })
}
