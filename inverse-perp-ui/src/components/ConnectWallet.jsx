import { shortenAddress } from '../utils/math'

/**
 * ConnectWallet Component
 * Displays wallet connection button or connected address
 */
export default function ConnectWallet({
  account,
  connecting,
  error,
  onConnect,
  onDisconnect,
  chainId
}) {
  return (
    <div className="flex items-center gap-4">
      {/* Error message */}
      {error && (
        <div className="text-sm text-status-danger-light dark:text-status-danger-dark">
          {error}
        </div>
      )}

      {/* Connected state */}
      {account ? (
        <div className="flex items-center gap-3 animate-slide-down">
          {/* Chain indicator */}
          {chainId && (
            <div className="px-3 py-1.5 rounded-lg border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface shadow-soft">
              <span className="text-xs font-mono text-light-muted dark:text-dark-muted">
                Chain: {chainId}
              </span>
            </div>
          )}

          {/* Address display */}
          <div className="px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface shadow-soft">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-status-safe-light dark:bg-status-safe-dark animate-pulse-slow"></div>
              <span className="font-mono text-sm text-light-text dark:text-dark-text">
                {shortenAddress(account)}
              </span>
            </div>
          </div>

          {/* Disconnect button */}
          <button
            onClick={onDisconnect}
            className="px-4 py-2 text-sm border border-light-border dark:border-dark-border rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg hover:scale-105 transition-smooth"
          >
            Disconnect
          </button>
        </div>
      ) : (
        /* Connect button */
        <button
          onClick={onConnect}
          disabled={connecting}
          className={`
            px-6 py-2.5 text-sm font-medium rounded-lg border transition-smooth shadow-soft
            ${connecting
              ? 'border-light-muted dark:border-dark-muted text-light-muted dark:text-dark-muted cursor-not-allowed'
              : 'border-status-accent-light dark:border-status-accent-dark text-status-accent-light dark:text-status-accent-dark hover:bg-status-accent-light hover:text-white dark:hover:bg-status-accent-dark dark:hover:text-white hover:scale-105'
            }
          `}
        >
          {connecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
    </div>
  )
}
