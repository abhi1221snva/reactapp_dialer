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
  Building2,
  FileText,
  Zap,
  Settings2,
  User,
  Calendar,
  ChevronRight,
  ArrowRight,
  RotateCcw,
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
  { icon: LucideIcon; color: string; bg: string; border: string; label: string; pillBg: string }
> = {
  pending:   { icon: Clock,        color: '#D97706', bg: 'rgba(245,158,11,0.10)',   border: '#F59E0B', label: 'Pending',   pillBg: 'rgba(245,158,11,0.12)'  },
  approved:  { icon: CheckCircle2, color: '#059669', bg: 'rgba(5,150,105,0.10)',    border: '#059669', label: 'Approved',  pillBg: 'rgba(5,150,105,0.12)'   },
  declined:  { icon: XCircle,      color: '#DC2626', bg: 'rgba(239,68,68,0.10)',    border: '#EF4444', label: 'Declined',  pillBg: 'rgba(239,68,68,0.12)'   },
  withdrawn: { icon: RotateCcw,    color: '#6B7280', bg: 'rgba(107,114,128,0.10)',  border: '#9CA3AF', label: 'Withdrawn', pillBg: 'rgba(107,114,128,0.10)' },
  expired:   { icon: AlertCircle,  color: '#EA580C', bg: 'rgba(234,88,12,0.08)',    border: '#F97316', label: 'Expired',   pillBg: 'rgba(234,88,12,0.10)'   },
}

const TYPE_CONFIG: Record<
  ApprovalType,
  { label: string; color: string; bg: string; icon: LucideIcon; hint: string }
> = {
  funding:            { label: 'Funding Approval',   color: '#B45309', bg: 'rgba(245,158,11,0.12)', icon: DollarSign, hint: 'Describe the funding purpose and the amount needed...' },
  lender_submission:  { label: 'Lender Submission',  color: '#1D4ED8', bg: 'rgba(59,130,246,0.12)', icon: Building2,  hint: 'Specify which lender and submission details...' },
  document_review:    { label: 'Document Review',    color: '#7C3AED', bg: 'rgba(139,92,246,0.12)', icon: FileText,   hint: 'List the documents requiring review...' },
  status_override:    { label: 'Status Override',    color: '#6D28D9', bg: 'rgba(109,40,217,0.12)', icon: Zap,        hint: 'Explain the reason for overriding the current status...' },
  custom:             { label: 'Custom Request',     color: '#475569', bg: 'rgba(71,85,105,0.10)',  icon: Settings2,  hint: 'Describe what needs to be approved and why...' },
}

const APPROVAL_TYPES: { value: ApprovalType; label: string }[] = [
  { value: 'funding',           label: 'Funding Approval' },
  { value: 'lender_submission', label: 'Lender Submission' },
  { value: 'document_review',   label: 'Document Review' },
  { value: 'status_override',   label: 'Status Override' },
  { value: 'custom',            label: 'Custom Request' },
]

/* ─── Form types ──────────────────────────────────────────────────────────── */

