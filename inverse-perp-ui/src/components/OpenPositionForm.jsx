import { useState } from 'react'
import { calcHealthFactor, formatHBTC } from '../utils/math'

/**
 * OpenPositionForm Component
 * Form to open a new short position
 */
export default function OpenPositionForm({ onOpen, loading, btcPrice, hBTCBalance }) {
  const [sizeUSD, setSizeUSD] = useState('')
  const [collateral, setCollateral] = useState('')
  const [direction] = useState('SHORT') // Only SHORT for now as per spec

  // Calculate estimated initial health factor (P&L = 0 at open)
  const estimatedHF = sizeUSD && collateral
    ? calcHealthFactor(parseFloat(collateral), 0, parseFloat(sizeUSD), btcPrice)
    : null

  // Calculate recommended minimum collateral for HF ≥ 1.5 (in hBTC)
  const safeCollateral = sizeUSD && btcPrice
    ? ((parseFloat(sizeUSD) * 0.05 * 1.5) / btcPrice).toFixed(4)
    : null

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!sizeUSD || !collateral) {
      alert('Please fill in all fields')
      return
    }

    const size = parseFloat(sizeUSD)
    const coll = parseFloat(collateral)

    // Validation
    if (size <= 0 || coll <= 0) {
      alert('Values must be greater than 0')
      return
    }

    if (coll > hBTCBalance) {
      alert(`Insufficient hBTC balance. You have ${formatHBTC(hBTCBalance)} hBTC`)
      return
    }

    // Check minimum health factor - only warn if genuinely dangerous
    const initialHF = calcHealthFactor(coll, 0, size, btcPrice)
    if (initialHF < 1.0) {
      const confirm = window.confirm(
        `Warning: This position opens with Health Factor ${initialHF.toFixed(2)}, which is already at liquidation risk. Continue anyway?`
      )
      if (!confirm) return
    }

    await onOpen(size, coll, direction)

    // Clear form on success
    setSizeUSD('')
    setCollateral('')
  }

  const getHFColor = (hf) => {
    if (!hf) return 'text-light-muted dark:text-dark-muted'
    if (hf < 1) return 'text-status-danger-light dark:text-status-danger-dark'
    if (hf < 1.5) return 'text-status-warning-light dark:text-status-warning-dark'
    return 'text-status-safe-light dark:text-status-safe-dark'
  }

  return (
    <div className="p-6 rounded-2xl border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface shadow-soft animate-slide-down">
      <h2 className="text-lg font-semibold mb-6">Open Position</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Direction (fixed to SHORT) */}
        <div>
          <label className="block text-sm text-light-muted dark:text-dark-muted mb-1.5">
            Direction
          </label>
          <div className="px-4 py-2.5 rounded border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg">
            <span className="font-mono text-sm">SHORT</span>
          </div>
          <p className="text-xs text-light-muted dark:text-dark-muted mt-1">
            Profit when BTC price decreases
          </p>
        </div>

        {/* Position Size */}
        <div>
          <label className="block text-sm text-light-muted dark:text-dark-muted mb-1.5">
            Position Size (USD)
          </label>
          <input
            type="number"
            value={sizeUSD}
            onChange={(e) => setSizeUSD(e.target.value)}
            placeholder="10000"
            step="100"
            min="0"
            className="w-full px-4 py-3 rounded-lg border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface font-mono text-sm transition-smooth focus:outline-none focus:ring-2 focus:ring-status-accent-light dark:focus:ring-status-accent-dark focus:border-transparent shadow-soft"
          />
          {btcPrice && sizeUSD && (
            <p className="text-xs text-light-muted dark:text-dark-muted mt-1">
              ≈ {(parseFloat(sizeUSD) / btcPrice).toFixed(4)} BTC exposure
            </p>
          )}
        </div>

        {/* Collateral */}
        <div>
          <label className="block text-sm text-light-muted dark:text-dark-muted mb-1.5">
            Collateral (hBTC)
          </label>
          <input
            type="number"
            value={collateral}
            onChange={(e) => setCollateral(e.target.value)}
            placeholder="0.80"
            step="0.0001"
            min="0"
            className="w-full px-4 py-3 rounded-lg border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface font-mono text-sm transition-smooth focus:outline-none focus:ring-2 focus:ring-status-accent-light dark:focus:ring-status-accent-dark focus:border-transparent shadow-soft"
          />
          <p className="text-xs text-light-muted dark:text-dark-muted mt-1">
            Available: {formatHBTC(hBTCBalance)} hBTC
          </p>
        </div>

        {/* Estimated Health Factor */}
        {estimatedHF && (
          <div className="p-3 rounded bg-light-bg dark:bg-dark-bg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-light-muted dark:text-dark-muted">
                Initial Health Factor
              </span>
              <span className={`text-sm font-mono font-semibold ${getHFColor(estimatedHF)}`}>
                {estimatedHF.toFixed(2)}
              </span>
            </div>
            {estimatedHF < 1.5 && safeCollateral && (
              <p className="text-xs text-status-warning-light dark:text-status-warning-dark mt-1">
                ⚠ Recommended minimum: {safeCollateral} hBTC for HF ≥ 1.5
              </p>
            )}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || !sizeUSD || !collateral}
          className="w-full px-4 py-3 text-sm font-medium rounded-lg border border-status-accent-light dark:border-status-accent-dark text-status-accent-light dark:text-status-accent-dark hover:bg-status-accent-light hover:text-white dark:hover:bg-status-accent-dark dark:hover:text-white hover:scale-[1.02] transition-smooth disabled:opacity-50 disabled:cursor-not-allowed shadow-soft"
        >
          {loading ? 'Opening Position...' : 'Open Short Position'}
        </button>
      </form>

      {/* Info box */}
      <div className="mt-4 p-3 rounded border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg">
        <p className="text-xs text-light-muted dark:text-dark-muted leading-relaxed">
          <strong>How it works:</strong> You deposit hBTC as collateral and open a short position.
          You profit when BTC price goes down. Maintain Health Factor above 1.0 to avoid liquidation.
        </p>
      </div>
    </div>
  )
}
