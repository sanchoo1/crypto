import { useState } from 'react'
import PriceOracle from './PriceOracle'
import PositionCard from './PositionCard'
import OpenPositionForm from './OpenPositionForm'
import { formatHBTC, formatNumber } from '../utils/math'

/**
 * Dashboard Component
 * Main application layout with positions, wallet info, and forms
 */
export default function Dashboard({
  positions,
  btcPrice,
  wallet,
  loading,
  onOpenPosition,
  onClosePosition,
  useMock
}) {
  const [showOpenForm, setShowOpenForm] = useState(false)

  // Calculate total portfolio metrics
  const totalCollateral = positions.reduce((sum, p) => sum + p.collateralHBTC, 0)
  const totalUnrealizedPnL = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0)
  const totalExposure = positions.reduce((sum, p) => sum + p.sizeUSD, 0)

  // Step 3 diagnostic log
  console.log('🎯 Dashboard rendering with positions:', positions.length, positions)

  // Sort positions by openedAt timestamp, most recent first
  const sortedPositions = [...positions].sort((a, b) =>
    new Date(b.openedAt) - new Date(a.openedAt)
  )

  return (
    <div className="space-y-6">
      {/* Header with price oracle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Positions</h1>
          <p className="text-sm text-light-muted dark:text-dark-muted">
            {positions.length} active position{positions.length !== 1 ? 's' : ''}
          </p>
        </div>

        <PriceOracle price={btcPrice} useMock={useMock} />
      </div>

      {/* Portfolio summary */}
      {positions.length > 0 && (
        <div className="grid grid-cols-4 gap-4 animate-fade-in">
          <div className="p-5 rounded-xl border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface shadow-soft card-hover">
            <div className="text-xs uppercase tracking-wide text-light-muted dark:text-dark-muted mb-2 font-medium">
              Total Exposure
            </div>
            <div className="font-mono text-xl font-semibold">
              ${formatNumber(totalExposure, 0)}
            </div>
          </div>

          <div className="p-5 rounded-xl border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface shadow-soft card-hover">
            <div className="text-xs uppercase tracking-wide text-light-muted dark:text-dark-muted mb-2 font-medium">
              Total Collateral
            </div>
            <div className="font-mono text-xl font-semibold">
              {formatHBTC(totalCollateral)} hBTC
            </div>
          </div>

          <div className="p-5 rounded-xl border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface shadow-soft card-hover">
            <div className="text-xs uppercase tracking-wide text-light-muted dark:text-dark-muted mb-2 font-medium">
              Unrealized P&L
            </div>
            <div className={`
              font-mono text-xl font-semibold
              ${totalUnrealizedPnL > 0
                ? 'text-status-safe-light dark:text-status-safe-dark'
                : 'text-status-danger-light dark:text-status-danger-dark'
              }
            `}>
              {totalUnrealizedPnL > 0 ? '+' : ''}{formatHBTC(totalUnrealizedPnL)} hBTC
            </div>
          </div>

          <div className="p-5 rounded-xl border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface shadow-soft card-hover">
            <div className="text-xs uppercase tracking-wide text-light-muted dark:text-dark-muted mb-2 font-medium">
              Wallet Balance
            </div>
            <div className="font-mono text-xl font-semibold">
              {formatHBTC(wallet.hBTCBalance)} hBTC
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowOpenForm(!showOpenForm)}
          className="px-6 py-2.5 text-sm font-medium rounded-lg border border-status-accent-light dark:border-status-accent-dark text-status-accent-light dark:text-status-accent-dark hover:bg-status-accent-light hover:text-white dark:hover:bg-status-accent-dark dark:hover:text-white hover:scale-105 transition-smooth shadow-soft"
        >
          {showOpenForm ? 'Hide Form' : 'Open New Position'}
        </button>
      </div>

      {/* Open position form */}
      {showOpenForm && (
        <OpenPositionForm
          onOpen={async (...args) => {
            const result = await onOpenPosition(...args)
            if (result.success) {
              setShowOpenForm(false)
            }
            return result
          }}
          loading={loading}
          btcPrice={btcPrice}
          hBTCBalance={wallet.hBTCBalance}
        />
      )}

      {/* Positions list */}
      {positions.length === 0 ? (
        <div className="p-12 text-center rounded border border-dashed border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg">
          <p className="text-light-muted dark:text-dark-muted mb-2">
            No open positions
          </p>
          <button
            onClick={() => setShowOpenForm(true)}
            className="text-sm text-status-accent-light dark:text-status-accent-dark hover:underline"
          >
            Open your first position
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {sortedPositions.map((position) => (
            <PositionCard
              key={position.id}
              position={position}
              onClose={onClosePosition}
              loading={loading}
            />
          ))}
        </div>
      )}
    </div>
  )
}
