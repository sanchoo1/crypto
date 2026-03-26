import { useState, useEffect } from 'react'
import { formatUSD } from '../utils/math'

/**
 * PriceOracle Component
 * Displays live BTC/USD price with animated updates
 */
export default function PriceOracle({ price, useMock = true }) {
  const [priceChange, setPriceChange] = useState(null)
  const [prevPrice, setPrevPrice] = useState(price)

  useEffect(() => {
    if (price !== prevPrice) {
      setPriceChange(price > prevPrice ? 'up' : 'down')
      setPrevPrice(price)

      // Clear animation after delay
      const timer = setTimeout(() => setPriceChange(null), 600)
      return () => clearTimeout(timer)
    }
  }, [price])

  return (
    <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface shadow-soft animate-scale-in">
      {/* BTC Icon */}
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm shadow-soft">
          ₿
        </div>
        <span className="text-sm font-medium text-light-muted dark:text-dark-muted">
          BTC/USD
        </span>
      </div>

      {/* Price */}
      <div className="flex items-center gap-2">
        <span
          className={`
            font-mono text-2xl font-semibold transition-theme
            ${priceChange === 'up'
              ? 'text-status-safe-light dark:text-status-safe-dark'
              : priceChange === 'down'
              ? 'text-status-danger-light dark:text-status-danger-dark'
              : 'text-light-text dark:text-dark-text'
            }
          `}
        >
          ${formatUSD(price)}
        </span>

        {/* Price change indicator */}
        {priceChange && (
          <span
            className={`
              text-sm
              ${priceChange === 'up'
                ? 'text-status-safe-light dark:text-status-safe-dark'
                : 'text-status-danger-light dark:text-status-danger-dark'
              }
            `}
          >
            {priceChange === 'up' ? '↑' : '↓'}
          </span>
        )}
      </div>

      {/* Mock/Live indicator */}
      {useMock && (
        <div className="px-2 py-0.5 rounded text-xs font-mono bg-light-bg dark:bg-dark-bg text-light-muted dark:text-dark-muted">
          MOCK
        </div>
      )}
    </div>
  )
}
