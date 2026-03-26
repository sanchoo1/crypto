/**
 * Core math utilities for Inverse Perpetual Protocol
 * All calculations follow the spec formulas exactly
 */

export const FORMULA_VERSION = 'B'

/**
 * Calculate Unrealized P&L in hBTC for a SHORT position
 * Formula: S × (1/P_current − 1/P_entry)
 *
 * @param {number} positionSizeUSD - Position size in USD (S)
 * @param {number} entryPrice - Entry price (P_entry)
 * @param {number} currentPrice - Current BTC/USD price (P_current)
 * @returns {number} Unrealized P&L in hBTC
 */
export function calcUnrealizedPnL(positionSizeUSD, entryPrice, currentPrice) {
  return positionSizeUSD * (1 / currentPrice - 1 / entryPrice)
}

export function calcHealthFactor(collateral, pnl, sizeUSD, currentPrice, mmr = 0.05) {
  const numerator = currentPrice * (collateral + pnl)
  const denominator = sizeUSD * mmr
  if (denominator === 0) return Infinity
  return numerator / denominator
}

/**
 * Check if a position is liquidatable
 *
 * @param {number} healthFactor - Health Factor
 * @returns {boolean} True if liquidatable (HF < 1)
 */
export function isLiquidatable(healthFactor) {
  return healthFactor < 1
}

/**
 * Check if a position is at warning level
 *
 * @param {number} healthFactor - Health Factor
 * @returns {boolean} True if in warning zone (1 <= HF < 1.5)
 */
export function isWarningLevel(healthFactor) {
  return healthFactor >= 1 && healthFactor < 1.5
}

/**
 * Check if a position is safe
 *
 * @param {number} healthFactor - Health Factor
 * @returns {boolean} True if safe (HF >= 1.5)
 */
export function isSafe(healthFactor) {
  return healthFactor >= 1.5
}

/**
 * Calculate liquidation price for a SHORT position (Formula B)
 * Solves Health Factor = 1 for P_current
 *
 * Formula B: HF = P × (collateral + pnl) / (sizeUSD × MMR)
 * Set HF = 1 and solve for P:
 * P = (sizeUSD × MMR) / (collateral + pnl)
 *
 * @param {number} collateralHBTC - Collateral balance in hBTC
 * @param {number} unrealizedPnL - Unrealized P&L in hBTC
 * @param {number} positionSizeUSD - Position size in USD (S)
 * @param {number} mmr - Maintenance Margin Ratio (default 0.05)
 * @returns {number} Liquidation price
 */
export function calcLiquidationPrice(collateralHBTC, unrealizedPnL, sizeUSD, mmr = 0.05) {
  const netMargin = collateralHBTC + unrealizedPnL
  if (netMargin <= 0) return null
  return (sizeUSD * mmr) / netMargin
}

/**
 * Get health status label
 *
 * @param {number} healthFactor - Health Factor
 * @returns {string} Status label: "CRITICAL", "WARNING", or "SAFE"
 */
export function getHealthStatus(healthFactor) {
  if (healthFactor < 1) return 'CRITICAL'
  if (healthFactor < 1.5) return 'WARNING'
  return 'SAFE'
}

/**
 * Get health color classes for Tailwind
 *
 * @param {number} healthFactor - Health Factor
 * @returns {string} Tailwind color classes
 */
export function getHealthColor(healthFactor) {
  if (healthFactor < 1) {
    return 'text-status-danger-light dark:text-status-danger-dark'
  }
  if (healthFactor < 1.5) {
    return 'text-status-warning-light dark:text-status-warning-dark'
  }
  return 'text-status-safe-light dark:text-status-safe-dark'
}

/**
 * Get health background color classes for Tailwind
 *
 * @param {number} healthFactor - Health Factor
 * @returns {string} Tailwind background color classes
 */
export function getHealthBgColor(healthFactor) {
  if (healthFactor < 1) {
    return 'bg-status-danger-light dark:bg-status-danger-dark'
  }
  if (healthFactor < 1.5) {
    return 'bg-status-warning-light dark:bg-status-warning-dark'
  }
  return 'bg-status-safe-light dark:bg-status-safe-dark'
}

/**
 * Format number to fixed decimals with proper precision
 *
 * @param {number} value - Number to format
 * @param {number} decimals - Decimal places (default 4 for hBTC)
 * @returns {string} Formatted number
 */
export function formatNumber(value, decimals = 4) {
  return value.toFixed(decimals)
}

/**
 * Format USD with 2 decimal places and thousands separators
 *
 * @param {number} value - USD value
 * @returns {string} Formatted USD string
 */
export function formatUSD(value) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/**
 * Format hBTC with 4-6 decimal places (depending on value)
 *
 * @param {number} value - hBTC value
 * @returns {string} Formatted hBTC string
 */
export function formatHBTC(value) {
  if (Math.abs(value) < 0.0001) {
    return value.toFixed(6)
  }
  return value.toFixed(4)
}

/**
 * Shorten Ethereum address for display
 *
 * @param {string} address - Full Ethereum address
 * @param {number} prefixLength - Characters to show at start (default 6)
 * @param {number} suffixLength - Characters to show at end (default 4)
 * @returns {string} Shortened address
 */
export function shortenAddress(address, prefixLength = 6, suffixLength = 4) {
  if (!address) return ''
  if (address.length < prefixLength + suffixLength) return address
  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`
}
