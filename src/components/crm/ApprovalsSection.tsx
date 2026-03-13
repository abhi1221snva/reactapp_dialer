import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Plus,
  Loader2,
  CheckSquare,
  ShieldCheck,
  ShieldX,
  X,
  DollarSign,
  User,
  Calendar,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { useAuth } from '../../hooks/useAuth'
import { LEVELS } from '../../utils/permissions'
import type { LeadApproval, ApprovalStatus, ApprovalType } from '../../types/crm.types'

/* ─── Config ──────────────────────────────────────────────────────────────── */

const STATUS_CONFIG: Record<
  ApprovalStatus,
  { icon: LucideIcon; color: string; bg: string; border: string; label: string }
> = {
  pending:   { icon: Clock,        color: '#D97706', bg: 'rgba(245,158,11,0.10)', border: '#F59E0B', label: 'Pending' },
  approved:  { icon: CheckCircle2, color: '#059669', bg: 'rgba(5,150,105,0.10)',  border: '#059669', label: 'Approved' },
  declined:  { icon: XCircle,      color: '#DC2626', bg: 'rgba(239,68,68,0.10)',  border: '#EF4444', label: 'Declined' },
  withdrawn: { icon: AlertCircle,  color: '#6B7280', bg: 'rgba(107,114,128,0.10)', border: '#9CA3AF', label: 'Withdrawn' },
  expired:   { icon: AlertCircle,  color: '#9CA3AF', bg: 'rgba(156,163,175,0.08)', border: '#D1D5DB', label: 'Expired' },
}

const TYPE_CONFIG: Record<ApprovalType, { label: string; color: string; bg: string }> = {
  funding:            { label: 'Funding',           color: '#7C3AED', bg: 'rgba(124,58,237,0.10)' },
  lender_submission:  { label: 'Lender Submission', color: '#EA580C', bg: 'rgba(234,88,12,0.10)' },
  document_review:    { label: 'Document Review',   color: '#0284C7', bg: 'rgba(2,132,199,0.10)' },
  status_override:    { label: 'Status Override',   color: '#DB2777', bg: 'rgba(219,39,119,0.10)' },
  custom:             { label: 'Custom',             color: '#0F766E', bg: 'rgba(15,118,110,0.10)' },
}

const APPROVAL_TYPES: { value: ApprovalType; label: string }[] = [
  { value: 'funding',           label: 'Funding' },
  { value: 'lender_submission', label: 'Lender Submission' },
  { value: 'document_review',   label: 'Document Review' },
  { value: 'status_override',   label: 'Status Override' },
  { value: 'custom',            label: 'Custom' },
]

/* ─── Form types ──────────────────────────────────────────────────────────── */

