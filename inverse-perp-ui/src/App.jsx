import { useState, useEffect } from 'react'
import ConnectWallet from './components/ConnectWallet'
import Dashboard from './components/Dashboard'
import { useWallet } from './hooks/useWallet'
import { useContract } from './hooks/useContract'

/**
 * Main App Component
 * Brings together wallet connection and dashboard
 */
function App() {
  const [isDark, setIsDark] = useState(false)

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark') {
      setIsDark(true)
      document.documentElement.classList.add('dark')
    } else if (savedTheme === 'light') {
      setIsDark(false)
      document.documentElement.classList.remove('dark')
    } else {
      // Default to system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setIsDark(prefersDark)
      if (prefersDark) {
        document.documentElement.classList.add('dark')
      }
    }
  }, [])

  // Toggle theme
  const toggleTheme = () => {
    setIsDark(!isDark)
    if (!isDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  // Wallet connection
  const {
    account,
    signer,
    chainId,
    error: walletError,
    connecting,
    connect,
    disconnect
  } = useWallet()

  // Contract interaction
  const {
    positions,
    btcPrice,
    wallet,
    loading: contractLoading,
    error: contractError,
    openPosition,
    closePosition,
    isMockMode,
    toggleMockMode
  } = useContract(signer, account)

  return (
    <div className="min-h-screen transition-theme">
      {/* Header */}
      <header className="border-b border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface transition-theme shadow-soft sticky top-0 z-50 backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="animate-fade-in">
              <h1 className="text-xl font-semibold bg-gradient-to-r from-status-accent-light to-status-accent-dark bg-clip-text text-transparent">
                Inverse Perpetual Protocol
              </h1>
              <p className="text-xs text-light-muted dark:text-dark-muted mt-0.5">
                Short BTC perpetuals with hBTC collateral
              </p>
            </div>

            {/* Right side: mock toggle + theme toggle + wallet */}
            <div className="flex items-center gap-4">
              {/* Mock mode toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-light-muted dark:text-dark-muted font-mono uppercase tracking-wide">
                  {isMockMode ? 'MOCK' : 'LIVE'}
                </span>
                <button
                  onClick={toggleMockMode}
                  className={`
                    relative w-10 h-5 rounded-full transition-all duration-200 shadow-soft
                    ${isMockMode
                      ? 'bg-amber-400/30 border border-amber-400/50'
                      : 'bg-green-400/30 border border-green-400/50'
                    }
                  `}
                  aria-label="Toggle mock mode"
                >
                  <span className={`
                    absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200
                    ${isMockMode
                      ? 'left-0.5 bg-amber-400'
                      : 'left-5 bg-green-400'
                    }
                  `} />
                </button>
              </div>

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-lg border border-light-border dark:border-dark-border hover:bg-light-bg dark:hover:bg-dark-bg hover:scale-110 transition-smooth shadow-soft"
                aria-label="Toggle theme"
              >
                {isDark ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* Wallet connection */}
              <ConnectWallet
                account={account}
                connecting={connecting}
                error={walletError}
                onConnect={connect}
                onDisconnect={disconnect}
                chainId={chainId}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-6 py-8">
        {/* Mock mode banner */}
        {isMockMode && (
          <div className="mb-6 p-4 rounded-xl border border-status-warning-light dark:border-status-warning-dark bg-status-warning-light/10 dark:bg-status-warning-dark/10 shadow-soft animate-slide-down">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-status-warning-light dark:text-status-warning-dark mb-1">
                  Mock Mode Active
                </p>
                <p className="text-xs text-light-muted dark:text-dark-muted leading-relaxed">
                  Using simulated data. Switch to Live mode when Role A delivers the ABI.
                  BTC price updates every 3 seconds with random movement for demo purposes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error messages */}
        {contractError && (
          <div className="mb-6 p-4 rounded border border-status-danger-light dark:border-status-danger-dark bg-status-danger-light/10 dark:bg-status-danger-dark/10">
            <p className="text-sm text-status-danger-light dark:text-status-danger-dark">
              {contractError}
            </p>
          </div>
        )}

        {/* Dashboard */}
        <Dashboard
          positions={positions}
          btcPrice={btcPrice}
          wallet={wallet}
          loading={contractLoading}
          onOpenPosition={openPosition}
          onClosePosition={closePosition}
          useMock={isMockMode}
        />
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-light-border dark:border-dark-border py-6 transition-theme">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between text-xs text-light-muted dark:text-dark-muted">
            <p>
              Inverse Perpetual Protocol • Role C Implementation
            </p>
            <p>
              {isMockMode ? 'Mock Mode' : 'Live Mode'} • {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
