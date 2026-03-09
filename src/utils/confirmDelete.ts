import Swal from 'sweetalert2'

/**
 * Show a SweetAlert2 delete confirmation popup.
 * Returns true if the user confirmed, false if cancelled.
 *
 * Usage:
 *   onClick={async () => {
 *     if (await confirmDelete('Delete this item?')) mutate(...)
 *   }}
 */
export async function confirmDelete(itemName?: string): Promise<boolean> {
  const result = await Swal.fire({
    title: 'Delete?',
    text: itemName ? `"${itemName}" will be permanently deleted.` : 'This action cannot be undone.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Yes, delete',
    cancelButtonText: 'Cancel',
    buttonsStyling: true,
    customClass: {
      popup:         'rounded-2xl',
      title:         'text-slate-900 text-lg font-semibold',
      htmlContainer: 'text-slate-500 text-sm',
      confirmButton: 'rounded-xl text-sm font-semibold px-5 py-2.5',
      cancelButton:  'rounded-xl text-sm font-semibold px-5 py-2.5',
    },
  })
  return result.isConfirmed
}
