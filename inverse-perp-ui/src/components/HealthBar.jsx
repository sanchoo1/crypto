import { getHealthStatus, getHealthBgColor } from '../utils/math'

/**
 * HealthBar Component
 * Visual health factor indicator with color coding
 * Green (>1.5) = Safe, Amber (1-1.5) = Warning, Red (<1) = Critical
 */
export default function HealthBar({ healthFactor }) {
  const status = getHealthStatus(healthFactor)

  // Calculate bar width (capped at 100% for display)
  // Show 0-3 range, where 3 = 100%
  const maxDisplay = 3
  const percentage = Math.min((healthFactor / maxDisplay) * 100, 100)

  // Get color based on health factor
  const getBarColor = () => {
    if (healthFactor < 1) {
      return 'bg-status-danger-light dark:bg-status-danger-dark'
    }
    if (healthFactor < 1.5) {
      return 'bg-status-warning-light dark:bg-status-warning-dark'
    }
    return 'bg-status-safe-light dark:bg-status-safe-dark'
  }

  return (
    <div className="w-full">
      {/* Bar container */}
      <div className="relative w-full h-1 bg-light-bg dark:bg-dark-bg rounded-full overflow-hidden">
        {/* Filled bar */}
        <div
          className={`h-full transition-all duration-300 ${getBarColor()}`}
          style={{ width: `${percentage}%` }}
        />

        {/* Critical threshold marker at HF=1 */}
        <div
          className="absolute top-0 h-full w-0.5 bg-light-border dark:bg-dark-border"
          style={{ left: `${(1 / maxDisplay) * 100}%` }}
        />

        {/* Warning threshold marker at HF=1.5 */}
        <div
          className="absolute top-0 h-full w-0.5 bg-light-border dark:bg-dark-border"
          style={{ left: `${(1.5 / maxDisplay) * 100}%` }}
        />
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between mt-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-light-muted dark:text-dark-muted">
            Health Factor
          </span>
          <span className={`text-xs font-mono font-semibold ${getHealthBgColor(healthFactor).replace('bg-', 'text-')}`}>
            {healthFactor.toFixed(2)}
          </span>
        </div>

        <div className={`text-xs font-medium ${getHealthBgColor(healthFactor).replace('bg-', 'text-')}`}>
          {status}
        </div>
      </div>
    </div>
  )
}
