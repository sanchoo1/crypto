import HealthBar from './HealthBar'
import { formatUSD, formatHBTC, isLiquidatable, isWarningLevel } from '../utils/math'

/**
 * PositionCard Component
 * Displays individual position with P&L, health factor, and controls
 */
export default function PositionCard({ position, onClose, loading }) {
  const {
    id,
    type,
    sizeUSD,
    entryPrice,
    collateralHBTC,
    unrealizedPnL,
    healthFactor,
    liquidationPrice,
    currentPrice,
    openedAt
  } = position

  const isProfitable = unrealizedPnL > 0
  const isAtRisk = isLiquidatable(healthFactor)
  const isWarning = isWarningLevel(healthFactor)

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className={`
      relative p-6 rounded-2xl border transition-smooth card-hover animate-slide-up shadow-soft
      ${isAtRisk
        ? 'border-status-danger-light dark:border-status-danger-dark bg-red-50 dark:bg-red-950/20 shadow-glow-red'
        : (isWarning && !isProfitable)
        ? 'border-status-warning-light dark:border-status-warning-dark'
        : 'border-light-border dark:border-dark-border'
      }
      bg-light-surface dark:bg-dark-surface
    `}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-light-bg dark:bg-dark-bg text-light-muted dark:text-dark-muted font-medium">
              {type}
            </span>
            <span className="text-xs font-mono text-light-muted dark:text-dark-muted">
              ID: {id.slice(0, 10)}
            </span>
          </div>
          <span className="text-xs text-light-muted dark:text-dark-muted">
            Opened {formatDate(openedAt)}
          </span>
        </div>

        {/* Close button */}
        <button
          onClick={() => onClose(id)}
          disabled={loading}
          className="px-4 py-1.5 text-xs font-medium border border-light-border dark:border-dark-border rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg hover:scale-105 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Closing...' : 'Close'}
        </button>
      </div>

      {/* Critical warning banner */}
      {isAtRisk && (
        <div className="mb-4 p-3 rounded bg-status-danger-light/10 dark:bg-status-danger-dark/10 border border-status-danger-light dark:border-status-danger-dark">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <span className="text-sm font-semibold text-status-danger-light dark:text-status-danger-dark">
              LIQUIDATION RISK - Health Factor below 1.0
            </span>
          </div>
        </div>
      )}

      {/* Position details grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Size */}
        <div>
          <div className="text-xs text-light-muted dark:text-dark-muted mb-1">
            Position Size
          </div>
          <div className="font-mono text-base font-semibold">
            ${formatUSD(sizeUSD)}
          </div>
        </div>

        {/* Collateral */}
        <div>
          <div className="text-xs text-light-muted dark:text-dark-muted mb-1">
            Collateral
          </div>
          <div className="font-mono text-base font-semibold">
            {formatHBTC(collateralHBTC)} hBTC
          </div>
        </div>

        {/* Entry price */}
        <div>
          <div className="text-xs text-light-muted dark:text-dark-muted mb-1">
            Entry Price
          </div>
          <div className="font-mono text-base">
            ${formatUSD(entryPrice)}
          </div>
        </div>

        {/* Current price */}
        <div>
          <div className="text-xs text-light-muted dark:text-dark-muted mb-1">
            Current Price
          </div>
          <div className="font-mono text-base">
            ${formatUSD(currentPrice)}
          </div>
        </div>

        {/* Unrealized P&L */}
        <div>
          <div className="text-xs text-light-muted dark:text-dark-muted mb-1">
            Unrealized P&L
          </div>
          <div className={`
            font-mono text-base font-semibold
            ${isProfitable
              ? 'text-status-safe-light dark:text-status-safe-dark'
              : 'text-status-danger-light dark:text-status-danger-dark'
            }
          `}>
            {isProfitable ? '+' : ''}{formatHBTC(unrealizedPnL)} hBTC
          </div>
        </div>

        {/* Liquidation price */}
        <div>
          <div className="text-xs text-light-muted dark:text-dark-muted mb-1">
            Liquidation Price
          </div>
          <div className={`
            font-mono text-base
            ${(isAtRisk || (isWarning && !isProfitable))
              ? 'text-status-warning-light dark:text-status-warning-dark'
              : 'text-light-text dark:text-dark-text'
            }
          `}>
            {liquidationPrice === null || liquidationPrice === Infinity || liquidationPrice <= 0
              ? 'N/A'
              : liquidationPrice > currentPrice
              ? 'Exceeded'
              : `$${formatUSD(liquidationPrice)}`
            }
          </div>
        </div>
      </div>

      {/* Health bar */}
      <div className="pt-4 border-t border-light-border dark:border-dark-border">
        <HealthBar healthFactor={healthFactor} />
      </div>
    </div>
  )
}
