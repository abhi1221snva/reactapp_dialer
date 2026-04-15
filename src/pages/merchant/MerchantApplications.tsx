import { useOutletContext, useNavigate } from 'react-router-dom'
import { FileText, Plus, ChevronRight, Clock, CheckCircle2, DollarSign, XCircle, RotateCcw } from 'lucide-react'
import type { MerchantApplication } from '../../services/merchantPortal.service'

interface OutletCtx { applications: MerchantApplication[] }

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  new_lead:     { label: 'New',          color: '#4338ca', bg: '#e0e7ff', icon: Clock        },
  in_progress:  { label: 'In Progress',  color: '#92400e', bg: '#fef3c7', icon: RotateCcw    },
  under_review: { label: 'Under Review', color: '#92400e', bg: '#fef3c7', icon: RotateCcw    },
  warm:         { label: 'In Review',    color: '#92400e', bg: '#fef3c7', icon: RotateCcw    },
  approved:     { label: 'Approved',     color: '#065f46', bg: '#d1fae5', icon: CheckCircle2 },
  funded:       { label: 'Funded',       color: '#064e3b', bg: '#bbf7d0', icon: DollarSign   },
  declined:     { label: 'Declined',     color: '#7f1d1d', bg: '#fee2e2', icon: XCircle      },
  submitted:    { label: 'Submitted',    color: '#1e40af', bg: '#dbeafe', icon: CheckCircle2 },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? {
    label: status.replace(/_/g, ' '),
    color: '#334155', bg: '#f1f5f9', icon: Clock,
  }
  const Icon = cfg.icon
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: cfg.bg, color: cfg.color,
      fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
      textTransform: 'capitalize',
    }}>
      <Icon size={11} />
      {cfg.label}
    </span>
  )
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function MerchantApplications() {
  const { applications } = useOutletContext<OutletCtx>()
  const navigate = useNavigate()

  return (
    <div style={{ padding: '28px 32px', maxWidth: 900, margin: '0 auto' }}>
      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>My Applications</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            {applications.length === 0
              ? 'No applications yet'
              : `${applications.length} application${applications.length !== 1 ? 's' : ''} on file`}
          </p>
        </div>
        <button
          onClick={() => navigate('/merchant/applications/new')}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '10px 18px', borderRadius: 10, border: 'none',
            background: '#4f46e5', color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', boxShadow: '0 2px 8px rgba(79,70,229,.3)',
          }}
        >
          <Plus size={15} /> New Application
        </button>
      </div>

      {/* ── Empty state ── */}
      {applications.length === 0 && (
        <div style={{
          background: '#fff', borderRadius: 16, border: '2px dashed #e2e8f0',
          padding: '60px 40px', textAlign: 'center',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: '#e0e7ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <FileText size={24} color="#4f46e5" />
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
            No applications yet
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}>
            Start your first funding application to get started.
          </p>
          <button
            onClick={() => navigate('/merchant/applications/new')}
            style={{
              padding: '10px 22px', borderRadius: 10, border: 'none',
              background: '#4f46e5', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Start Application
          </button>
        </div>
      )}

      {/* ── Applications list ── */}
      {applications.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {applications.map((app) => (
            <div
              key={app.id}
              onClick={() => app.lead_token && navigate(`/merchant/${app.lead_token}`)}
              style={{
                background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0',
                padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16,
                cursor: app.lead_token ? 'pointer' : 'default',
                transition: 'border-color .15s, box-shadow .15s',
              }}
              onMouseEnter={e => {
                if (app.lead_token) {
                  (e.currentTarget as HTMLElement).style.borderColor = '#818cf8'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(99,102,241,.12)'
                }
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'
                ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
              }}
            >
              {/* Icon */}
              <div style={{
                width: 42, height: 42, borderRadius: 10, background: '#e0e7ff', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <FileText size={18} color="#4f46e5" />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  margin: '0 0 3px', fontSize: 14, fontWeight: 700, color: '#0f172a',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {app.business_name || app.applicant || `Application #${app.id}`}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                  Submitted {fmtDate(app.created_at)}
                </p>
              </div>

              {/* Status */}
              <StatusBadge status={app.lead_status} />

              {/* Arrow */}
              {app.lead_token && <ChevronRight size={16} color="#94a3b8" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
