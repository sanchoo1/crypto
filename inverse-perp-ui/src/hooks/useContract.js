import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { MOCK_POSITIONS, MOCK_BTC_PRICE, MOCK_WALLET, simulatePriceMovement, mockDelay, generateMockTxHash } from '../utils/mockData'
import { calcUnrealizedPnL, calcHealthFactor, calcLiquidationPrice } from '../utils/math'
import { VAULT_ADDRESS, VAULT_ABI, HBTC_ABI, HBTC_ADDRESS, RPC_URL } from '../constants/contracts'

/**
 * Custom hook for interacting with the Vault contract
 * Supports both mock mode and real contract mode with toggleable state
 */
export function useContract(signer, account) {
  // Mock mode toggle - persisted in localStorage
  const [isMockMode, setIsMockMode] = useState(() => {
    const saved = localStorage.getItem('mockMode')
    return saved === null ? true : saved === 'true'
  })

  const [positions, setPositions] = useState([])
  const [btcPrice, setBtcPrice] = useState(MOCK_BTC_PRICE)
  const [wallet, setWallet] = useState(MOCK_WALLET)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  // Ghost position: keeps liquidated positions visible for 30s before clearing
  const [ghostPosition, setGhostPosition] = useState(null)

  /**
   * Toggle between mock and live mode
   */
  const toggleMockMode = () => {
    const confirmSwitch = isMockMode
      ? window.confirm(
          'Switch to Live Mode?\n\n' +
          'This requires deployed contracts at the addresses in .env.\n' +
          'Switching without deployed contracts will cause errors.\n\n' +
          'Continue?'
        )
      : true

    if (!confirmSwitch) return

    setIsMockMode(prev => {
      const newMode = !prev
      localStorage.setItem('mockMode', String(newMode))
      return newMode
    })
  }

  /**
   * Enrich positions with computed P&L, health factor, and liquidation price
   */
  const enrichPositions = (rawPositions, price) => {
    return rawPositions.map(pos => {
      const pnl = calcUnrealizedPnL(pos.sizeUSD, pos.entryPrice, price)
      const hf = calcHealthFactor(pos.collateralHBTC, pnl, pos.sizeUSD, price)
      const liqPrice = calcLiquidationPrice(pos.collateralHBTC, pnl, pos.sizeUSD)

      return {
        ...pos,
        unrealizedPnL: pnl,
        healthFactor: hf,
        liquidationPrice: liqPrice,
        currentPrice: price
      }
    })
  }

  /**
   * Fetch positions from contract or mock data
   */
  const fetchPositions = async () => {
    if (isMockMode) {
      // Mock mode
      const enriched = enrichPositions(MOCK_POSITIONS, btcPrice)
      setPositions(enriched)
      return
    }

    // Real contract mode
    try {
      setLoading(true)
      setError(null)

      // Create provider and vault interface for low-level call
      const provider = new ethers.JsonRpcProvider(RPC_URL)
      const vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, provider)

      // Use provider.call() first to get raw bytes — if '0x' skip decoding entirely
      const raw = await provider.call({
        to: VAULT_ADDRESS,
        data: vault.interface.encodeFunctionData('positions', [account])
      })

      // Empty response means no position
      if (!raw || raw === '0x') {
        setPositions([])
        return
      }

      // Safe to decode now
      const result = vault.interface.decodeFunctionResult('positions', raw)

      if (!result || result.sizeUsd.toString() === '0') {
        // Position gone — was it just liquidated? Show ghost for 30s
        setPositions(prev => {
          if (prev.length > 0 && !prev[0].isLiquidated) {
            const ghost = { ...prev[0], isLiquidated: true, healthFactor: 0 }
            setGhostPosition(ghost)
            setTimeout(() => {
              setGhostPosition(null)
              setPositions([])
            }, 30000) // 30 second display window
            return [ghost] // Immediately show as red
          }
          return []
        })
        return
      }

      const btcPriceValue = await fetchPrice()
      const pos = {
        id: account,
        type: result.isLong ? 'LONG' : 'SHORT',
        sizeUSD: parseFloat(ethers.formatUnits(result.sizeUsd, 18)),
        entryPrice: parseFloat(ethers.formatUnits(result.entryPrice, 18)), // WAD-scaled inside Vault
        collateralHBTC: parseFloat(ethers.formatUnits(result.collateral, 18)), // 18 decimals hBTC
        openedAt: new Date().toISOString()
      }
      setPositions(enrichPositions([pos], btcPriceValue))

    } catch (err) {
      console.log('No position found for account:', err.message)
      setPositions([])
    } finally {
      setLoading(false)
    }
  }

  /**
   * Fetch wallet balances
   */
  const fetchBalances = async () => {
    if (isMockMode) {
      setWallet(MOCK_WALLET)
      return
    }

    try {
      const hbtcContract = new ethers.Contract(HBTC_ADDRESS, HBTC_ABI, signer)

      const hbtcBalance = await hbtcContract.balanceOf(account)

      setWallet({
        address: account,
        hBTCBalance: parseFloat(ethers.formatUnits(hbtcBalance, 18)) // hBTC uses 18 decimals
      })

    } catch (err) {
      console.error("Failed to fetch balances:", err)
    }
  }

  /**
   * Open a new position
   */
  const openPosition = async (sizeUSD, collateral, direction = "SHORT") => {
    if (isMockMode) {
      // Mock mode
      console.log("🚀 openPosition called", { sizeUSD, collateral, direction })

      await mockDelay()

      const newPosition = {
        id: `0x${Date.now().toString(16)}`,
        type: direction,
        sizeUSD: parseFloat(sizeUSD),
        entryPrice: btcPrice,
        collateralHBTC: parseFloat(collateral),
        openedAt: new Date().toISOString()
      }

      console.log("📦 New position created:", newPosition)

      // Add to current positions state - CRITICAL: use functional update
      const enriched = enrichPositions([newPosition], btcPrice)
      console.log("✨ Enriched position:", enriched[0])

      setPositions(prev => {
        console.log("📋 Previous positions:", prev.length)
        const updated = [...prev, ...enriched]
        console.log("📋 Updated positions:", updated.length)
        return updated
      })

      // Deduct collateral from wallet
      setWallet(prev => ({
        ...prev,
        hBTCBalance: parseFloat((prev.hBTCBalance - parseFloat(collateral)).toFixed(4))
      }))

      console.log("✅ openPosition completed successfully")

      return {
        success: true,
        txHash: generateMockTxHash(),
        positionId: newPosition.id
      }
    }

    // Real contract mode
    try {
      setLoading(true)
      setError(null)

      // First approve hBTC spending
      const hbtcContract = new ethers.Contract(HBTC_ADDRESS, HBTC_ABI, signer)
      const collateralWei = ethers.parseUnits(collateral.toString(), 8)
      const approveTx = await hbtcContract.approve(VAULT_ADDRESS, collateralWei)
      await approveTx.wait()

      // Deposit collateral first
      const contract = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, signer)
      const depositTx = await contract.depositCollateral(collateralWei)
      await depositTx.wait()

      // Open position (direction: SHORT = false, LONG = true)
      const sizeWei = ethers.parseUnits(sizeUSD.toString(), 18)
      const isLong = direction === "LONG"
      const tx = await contract.openPosition(sizeWei, isLong)
      const receipt = await tx.wait()

      // Refresh positions
      await fetchPositions()

      return {
        success: true,
        txHash: receipt.hash,
        positionId: account // Use account as position ID
      }

    } catch (err) {
      console.error("Failed to open position:", err)
      setError(err.message)
      return {
        success: false,
        error: err.message
      }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Close a position
   */
  const closePosition = async (positionId) => {
    if (isMockMode) {
      // Mock mode
      console.log("MOCK: Closing position", positionId)

      await mockDelay()

      // Remove from positions
      setPositions(prev => prev.filter(p => p.id !== positionId))

      return {
        success: true,
        txHash: generateMockTxHash()
      }
    }

    // Real contract mode
    try {
      setLoading(true)
      setError(null)

      const contract = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, signer)
      const tx = await contract.closePosition()
      const receipt = await tx.wait()

      // Refresh positions
      await fetchPositions()

      return {
        success: true,
        txHash: receipt.hash
      }

    } catch (err) {
      console.error("Failed to close position:", err)
      setError(err.message)
      return {
        success: false,
        error: err.message
      }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Fetch latest BTC price from oracle
   */
  const fetchPrice = async () => {
    if (isMockMode) {
      // Simulate price movement
      const newPrice = simulatePriceMovement(btcPrice)
      setBtcPrice(newPrice)
      return newPrice
    }

    try {
      // Force use of reliable Localhost RPC instead of potentially misconfigured MetaMask Signer
      const reliableProvider = new ethers.JsonRpcProvider(RPC_URL)
      const contract = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, reliableProvider)

      // Get price feed address from vault
      const priceFeedAddress = await contract.btcUsdPriceFeed()
      const priceFeedAbi = [
        'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)'
      ]
      const priceFeed = new ethers.Contract(priceFeedAddress, priceFeedAbi, reliableProvider)
      const [, price] = await priceFeed.latestRoundData()
      const priceValue = parseFloat(ethers.formatUnits(price, 8))
      setBtcPrice(priceValue)
      return priceValue

    } catch (err) {
      console.error("Failed to fetch price from Anvil:", err)
      return btcPrice // Return current price on error
    }
  }

  /**
   * Initial fetch on mount and when account/signer changes
   * NOTE: btcPrice removed from deps - price changes should only trigger re-enrichment, not refetch
   */
  useEffect(() => {
    if (isMockMode || (signer && account)) {
      fetchPositions()
      fetchBalances()
    }
  }, [signer, account])

  /**
   * Reload data when mock mode changes
   */
  useEffect(() => {
    if (isMockMode) {
      // Reset to mock data
      const enriched = enrichPositions(MOCK_POSITIONS, btcPrice)
      setPositions(enriched)
      setWallet(MOCK_WALLET)
    } else {
      // Clear positions and fetch from contract
      setPositions([])
      if (signer && account) {
        fetchPositions()
        fetchBalances()
      }
    }
  }, [isMockMode])

  /**
   * Continuous Polling: Simulate in Mock Mode, or Fetch from Blockchain in Live Mode
   */
  useEffect(() => {
    let interval;
    if (isMockMode) {
      interval = setInterval(() => {
        setBtcPrice(prev => parseFloat((prev + (Math.random() - 0.5) * 200).toFixed(2)))
      }, 3000) // Update every 3 seconds
    } else {
      // Live Mode: Poll blockchain for true price and position states
      interval = setInterval(async () => {
        if (signer && account) {
          const freshPrice = await fetchPrice();
          await fetchPositions();
        }
      }, 5000); // Polling every 5 seconds to reduce RPC load
    }
    return () => clearInterval(interval)
  }, [isMockMode, signer, account])

  /**
   * Re-enrich positions when price changes (mock mode only)
   */
  useEffect(() => {
    if (isMockMode && positions.length > 0) {
      // Re-calculate P&L and HF with new price, preserving user-created positions
      setPositions(prev => enrichPositions(prev.map(p => ({
        id: p.id,
        type: p.type,
        sizeUSD: p.sizeUSD,
        entryPrice: p.entryPrice,
        collateralHBTC: p.collateralHBTC,
        openedAt: p.openedAt
      })), btcPrice))
    }
  }, [btcPrice])

  /**
   * Sync positions to mock server for bot to read (mock mode only)
   * Server handles filtering out liquidated positions
   */
  useEffect(() => {
    if (!isMockMode || positions.length === 0) return

    // Only sync user-created positions (skip hardcoded mock positions)
    const toSync = positions
      .filter(p => !(p.id.startsWith('0x00') && p.id.length === 5))
      .map(p => ({
        id: p.id,
        size_usd: p.sizeUSD,
        entry_price: p.entryPrice,
        collateral_hbtc: p.collateralHBTC,
        owner: wallet.address || '0xmock...'
      }))

    fetch('http://localhost:3001/positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toSync)
    }).catch(() => {})
  }, [positions, isMockMode, wallet.address])

  return {
    positions,
    btcPrice,
    wallet,
    loading,
    error,
    openPosition,
    closePosition,
    fetchPositions,
    fetchBalances,
    fetchPrice,
    isMockMode,
    toggleMockMode
  }
}
