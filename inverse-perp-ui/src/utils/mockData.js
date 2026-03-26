/**
 * Mock data for UI development
 * Switch to real contract data when Role A delivers ABI
 */

// Current BTC/USD price (will fluctuate in mock mode)
export const MOCK_BTC_PRICE = 67420.00

// Mock user wallet data
export const MOCK_WALLET = {
  address: "0xAbCd1234567890eFgH1234567890AbCd12345678",
  hBTCBalance: 2.5  // Increased to allow opening safe positions
}

// Mock positions - realistic positions demonstrating all 3 health states
// With BTC ~$67k, these show: SAFE, WARNING, and CRITICAL
export const MOCK_POSITIONS = [
  // SAFE — short opened at 70k, BTC now ~67k, winning + good collateral
  {
    id: "0x001",
    type: "SHORT",
    sizeUSD: 10000,
    entryPrice: 70000,
    collateralHBTC: 0.75,
    openedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
  },
  // WARNING — losing position, thin collateral, borderline
  {
    id: "0x002",
    type: "SHORT",
    sizeUSD: 15000,
    entryPrice: 66000,
    collateralHBTC: 0.08,
    openedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
  },
  // CRITICAL — losing badly, almost no collateral, liquidates immediately
  {
    id: "0x003",
    type: "SHORT",
    sizeUSD: 20000,
    entryPrice: 64000,
    collateralHBTC: 0.05,
    openedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() // 3 hours ago
  }
]

// Mock transaction history
export const MOCK_TRANSACTIONS = [
  {
    id: "0xabc123",
    type: "OPEN_POSITION",
    timestamp: "2025-01-10T14:23:00Z",
    positionId: "0x001",
    status: "confirmed"
  },
  {
    id: "0xdef456",
    type: "OPEN_POSITION",
    timestamp: "2025-01-11T09:15:00Z",
    positionId: "0x002",
    status: "confirmed"
  }
]

// Maintenance Margin Ratio (5%)
export const MMR = 0.05

// Chainlink BTC/USD feed address on Sepolia
export const CHAINLINK_BTC_USD_SEPOLIA = "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43"

/**
 * Simulate BTC price movement for demo
 * Returns a new price with small random fluctuation
 */
export function simulatePriceMovement(currentPrice) {
  const change = (Math.random() - 0.5) * 200 // +/- $100
  return currentPrice + change
}

/**
 * Generate a mock transaction hash
 */
export function generateMockTxHash() {
  return '0x' + Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('')
}

/**
 * Simulate network delay for mock transactions
 */
export function mockDelay(ms = 1500) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