interface RequestForm { approval_type: ApprovalType; request_note: string; requested_amount: string }
interface ReviewForm  { status: 'approved' | 'declined'; review_note: string; approved_amount: string }
interface Props       { leadId: number }

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function fmt(date?: string) {
  if (!date) return '\u2014'
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function timeAgo(date?: string): string | null {
  if (!date) return null
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function fmtMoney(n?: number) {
  if (n == null) return null
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

/* ─── Status Pill ─────────────────────────────────────────────────────────── */

function StatusPill({ status }: { status: ApprovalStatus }) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon
  return (
    <span
      style={{ color: cfg.color, background: cfg.pillBg, border: `1px solid ${cfg.color}33` }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
    >
      <Icon size={10} />
      {cfg.label}
    </span>
  )
}

/* ─── Status Flow Bar ─────────────────────────────────────────────────────── */

function StatusFlowBar({ status }: { status: ApprovalStatus }) {
  const isTerminal = status === 'approved' || status === 'declined'
  const isApproved = status === 'approved'
  const isDeclined = status === 'declined'
  const isWithdrawn = status === 'withdrawn'
  const isExpired = status === 'expired'

  if (isWithdrawn || isExpired) {
    const cfg = STATUS_CONFIG[status]
    return (
      <div className="flex items-center gap-1.5 text-xs mt-1.5">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium text-[10px]"
          style={{ background: cfg.pillBg, color: cfg.color }}
        >
          {cfg.label}
        </span>
        <span className="text-gray-300">— no further action</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 mt-2">
      {/* Step 1 */}
      <div className="flex items-center gap-1">
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-white"
          style={{ background: status === 'pending' ? '#D97706' : isTerminal ? '#059669' : '#E5E7EB' }}
        >
          {isTerminal ? (
            <CheckCircle2 size={11} color="white" />
          ) : (
            <span className="text-[9px] font-bold">1</span>
          )}
        </div>
        <span className="text-[10px] font-medium" style={{ color: status === 'pending' ? '#D97706' : '#6B7280' }}>
          Pending
        </span>
      </div>

      {/* Connector */}
      <div
        style={{
          height: 2,
          flex: 1,
          minWidth: 16,
          borderRadius: 2,
          background: isTerminal ? (isDeclined ? '#EF4444' : '#059669') : '#E5E7EB',
          margin: '0 4px',
        }}
      />

      {/* Step 2 */}
      <div className="flex items-center gap-1">
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: isTerminal ? (isDeclined ? '#EF4444' : '#059669') : '#E5E7EB' }}
        >
          {isApproved && <CheckCircle2 size={11} color="white" />}
          {isDeclined && <XCircle size={11} color="white" />}
          {!isTerminal && <span className="text-[9px] font-bold text-gray-400">2</span>}
        </div>
        <span
          className="text-[10px] font-medium"
          style={{ color: isApproved ? '#059669' : isDeclined ? '#DC2626' : '#9CA3AF' }}
        >
          {isApproved ? 'Approved' : isDeclined ? 'Declined' : 'Review'}
        </span>
      </div>
    </div>
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
  const statusCfg = STATUS_CONFIG[approval.status]
  const typeCfg   = TYPE_CONFIG[approval.approval_type]
  const TypeIcon  = typeCfg.icon
  const requesterName = approval.requested_by_name ?? approval.requester?.name ?? `User #${approval.requested_by}`
  const reviewerName  = approval.reviewed_by_name  ?? approval.reviewer?.name  ?? (approval.reviewed_by ? `User #${approval.reviewed_by}` : null)
  const canReview   = isManager && approval.status === 'pending'
  const canWithdraw = approval.status === 'pending' && approval.requested_by === currentUserId
  const ago = timeAgo(approval.created_at)

  return (
    <div
      className="bg-white rounded-xl border overflow-hidden"
      style={{
        borderColor: '#E5E7EB',
        borderLeft: `4px solid ${statusCfg.border}`,
        boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
      }}
    >
      {/* ── Card header ── */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        {/* Type icon bubble */}
        <div
          className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: typeCfg.bg }}
        >
          <TypeIcon size={17} style={{ color: typeCfg.color }} />
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-900 leading-tight">{typeCfg.label}</span>
            <StatusPill status={approval.status} />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <User size={10} className="text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-500">
              Requested by{' '}
              <span className="font-semibold text-gray-700">{requesterName}</span>
            </span>
            <span className="text-gray-300">·</span>
            <Calendar size={10} className="text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-400">{fmt(approval.created_at)}</span>
            {ago && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-xs text-gray-400">{ago}</span>
              </>
            )}
            {approval.expires_at && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-xs font-medium" style={{ color: '#EA580C' }}>
                  Expires {fmt(approval.expires_at)}
                </span>
              </>
            )}
          </div>
          {/* Status flow visualization */}
          <StatusFlowBar status={approval.status} />
        </div>
      </div>

      {/* ── Amounts ── */}
      {(approval.requested_amount != null || approval.approved_amount != null) && (
        <div
          className="mx-4 mb-3 flex items-center gap-4 px-3 py-2 rounded-lg"
          style={{ background: 'rgba(0,0,0,0.025)', border: '1px solid #F3F4F6' }}
        >
          {approval.requested_amount != null && (
            <div className="flex items-center gap-1.5">
              <DollarSign size={12} className="text-gray-400" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400 leading-none mb-0.5">Requested</p>
                <p className="text-sm font-bold text-gray-800">{fmtMoney(approval.requested_amount)}</p>
              </div>
            </div>
          )}
          {approval.approved_amount != null && (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={12} style={{ color: '#059669' }} />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400 leading-none mb-0.5">Approved</p>
                <p className="text-sm font-bold" style={{ color: '#059669' }}>{fmtMoney(approval.approved_amount)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Request note ── */}
      {approval.request_note && (
        <div className="mx-4 mb-3">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Request</p>
          <p className="text-xs text-gray-600 leading-relaxed italic bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
            &ldquo;{approval.request_note}&rdquo;
          </p>
        </div>
      )}

      {/* ── Review note ── */}
      {approval.review_note && (
        <div className="mx-4 mb-3">
          {reviewerName && (
            <div className="flex items-center gap-1.5 mb-1">
              <ShieldCheck size={10} style={{ color: approval.status === 'approved' ? '#059669' : '#DC2626' }} />
              <p
                className="text-[10px] uppercase tracking-wide font-semibold"
                style={{ color: approval.status === 'approved' ? '#059669' : '#DC2626' }}
              >
                Reviewed by {reviewerName}
                {approval.reviewed_at && (
                  <span className="text-gray-400 font-normal normal-case ml-1">
                    · {fmt(approval.reviewed_at)}
                  </span>
                )}
              </p>
            </div>
          )}
          <p
            className="text-xs leading-relaxed rounded-lg px-3 py-2 border"
            style={{
              background:   approval.status === 'approved' ? 'rgba(5,150,105,0.06)'  : 'rgba(239,68,68,0.06)',
              borderColor:  approval.status === 'approved' ? 'rgba(5,150,105,0.2)'   : 'rgba(239,68,68,0.2)',
              color:        approval.status === 'approved' ? '#065F46'               : '#7F1D1D',
            }}
          >
            {approval.review_note}
          </p>
        </div>
      )}

      {/* ── Action row ── */}
      {(canReview || canWithdraw) && (
        <div
          className="flex items-center justify-end gap-2 px-4 py-2.5 border-t"
          style={{ borderColor: '#F3F4F6', background: '#FAFAFA' }}
        >
          {canWithdraw && (
            <button
              onClick={() => onWithdraw(approval.id)}
              disabled={withdrawing}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors"
              style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#FCA5A5'
                e.currentTarget.style.color = '#DC2626'
                e.currentTarget.style.background = 'rgba(239,68,68,0.04)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#E5E7EB'
                e.currentTarget.style.color = '#6B7280'
                e.currentTarget.style.background = ''
              }}
            >
              {withdrawing ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
              Withdraw
            </button>
          )}
          {canReview && (
            <>
              <button
                onClick={() => onReview({ ...approval, _forceDecline: true } as unknown as LeadApproval)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors"
                style={{ borderColor: '#FECACA', color: '#DC2626', background: 'rgba(239,68,68,0.06)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.12)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.06)')}
              >
                <XCircle size={12} />
                Decline
              </button>
              <button
                onClick={() => onReview(approval)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
                style={{ background: '#059669' }}
              >
                <CheckCircle2 size={12} />
                Approve
              </button>
            </>
          )}
        </div>
      )}

      {/* Footer — reviewer line when no action buttons and review note not shown */}
      {!canReview && !canWithdraw && reviewerName && !approval.review_note && (
        <div
          className="px-4 py-2 flex items-center gap-1.5 border-t text-xs text-gray-400"
          style={{ borderColor: '#F3F4F6', background: '#FAFAFA' }}
        >
          <ShieldCheck size={10} />
          Reviewed by{' '}
          <span className="font-medium text-gray-600 ml-0.5">{reviewerName}</span>
          {approval.reviewed_at && (
            <>
              <span className="mx-1 text-gray-300">·</span>
              {fmt(approval.reviewed_at)}
            </>
          )}
        </div>
      )}
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
  const typeCfg = TYPE_CONFIG[approval.approval_type]
  const TypeIcon = typeCfg.icon

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
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)', borderBottom: '1px solid #E2E8F0' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: typeCfg.bg }}
            >
              <TypeIcon size={17} style={{ color: typeCfg.color }} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Review Approval</h3>
              <p className="text-xs text-gray-500 mt-0.5">{typeCfg.label}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white transition-colors text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="p-5 space-y-4">
          {/* Context summary */}
          {(approval.request_note || approval.requested_amount != null) && (
            <div
              className="flex flex-col gap-1.5 px-3 py-2.5 rounded-xl"
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
            >
              {approval.requested_amount != null && (
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <DollarSign size={11} className="text-gray-400" />
                  <span>Requested amount:</span>
                  <span className="font-bold text-gray-800">{fmtMoney(approval.requested_amount)}</span>
                </div>
              )}
              {approval.request_note && (
                <p className="text-xs text-gray-500 italic leading-relaxed">
                  &ldquo;{approval.request_note}&rdquo;
                </p>
              )}
            </div>
          )}

          {/* Decision cards */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Decision
            </label>
            <div className="grid grid-cols-2 gap-3">
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
                <ShieldCheck size={26} style={{ color: selectedStatus === 'approved' ? '#059669' : '#9CA3AF' }} />
                <span className="text-sm font-semibold" style={{ color: selectedStatus === 'approved' ? '#059669' : '#6B7280' }}>
                  Approve
                </span>
              </button>

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
                <ShieldX size={26} style={{ color: selectedStatus === 'declined' ? '#DC2626' : '#9CA3AF' }} />
                <span className="text-sm font-semibold" style={{ color: selectedStatus === 'declined' ? '#DC2626' : '#6B7280' }}>
                  Decline
                </span>
              </button>
            </div>
          </div>

          {/* Approved amount */}
          {selectedStatus === 'approved' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Approved Amount <span className="text-gray-300 font-normal normal-case">(optional)</span>
              </label>
              <div className="relative">
                <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
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
                <p className="text-xs text-gray-400 mt-1">Requested: {fmtMoney(approval.requested_amount)}</p>
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
              onFocus={e => (e.currentTarget.style.borderColor = selectedStatus === 'approved' ? '#059669' : '#DC2626')}
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

/* ─── Request Form Panel ──────────────────────────────────────────────────── */

interface RequestFormPanelProps {
  form: ReturnType<typeof useForm<RequestForm>>
  isPending: boolean
  onCancel: () => void
  onSubmit: (data: RequestForm) => void
}

function RequestFormPanel({ form, isPending, onCancel, onSubmit }: RequestFormPanelProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const selectedType = form.watch('approval_type')
  const typeCfg = TYPE_CONFIG[selectedType]
  const TypeIcon = typeCfg.icon

  function handleTypeSelect(t: ApprovalType) {
    form.setValue('approval_type', t)
    setStep(2)
  }

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'rgba(5,150,105,0.3)', boxShadow: '0 2px 12px rgba(5,150,105,0.08)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          background: 'linear-gradient(135deg, rgba(5,150,105,0.09) 0%, rgba(16,185,129,0.05) 100%)',
          borderBottom: '1px solid rgba(5,150,105,0.15)',
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(5,150,105,0.18)' }}
          >
            <ShieldCheck size={14} style={{ color: '#059669' }} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: '#065F46' }}>New Approval Request</p>
            <p className="text-xs" style={{ color: '#047857' }}>Submit for manager review</p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="p-1.5 rounded-lg hover:bg-white/50 transition-colors text-gray-400 hover:text-gray-600"
        >
          <X size={15} />
        </button>
      </div>

      {/* Step indicator */}
      <div
        className="flex items-center px-4 py-2.5"
        style={{ borderBottom: '1px solid #F3F4F6', background: '#FAFAFA' }}
      >
        {/* Step 1 */}
        <div className="flex items-center gap-1.5">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ background: step > 1 ? '#059669' : step === 1 ? '#059669' : '#D1D5DB' }}
          >
            {step > 1 ? <CheckCircle2 size={11} color="white" /> : '1'}
          </div>
          <span className="text-xs font-medium" style={{ color: step >= 1 ? '#059669' : '#9CA3AF' }}>
            Select Type
          </span>
        </div>
        <ArrowRight size={12} className="mx-2 text-gray-300" />
        {/* Step 2 */}
        <div className="flex items-center gap-1.5">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{ background: step >= 2 ? '#059669' : '#F3F4F6', color: step >= 2 ? 'white' : '#9CA3AF' }}
          >
            2
          </div>
          <span className="text-xs font-medium" style={{ color: step >= 2 ? '#059669' : '#9CA3AF' }}>
            Add Details
          </span>
        </div>
        <ArrowRight size={12} className="mx-2 text-gray-300" />
        {/* Step 3 */}
        <div className="flex items-center gap-1.5">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-400"
            style={{ background: '#F3F4F6' }}
          >
            3
          </div>
          <span className="text-xs font-medium text-gray-400">Submit</span>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 bg-white">
        {/* ── Step 1: Type cards ── */}
        {step === 1 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 mb-3">Select the type of approval you need:</p>
            {APPROVAL_TYPES.map(t => {
              const cfg = TYPE_CONFIG[t.value]
              const Icon = cfg.icon
              const isSelected = selectedType === t.value
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleTypeSelect(t.value)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all"
                  style={{
                    borderColor: isSelected ? cfg.color : '#E5E7EB',
                    background: isSelected ? cfg.bg : '#FAFAFA',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = cfg.color + '70' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = '#E5E7EB' }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
                    style={{ background: cfg.bg }}
                  >
                    <Icon size={15} style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight" style={{ color: isSelected ? cfg.color : '#374151' }}>
                      {cfg.label}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-tight line-clamp-1">
                      {cfg.hint}
                    </p>
                  </div>
                  <ChevronRight size={14} style={{ color: isSelected ? cfg.color : '#D1D5DB' }} />
                </button>
              )
            })}
          </div>
        )}

        {/* ── Step 2: Details ── */}
        {step === 2 && (
          <div className="space-y-3">
            {/* Selected type recap chip */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: typeCfg.bg, border: `1px solid ${typeCfg.color}33` }}
            >
              <TypeIcon size={13} style={{ color: typeCfg.color }} />
              <span className="text-xs font-semibold flex-1" style={{ color: typeCfg.color }}>
                {typeCfg.label}
              </span>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-[10px] font-medium underline"
                style={{ color: typeCfg.color + 'aa' }}
              >
                Change
              </button>
            </div>

            {/* Requested Amount */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Requested Amount <span className="font-normal text-gray-300 normal-case">(optional)</span>
              </label>
              <div className="relative">
                <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register('requested_amount')}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none transition-colors"
                  onFocus={e => (e.currentTarget.style.borderColor = '#059669')}
                  onBlur={e => (e.currentTarget.style.borderColor = '')}
                />
              </div>
            </div>

            {/* Justification */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Justification <span className="font-normal text-gray-300 normal-case">(optional)</span>
              </label>
              <textarea
                {...form.register('request_note')}
                rows={4}
                placeholder={typeCfg.hint}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none transition-colors"
                onFocus={e => (e.currentTarget.style.borderColor = '#059669')}
                onBlur={e => (e.currentTarget.style.borderColor = '')}
              />
            </div>

            {/* Back + Submit */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ChevronRight size={13} className="rotate-180" />
                Back
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-bold text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-70"
                style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                Submit Request
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

/* ─── Summary Bar ─────────────────────────────────────────────────────────── */

type FilterStatus = ApprovalStatus | 'all'

interface SummaryBarProps {
  approvals: LeadApproval[]
  filter: FilterStatus
  onFilter: (s: FilterStatus) => void
}

function SummaryBar({ approvals, filter, onFilter }: SummaryBarProps) {
  const counts = {
    all:      approvals.length,
    pending:  approvals.filter(a => a.status === 'pending').length,
    approved: approvals.filter(a => a.status === 'approved').length,
    declined: approvals.filter(a => a.status === 'declined').length,
  }

  const items: { key: FilterStatus; label: string; color: string; bg: string; icon: LucideIcon; count: number }[] = [
    { key: 'all',      label: 'All',      color: '#374151', bg: 'rgba(55,65,81,0.08)',   icon: CheckSquare,  count: counts.all },
    { key: 'pending',  label: 'Pending',  color: '#D97706', bg: 'rgba(245,158,11,0.10)', icon: Clock,        count: counts.pending },
    { key: 'approved', label: 'Approved', color: '#059669', bg: 'rgba(5,150,105,0.10)',  icon: CheckCircle2, count: counts.approved },
    { key: 'declined', label: 'Declined', color: '#DC2626', bg: 'rgba(239,68,68,0.10)',  icon: XCircle,      count: counts.declined },
  ]

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {items.map(item => {
        const Icon = item.icon
        const active = filter === item.key
        return (
          <button
            key={item.key}
            onClick={() => onFilter(active && item.key !== 'all' ? 'all' : item.key)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border"
            style={{
              background:   active ? item.bg  : 'transparent',
              color:        active ? item.color : '#9CA3AF',
              borderColor:  active ? `${item.color}33` : 'transparent',
            }}
          >
            <Icon size={10} />
            {item.label}
            <span
              className="px-1 py-0 rounded-full text-[10px] font-bold"
              style={{
                background: active ? `${item.color}22` : '#F3F4F6',
                color:      active ? item.color : '#9CA3AF',
              }}
            >
              {item.count}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ─── Main Component ──────────────────────────────────────────────────────── */

export function ApprovalsSection({ leadId }: Props) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const isManager = (user?.level ?? 1) >= LEVELS.MANAGER
  const [showRequest, setShowRequest] = useState(false)
  const [reviewing, setReviewing]     = useState<LeadApproval | null>(null)
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')

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
  const filteredApprovals = statusFilter === 'all'
    ? approvals
    : approvals.filter(a => a.status === statusFilter)

  /* handlers --------------------------------------------------------------- */

  function handleOpenReview(approval: LeadApproval) {
    const a = approval as LeadApproval & { _forceDecline?: boolean }
    reviewForm.reset({
      status: a._forceDecline ? 'declined' : 'approved',
      review_note: '',
      approved_amount: '',
    })
    const { _forceDecline: _fd, ...clean } = a
    void _fd
    setReviewing(clean as LeadApproval)
  }

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
            <p className="text-sm font-semibold" style={{ color: '#065F46' }}>Action required</p>
            <p className="text-xs" style={{ color: '#047857' }}>
              {pendingApprovals.length} approval{pendingApprovals.length !== 1 ? 's' : ''} waiting for your review
            </p>
          </div>
          <span className="text-lg font-bold tabular-nums" style={{ color: '#059669' }}>
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
            <p className="text-sm font-semibold" style={{ color: '#92400E' }}>Awaiting manager review</p>
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
        <RequestFormPanel
          form={requestForm}
          isPending={requestMutation.isPending}
          onCancel={() => { setShowRequest(false); requestForm.reset() }}
          onSubmit={d => requestMutation.mutate(d)}
        />
      )}

      {/* ── Loading state ─────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={20} className="animate-spin text-gray-300" />
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!isLoading && approvals.length === 0 && !showRequest && (
        <div
          className="flex flex-col items-center justify-center py-10 text-center rounded-2xl border-2 border-dashed"
          style={{ borderColor: '#E5E7EB', background: '#FAFAFA' }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: 'rgba(5,150,105,0.08)' }}
          >
            <ShieldCheck size={24} style={{ color: '#059669' }} />
          </div>
          <p className="text-sm font-bold text-gray-700">No approvals yet</p>
          <p className="text-xs text-gray-400 mt-1 max-w-[200px] leading-relaxed">
            Submit a request when manager sign-off is required for this lead.
          </p>
          {/* Mini lifecycle diagram */}
          <div className="flex items-center gap-1.5 mt-4 text-[10px] font-medium">
            <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.12)', color: '#D97706' }}>
              Pending
            </span>
            <ArrowRight size={10} className="text-gray-300" />
            <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}>
              Reviewing
            </span>
            <ArrowRight size={10} className="text-gray-300" />
            <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(5,150,105,0.1)', color: '#059669' }}>
              Approved
            </span>
          </div>
          <button
            onClick={() => setShowRequest(true)}
            className="mt-5 flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg text-white hover:opacity-90 transition-opacity"
            style={{ background: '#059669' }}
          >
            <Plus size={13} />
            Request Approval
          </button>
        </div>
      )}

      {/* ── Approvals list ────────────────────────────────────────────────── */}
      {!isLoading && approvals.length > 0 && (
        <div className="space-y-3">
          <SummaryBar approvals={approvals} filter={statusFilter} onFilter={setStatusFilter} />

          {filteredApprovals.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">
              No {statusFilter} approvals.{' '}
              <button onClick={() => setStatusFilter('all')} className="underline font-medium text-gray-500">
                Show all
              </button>
            </p>
          ) : (
            filteredApprovals.map(approval => (
              <ApprovalCard
                key={approval.id}
                approval={approval}
                isManager={isManager}
                currentUserId={user?.id}
                onReview={handleOpenReview}
                onWithdraw={id => withdrawMutation.mutate(id)}
                withdrawing={withdrawingId === approval.id && withdrawMutation.isPending}
              />
            ))
          )}
        </div>
      )}

      {/* ── Review modal ──────────────────────────────────────────────────── */}
      {reviewing && (
        <ReviewModal
          approval={reviewing}
          form={reviewForm}
          submitting={reviewMutation.isPending}
          onClose={() => { setReviewing(null); reviewForm.reset() }}
          onSubmit={reviewData => reviewMutation.mutate({ approval: reviewing, form: reviewData })}
        />
      )}
    </div>
  )
}
