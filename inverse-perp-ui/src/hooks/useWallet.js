import { useState, useEffect } from 'react'
import { ethers } from 'ethers'

/**
 * Custom hook for MetaMask wallet connection and management
 * Handles account connection, network switching, and event listeners
 */
export function useWallet() {
  const [account, setAccount] = useState(null)
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [error, setError] = useState(null)
  const [connecting, setConnecting] = useState(false)

  /**
   * Connect to MetaMask wallet
   */
  const connect = async () => {
    if (!window.ethereum) {
      setError("MetaMask not installed. Please install MetaMask to use this dApp.")
      return
    }

    try {
      setConnecting(true)
      setError(null)

      // Create provider from MetaMask
      const _provider = new ethers.BrowserProvider(window.ethereum)

      // Request account access
      const accounts = await _provider.send("eth_requestAccounts", [])

      // Get signer
      const _signer = await _provider.getSigner()

      // Get network info
      const network = await _provider.getNetwork()

      setProvider(_provider)
      setSigner(_signer)
      setAccount(accounts[0])
      setChainId(network.chainId.toString())

      console.log("Wallet connected:", accounts[0])
      console.log("Network:", network.chainId.toString())
    } catch (err) {
      console.error("Wallet connection error:", err)
      setError(err.message || "Failed to connect wallet")
    } finally {
      setConnecting(false)
    }
  }

  /**
   * Disconnect wallet (clear state)
   */
  const disconnect = () => {
    setAccount(null)
    setProvider(null)
    setSigner(null)
    setChainId(null)
    setError(null)
    console.log("Wallet disconnected")
  }

  /**
   * Switch to a specific network
   */
  const switchNetwork = async (targetChainId) => {
    if (!window.ethereum) {
      setError("MetaMask not installed")
      return
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${parseInt(targetChainId).toString(16)}` }],
      })
    } catch (err) {
      // This error code indicates that the chain has not been added to MetaMask
      if (err.code === 4902) {
        setError(`Please add network ${targetChainId} to MetaMask`)
      } else {
        setError(err.message)
      }
    }
  }

  /**
   * Listen for account changes
   */
  useEffect(() => {
    if (!window.ethereum) return

    const handleAccountsChanged = (accounts) => {
      console.log("Accounts changed:", accounts)
      if (accounts.length === 0) {
        // User disconnected all accounts
        disconnect()
      } else {
        // User switched accounts
        setAccount(accounts[0])
        // Refresh signer when account changes
        if (provider) {
          provider.getSigner().then(setSigner)
        }
      }
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
    }
  }, [provider])

  /**
   * Listen for network changes
   */
  useEffect(() => {
    if (!window.ethereum) return

    const handleChainChanged = (chainId) => {
      console.log("Chain changed:", chainId)
      // MetaMask recommends reloading the page on chain change
      window.location.reload()
    }

    window.ethereum.on('chainChanged', handleChainChanged)

    return () => {
      window.ethereum.removeListener('chainChanged', handleChainChanged)
    }
  }, [])

  /**
   * Auto-connect if previously connected
   */
  useEffect(() => {
    const autoConnect = async () => {
      if (!window.ethereum) return

      try {
        // Check if already connected
        const accounts = await window.ethereum.request({
          method: 'eth_accounts'
        })

        if (accounts.length > 0) {
          // Silently connect
          const _provider = new ethers.BrowserProvider(window.ethereum)
          const _signer = await _provider.getSigner()
          const network = await _provider.getNetwork()

          setProvider(_provider)
          setSigner(_signer)
          setAccount(accounts[0])
          setChainId(network.chainId.toString())
        }
      } catch (err) {
        console.error("Auto-connect failed:", err)
      }
    }

    autoConnect()
  }, [])

  return {
    account,
    provider,
    signer,
    chainId,
    error,
    connecting,
    connect,
    disconnect,
    switchNetwork,
    isConnected: !!account
  }
}
