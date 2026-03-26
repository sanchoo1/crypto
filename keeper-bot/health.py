"""
Health Factor Calculation Module
Pure math functions - no blockchain dependencies
"""

FORMULA_VERSION = 'B'

def calc_unrealized_pnl(size_usd: float, entry_price: float, current_price: float) -> float:
    """
    Calculate Unrealized P&L in hBTC for a SHORT position

    Formula: S × (1/P_current − 1/P_entry)

    Args:
        size_usd: Position size in USD (S)
        entry_price: Entry price (P_entry)
        current_price: Current BTC/USD price (P_current)

    Returns:
        Unrealized P&L in hBTC
    """
    return size_usd * (1 / current_price - 1 / entry_price)


def calc_health_factor(collateral_hbtc, unrealized_pnl, size_usd, current_price, mmr=0.05):
    numerator = current_price * (collateral_hbtc + unrealized_pnl)
    denominator = size_usd * mmr
    if denominator == 0:
        return float('inf')
    return numerator / denominator


def is_liquidatable(health_factor: float, threshold: float = 1.0) -> bool:
    """
    Check if a position is liquidatable

    Args:
        health_factor: Health Factor
        threshold: Liquidation threshold (default 1.0)

    Returns:
        True if liquidatable (HF < threshold)
    """
    return health_factor < threshold


def calc_liquidation_price(
    collateral_hbtc: float,
    size_usd: float,
    entry_price: float,
    mmr: float = 0.05
) -> float:
    """
    Calculate liquidation price for a SHORT position

    Solves Health Factor = 1 for P_current

    Args:
        collateral_hbtc: Collateral balance in hBTC
        size_usd: Position size in USD (S)
        entry_price: Entry price (P_entry)
        mmr: Maintenance Margin Ratio (default 0.05)

    Returns:
        Liquidation price
    """
    inv = mmr - collateral_hbtc / size_usd + 1 / entry_price

    if inv <= 0:
        return float('inf')

    return 1 / inv


# Test the functions if run directly
if __name__ == "__main__":
    print("Testing health factor calculations...\n")

    # Example position
    size = 10000  # $10,000 USD
    entry = 65000  # Entry at $65,000
    collateral = 0.25  # 0.25 hBTC collateral
    current = 67420  # Current price $67,420

    # Calculate
    pnl = calc_unrealized_pnl(size, entry, current)
    hf = calc_health_factor(collateral, pnl, size, current)
    liq_price = calc_liquidation_price(collateral, size, entry)

    print(f"Position Size: ${size:,}")
    print(f"Entry Price: ${entry:,}")
    print(f"Current Price: ${current:,}")
    print(f"Collateral: {collateral} hBTC")
    print(f"\nUnrealized P&L: {pnl:.6f} hBTC")
    print(f"Health Factor: {hf:.4f}")
    print(f"Liquidation Price: ${liq_price:,.2f}")
    print(f"Is Liquidatable: {is_liquidatable(hf)}")