interface RequestForm { approval_type: ApprovalType; request_note: string; requested_amount: string }
interface ReviewForm  { status: 'approved' | 'declined'; review_note: string; approved_amount: string }
interface Props       { leadId: number }

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function fmt(date?: string) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtMoney(n?: number) {
  if (n == null) return null
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

/* ─── Sub-components ──────────────────────────────────────────────────────── */

function StatusPill({ status }: { status: ApprovalStatus }) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon
  return (
    <span
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}33` }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  )
}

function TypePill({ type }: { type: ApprovalType }) {
  const cfg = TYPE_CONFIG[type]
  return (
    <span
      style={{ color: cfg.color, background: cfg.bg }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
    >
      {cfg.label}
    </span>
  )
}

/* ─── Approval Card ───────────────────────────────────────────────────────── */

interface CardProps {
  approval: LeadApproval
  isManager: boolean
  currentUserId?: number
  onReview: (a: LeadApproval) => void
  onWithdraw: (id: number) => void
  withdrawing: boolean
}

function ApprovalCard({ approval, isManager, currentUserId, onReview, onWithdraw, withdrawing }: CardProps) {
  const [hovered, setHovered] = useState(false)
  const statusCfg = STATUS_CONFIG[approval.status]
  const requesterName = approval.requested_by_name ?? approval.requester?.name ?? `User #${approval.requested_by}`
  const reviewerName  = approval.reviewed_by_name  ?? approval.reviewer?.name  ?? (approval.reviewed_by ? `User #${approval.reviewed_by}` : null)
  const canReview    = isManager && approval.status === 'pending'
  const canWithdraw  = approval.status === 'pending' && approval.requested_by === currentUserId

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderLeft: `3px solid ${statusCfg.border}`,
        transition: 'box-shadow 0.15s ease, transform 0.1s ease',
        boxShadow: hovered ? '0 4px 20px rgba(0,0,0,0.08)' : '0 1px 4px rgba(0,0,0,0.05)',
        transform: hovered ? 'translateY(-1px)' : 'none',
      }}
      className="bg-white rounded-lg border border-gray-100 overflow-hidden"
    >
      {/* Card header */}
      <div className="flex items-start justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusPill status={approval.status} />
          <TypePill type={approval.approval_type} />
          {approval.approval_stage && (
            <span className="text-xs text-gray-400 italic">Stage: {approval.approval_stage}</span>
          )}
        </div>

        {/* Action buttons — visible on hover */}
        <div
          style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.15s ease' }}
          className="flex items-center gap-1.5 shrink-0 ml-2"
        >
          {canReview && (
            <button
              onClick={() => onReview(approval)}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md text-white"
              style={{ background: '#059669' }}
            >
              <ShieldCheck size={12} />
              Review
            </button>
          )}
          {canWithdraw && (
            <button
              onClick={() => onWithdraw(approval.id)}
              disabled={withdrawing}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500 transition-colors"
            >
              {withdrawing ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
              Withdraw
            </button>
          )}
        </div>
      </div>

      {/* Amounts */}
      {(approval.requested_amount != null || approval.approved_amount != null) && (
        <div className="px-4 py-2 flex items-center gap-6">
          {approval.requested_amount != null && (
            <div className="flex items-center gap-1.5">
              <DollarSign size={13} className="text-gray-400" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400 leading-none mb-0.5">Requested</p>
                <p className="text-sm font-bold text-gray-800">{fmtMoney(approval.requested_amount)}</p>
              </div>
            </div>
          )}
          {approval.approved_amount != null && (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={13} style={{ color: '#059669' }} />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400 leading-none mb-0.5">Approved</p>
                <p className="text-sm font-bold" style={{ color: '#059669' }}>{fmtMoney(approval.approved_amount)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {approval.request_note && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-500 leading-relaxed bg-gray-50 rounded-md px-2.5 py-1.5 border border-gray-100">
            {approval.request_note}
          </p>
        </div>
      )}
      {approval.review_note && (
        <div className="px-4 pb-2">
          <p
            className="text-xs leading-relaxed rounded-md px-2.5 py-1.5 border"
            style={{
              background: approval.status === 'approved' ? 'rgba(5,150,105,0.06)' : 'rgba(239,68,68,0.06)',
              borderColor: approval.status === 'approved' ? 'rgba(5,150,105,0.2)' : 'rgba(239,68,68,0.2)',
              color: approval.status === 'approved' ? '#065F46' : '#7F1D1D',
            }}
          >
            <span className="font-semibold">Review note: </span>{approval.review_note}
          </p>
        </div>
      )}

      {/* Timeline footer */}
      <div
        className="px-4 py-2 flex flex-col gap-0.5 border-t"
        style={{ borderColor: '#F3F4F6', background: '#FAFAFA' }}
      >
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <User size={10} />
          <span>Requested by <span className="font-medium text-gray-600">{requesterName}</span></span>
          <span className="mx-1 text-gray-300">·</span>
          <Calendar size={10} />
          <span>{fmt(approval.created_at)}</span>
          {approval.expires_at && (
            <>
              <span className="mx-1 text-gray-300">·</span>
              <span className="text-amber-500">Expires {fmt(approval.expires_at)}</span>
            </>
          )}
        </div>
        {reviewerName && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <ShieldCheck size={10} />
            <span>Reviewed by <span className="font-medium text-gray-600">{reviewerName}</span></span>
            {approval.reviewed_at && (
              <>
                <span className="mx-1 text-gray-300">·</span>
                <Calendar size={10} />
                <span>{fmt(approval.reviewed_at)}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Review Modal ────────────────────────────────────────────────────────── */

interface ReviewModalProps {
  approval: LeadApproval
  form: ReturnType<typeof useForm<ReviewForm>>
  submitting: boolean
  onClose: () => void
  onSubmit: (data: ReviewForm) => void
}

function ReviewModal({ approval, form, submitting, onClose, onSubmit }: ReviewModalProps) {
  const selectedStatus = form.watch('status')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        style={{ border: '1px solid rgba(0,0,0,0.08)' }}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">Review Approval</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              <TypePill type={approval.approval_type} />
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="p-5 space-y-4">
          {/* Approve / Decline choice cards */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Decision
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Approve card */}
              <button
                type="button"
                onClick={() => form.setValue('status', 'approved')}
                className="relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all"
                style={{
                  borderColor: selectedStatus === 'approved' ? '#059669' : '#E5E7EB',
                  background:  selectedStatus === 'approved' ? 'rgba(5,150,105,0.06)' : '#FAFAFA',
                }}
              >
                {selectedStatus === 'approved' && (
                  <span
                    className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: '#059669' }}
                  >
                    <CheckCircle2 size={10} color="white" />
                  </span>
                )}
                <ShieldCheck
                  size={28}
                  style={{ color: selectedStatus === 'approved' ? '#059669' : '#9CA3AF' }}
                />
                <span
                  className="text-sm font-semibold"
                  style={{ color: selectedStatus === 'approved' ? '#059669' : '#6B7280' }}
                >
                  Approve
                </span>
              </button>

              {/* Decline card */}
              <button
                type="button"
                onClick={() => form.setValue('status', 'declined')}
                className="relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all"
                style={{
                  borderColor: selectedStatus === 'declined' ? '#DC2626' : '#E5E7EB',
                  background:  selectedStatus === 'declined' ? 'rgba(239,68,68,0.06)' : '#FAFAFA',
                }}
              >
                {selectedStatus === 'declined' && (
                  <span
                    className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: '#DC2626' }}
                  >
                    <CheckCircle2 size={10} color="white" />
                  </span>
                )}
                <ShieldX
                  size={28}
                  style={{ color: selectedStatus === 'declined' ? '#DC2626' : '#9CA3AF' }}
                />
                <span
                  className="text-sm font-semibold"
                  style={{ color: selectedStatus === 'declined' ? '#DC2626' : '#6B7280' }}
                >
                  Decline
                </span>
              </button>
            </div>
          </div>

          {/* Approved amount — only show when approving */}
          {selectedStatus === 'approved' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Approved Amount <span className="text-gray-300 font-normal normal-case">(optional)</span>
              </label>
              <div className="relative">
                <DollarSign
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register('approved_amount')}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': '#059669' } as React.CSSProperties}
                  onFocus={e => (e.currentTarget.style.borderColor = '#059669')}
                  onBlur={e => (e.currentTarget.style.borderColor = '')}
                />
              </div>
              {approval.requested_amount != null && (
                <p className="text-xs text-gray-400 mt-1">
                  Requested: {fmtMoney(approval.requested_amount)}
                </p>
              )}
            </div>
          )}

          {/* Review note */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Review Note <span className="text-gray-300 font-normal normal-case">(optional)</span>
            </label>
            <textarea
              {...form.register('review_note')}
              rows={3}
              placeholder="Add a note for this decision..."
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none transition-colors"
              onFocus={e => (e.currentTarget.style.borderColor = '#059669')}
              onBlur={e => (e.currentTarget.style.borderColor = '')}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white rounded-lg transition-opacity disabled:opacity-70"
              style={{ background: selectedStatus === 'approved' ? '#059669' : '#DC2626' }}
            >
              {submitting && <Loader2 size={13} className="animate-spin" />}
              {selectedStatus === 'approved' ? 'Approve' : 'Decline'}
              <ChevronRight size={13} />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Main Component ──────────────────────────────────────────────────────── */

export function ApprovalsSection({ leadId }: Props) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const isManager = (user?.level ?? 1) >= LEVELS.MANAGER
  const [showRequest, setShowRequest] = useState(false)
  const [reviewing, setReviewing] = useState<LeadApproval | null>(null)

  const requestForm = useForm<RequestForm>({
    defaultValues: { approval_type: 'custom', request_note: '', requested_amount: '' },
  })
  const reviewForm = useForm<ReviewForm>({
    defaultValues: { status: 'approved', review_note: '', approved_amount: '' },
  })

  /* queries & mutations ---------------------------------------------------- */

  const { data, isLoading } = useQuery({
    queryKey: ['crm-approvals', leadId],
    queryFn: async () => {
      const res = await crmService.getApprovals(leadId)
      return (res.data?.data ?? res.data ?? []) as LeadApproval[]
    },
  })

  const requestMutation = useMutation({
    mutationFn: (form: RequestForm) =>
      crmService.requestApproval(leadId, {
        approval_type: form.approval_type,
        request_note: form.request_note || undefined,
        requested_amount: form.requested_amount ? parseFloat(form.requested_amount) : undefined,
      }),
    onSuccess: () => {
      toast.success('Approval requested')
      requestForm.reset()
      setShowRequest(false)
      qc.invalidateQueries({ queryKey: ['crm-approvals', leadId] })
    },
    onError: () => toast.error('Failed to request approval'),
  })

  const reviewMutation = useMutation({
    mutationFn: ({ approval, form }: { approval: LeadApproval; form: ReviewForm }) =>
      crmService.reviewApproval(leadId, approval.id, {
        status: form.status,
        review_note: form.review_note || undefined,
        approved_amount: form.approved_amount ? parseFloat(form.approved_amount) : undefined,
      }),
    onSuccess: () => {
      toast.success('Review submitted')
      reviewForm.reset()
      setReviewing(null)
      qc.invalidateQueries({ queryKey: ['crm-approvals', leadId] })
    },
    onError: () => toast.error('Failed to submit review'),
  })

  const [withdrawingId, setWithdrawingId] = useState<number | null>(null)
  const withdrawMutation = useMutation({
    mutationFn: (approvalId: number) => {
      setWithdrawingId(approvalId)
      return crmService.withdrawApproval(leadId, approvalId)
    },
    onSuccess: () => {
      toast.success('Approval withdrawn')
      setWithdrawingId(null)
      qc.invalidateQueries({ queryKey: ['crm-approvals', leadId] })
    },
    onError: () => {
      toast.error('Failed to withdraw')
      setWithdrawingId(null)
    },
  })

  /* derived state ---------------------------------------------------------- */

  const approvals = data ?? []
  const pendingApprovals = approvals.filter(a => a.status === 'pending')
  const hasPending = pendingApprovals.length > 0

  /* render ----------------------------------------------------------------- */

  return (
    <div className="space-y-4">

      {/* ── Banner alerts ─────────────────────────────────────────────────── */}
      {hasPending && isManager && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border"
          style={{ background: 'rgba(5,150,105,0.07)', borderColor: 'rgba(5,150,105,0.25)' }}
        >
          <div
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(5,150,105,0.15)' }}
          >
            <ShieldCheck size={14} style={{ color: '#059669' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: '#065F46' }}>
              Action required
            </p>
            <p className="text-xs" style={{ color: '#047857' }}>
              {pendingApprovals.length} approval{pendingApprovals.length !== 1 ? 's' : ''} waiting for your review
            </p>
          </div>
          <span
            className="text-lg font-bold tabular-nums"
            style={{ color: '#059669' }}
          >
            {pendingApprovals.length}
          </span>
        </div>
      )}

      {hasPending && !isManager && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border"
          style={{ background: 'rgba(245,158,11,0.07)', borderColor: 'rgba(245,158,11,0.25)' }}
        >
          <div
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(245,158,11,0.15)' }}
          >
            <Clock size={14} style={{ color: '#D97706' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#92400E' }}>
              Awaiting manager review
            </p>
            <p className="text-xs" style={{ color: '#B45309' }}>
              {pendingApprovals.length} pending approval{pendingApprovals.length !== 1 ? 's' : ''} — a manager will review shortly
            </p>
          </div>
        </div>
      )}

      {/* ── Section header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-800">Approvals</h3>
          {approvals.length > 0 && (
            <span
              className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(5,150,105,0.12)', color: '#059669' }}
            >
              {approvals.length}
            </span>
          )}
        </div>
        {!showRequest && (
          <button
            onClick={() => setShowRequest(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
            style={{ background: '#059669' }}
          >
            <Plus size={13} />
            Request
          </button>
        )}
      </div>

      {/* ── Request form ──────────────────────────────────────────────────── */}
      {showRequest && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: 'rgba(5,150,105,0.3)', boxShadow: '0 2px 12px rgba(5,150,105,0.08)' }}
        >
          {/* Form header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ background: 'linear-gradient(135deg, rgba(5,150,105,0.1) 0%, rgba(16,185,129,0.06) 100%)', borderBottom: '1px solid rgba(5,150,105,0.15)' }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(5,150,105,0.2)' }}
              >
                <ShieldCheck size={14} style={{ color: '#059669' }} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: '#065F46' }}>New Approval Request</p>
                <p className="text-xs" style={{ color: '#047857' }}>Submit for manager review</p>
              </div>
            </div>
            <button
              onClick={() => { setShowRequest(false); requestForm.reset() }}
              className="p-1.5 rounded-lg hover:bg-white/50 transition-colors text-gray-400 hover:text-gray-600"
            >
              <X size={15} />
            </button>
          </div>

          {/* Form body */}
          <form
            onSubmit={requestForm.handleSubmit(d => requestMutation.mutate(d))}
            className="p-4 space-y-3 bg-white"
          >
            {/* Type + Amount row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Approval Type
                </label>
                <select
                  {...requestForm.register('approval_type')}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-emerald-500 transition-colors appearance-none"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
                >
                  {APPROVAL_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Requested Amount <span className="font-normal text-gray-300 normal-case">(optional)</span>
                </label>
                <div className="relative">
                  <DollarSign
                    size={13}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...requestForm.register('requested_amount')}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Request Note <span className="font-normal text-gray-300 normal-case">(optional)</span>
              </label>
              <textarea
                {...requestForm.register('request_note')}
                rows={3}
                placeholder="Describe why this approval is needed..."
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Submit row */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setShowRequest(false); requestForm.reset() }}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={requestMutation.isPending}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-70"
                style={{ background: '#059669' }}
              >
                {requestMutation.isPending && <Loader2 size={13} className="animate-spin" />}
                Submit Request
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Loading state ─────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={20} className="animate-spin text-gray-300" />
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!isLoading && approvals.length === 0 && !showRequest && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: 'rgba(5,150,105,0.08)' }}
          >
            <CheckSquare size={22} style={{ color: '#059669' }} />
          </div>
          <p className="text-sm font-semibold text-gray-700">No approvals yet</p>
          <p className="text-xs text-gray-400 mt-1">Request an approval to get started</p>
          <button
            onClick={() => setShowRequest(true)}
            className="mt-4 flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg text-white hover:opacity-90 transition-opacity"
            style={{ background: '#059669' }}
          >
            <Plus size={13} />
            Request Approval
          </button>
        </div>
      )}

      {/* ── Approval cards ────────────────────────────────────────────────── */}
      {!isLoading && approvals.length > 0 && (
        <div className="space-y-3">
          {approvals.map(approval => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              isManager={isManager}
              currentUserId={user?.id}
              onReview={a => {
                setReviewing(a)
                reviewForm.reset({ status: 'approved', review_note: '', approved_amount: '' })
              }}
              onWithdraw={id => withdrawMutation.mutate(id)}
              withdrawing={withdrawingId === approval.id && withdrawMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* ── Review modal ──────────────────────────────────────────────────── */}
      {reviewing && (
        <ReviewModal
          approval={reviewing}
          form={reviewForm}
          submitting={reviewMutation.isPending}
          onClose={() => { setReviewing(null); reviewForm.reset() }}
          onSubmit={data => reviewMutation.mutate({ approval: reviewing, form: data })}
        />
      )}
    </div>
  )
}
