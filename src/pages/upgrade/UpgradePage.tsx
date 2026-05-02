import { useQuery } from '@tanstack/react-query'
import {
  Package, Sparkles, CheckCircle2, Zap, Crown,
  ArrowRight, Mail,
} from 'lucide-react'
import {
  packageService,
  type PortalPackage,
  type ClientPackageInfo,
} from '../../services/package.service'
import { Badge } from '../../components/ui/Badge'
import { cn } from '../../utils/cn'
import { useTrialStatus } from '../../hooks/useTrialStatus'

export function UpgradePage() {
  const { isTrial, isExpired, daysRemaining } = useTrialStatus()

  const { data: pkgData, isLoading: pkgLoading } = useQuery({
    queryKey: ['portal-packages'],
    queryFn: () => packageService.getPortalPackages(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: clientPkgData } = useQuery({
    queryKey: ['client-packages'],
    queryFn: () => packageService.getClientPackages(),
    staleTime: 5 * 60 * 1000,
  })

  const packages: PortalPackage[] = pkgData?.data?.data ?? []
  const clientPackages: ClientPackageInfo[] = clientPkgData?.data?.data ?? []
  const activeKeys = new Set(clientPackages.map(cp => cp.package_key))

  // Filter out trial packages from the upgrade list
  const upgradePlans = packages.filter(p => !p.is_trial)

  const handleChoosePlan = (pkg: PortalPackage) => {
    const subject = encodeURIComponent(`Upgrade Request: ${pkg.name}`)
    const body = encodeURIComponent(
      `Hi,\n\nI would like to upgrade to the ${pkg.name} plan ($${pkg.base_rate_monthly_billed}/mo).\n\nPlease assist with the upgrade process.\n\nThank you.`,
    )
    window.location.href = `mailto:support@rocketdialer.com?subject=${subject}&body=${body}`
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Upgrade Your Plan</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Choose the plan that best fits your business needs
        </p>
      </div>

      {/* Trial status card */}
      {isTrial && (
        <div
          className={cn(
            'rounded-xl p-4 border',
            isExpired
              ? 'bg-red-50 border-red-200'
              : 'bg-amber-50 border-amber-200',
          )}
        >
          <div className="flex items-center gap-3">
            {isExpired ? (
              <>
                <Crown size={20} className="text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    Your trial has expired
                  </p>
                  <p className="text-xs text-red-600 mt-0.5">
                    Choose a plan below to continue using all features.
                  </p>
                </div>
              </>
            ) : (
              <>
                <Sparkles size={20} className="text-amber-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left on
                    your free trial
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Upgrade before your trial ends to avoid service interruption.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Package cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {pkgLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 animate-pulse space-y-4">
                <div className="h-6 bg-slate-200 rounded w-2/3" />
                <div className="h-12 bg-slate-200 rounded" />
                <div className="space-y-2">
                  {[1, 2, 3].map(j => (
                    <div key={j} className="h-4 bg-slate-200 rounded" />
                  ))}
                </div>
              </div>
            ))
          : upgradePlans.map(pkg => {
              const isCurrent = activeKeys.has(pkg.key)
              const isPopular =
                pkg.name.toLowerCase().includes('standard')

              return (
                <div
                  key={pkg.key}
                  className={cn(
                    'bg-white rounded-2xl border border-slate-100 shadow-sm p-6 relative overflow-hidden transition-all hover:shadow-lg',
                    isPopular &&
                      !isCurrent &&
                      'ring-2 ring-indigo-500 shadow-indigo-100 shadow-lg',
                    isCurrent &&
                      'ring-2 ring-emerald-500 shadow-emerald-100',
                  )}
                >
                  {/* Popular badge */}
                  {isPopular && !isCurrent && (
                    <div className="absolute top-4 right-4">
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-[11px] font-bold">
                        <Zap size={10} /> Most Popular
                      </span>
                    </div>
                  )}

                  {/* Current plan badge */}
                  {isCurrent && (
                    <div className="absolute top-4 right-4">
                      <Badge variant="green">Current Plan</Badge>
                    </div>
                  )}

                  {/* Package icon */}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-4">
                    <Package size={20} className="text-white" />
                  </div>

                  {/* Name + price */}
                  <h3 className="font-bold text-slate-900 text-lg">
                    {pkg.name}
                  </h3>
                  {pkg.description && (
                    <p
                      className="text-xs text-slate-500 mt-1 line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: pkg.description }}
                    />
                  )}
                  <div className="flex items-end gap-1 mt-3 mb-5">
                    <span className="text-4xl font-bold text-indigo-600">
                      ${pkg.base_rate_monthly_billed}
                    </span>
                    <span className="text-slate-500 text-sm mb-1">/mo</span>
                  </div>

                  {/* Billing tiers */}
                  <div className="flex gap-2 mb-4 text-[11px] text-slate-500">
                    <span className="px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100">
                      Quarterly ${pkg.base_rate_quarterly_billed}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100">
                      Yearly ${pkg.base_rate_yearly_billed}
                    </span>
                  </div>

                  {/* Module list */}
                  <div className="space-y-2 text-sm text-slate-600">
                    {(Array.isArray(pkg.modules) ? pkg.modules : Object.values(pkg.modules ?? {})).map((mod: any) => (
                      <div key={mod.key} className="flex items-center gap-2">
                        <CheckCircle2
                          size={15}
                          className="text-emerald-500 flex-shrink-0"
                        />
                        <span>{mod.name}</span>
                      </div>
                    ))}
                  </div>

                  {/* Free allowances */}
                  {(pkg.free_call_minute_monthly > 0 ||
                    pkg.free_sms_monthly > 0) && (
                    <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                      {pkg.free_call_minute_monthly > 0 && (
                        <p>
                          {pkg.free_call_minute_monthly} free call minutes/mo
                        </p>
                      )}
                      {pkg.free_sms_monthly > 0 && (
                        <p>{pkg.free_sms_monthly} free SMS/mo</p>
                      )}
                    </div>
                  )}

                  {/* CTA button */}
                  {isCurrent ? (
                    <div className="w-full mt-6 py-2.5 rounded-xl font-semibold text-sm text-center bg-slate-100 text-slate-500">
                      Your Current Plan
                    </div>
                  ) : (
                    <button
                      onClick={() => handleChoosePlan(pkg)}
                      className={cn(
                        'w-full mt-6 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer',
                        isPopular
                          ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200 hover:shadow-indigo-300'
                          : 'border-2 border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-700',
                      )}
                    >
                      Choose Plan <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              )
            })}
      </div>

      {/* Contact section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm text-center py-8">
        <p className="text-sm text-slate-500">
          Need a custom plan or have questions about upgrading?
        </p>
        <div className="flex items-center justify-center gap-4 mt-3">
          <a
            href="mailto:support@rocketdialer.com"
            className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            <Mail size={14} /> support@rocketdialer.com
          </a>
        </div>
      </div>
    </div>
  )
}
