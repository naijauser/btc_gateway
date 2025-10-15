# BTC Gateway
Securely get your BTC into Defi.

# 🪙 One-Click Bitcoin Yield Bridge 
**Problem:** Most BTC sits idle. Moving it into DeFi (Ethereum, Starknet, etc.) today is complex, multi-step, and intimidating.  
**Solution:** An app that bridges native BTC to Starknet DeFi automatically — earning yield with no manual bridging, wrapping, or approvals needed.

## 🚀 Overview
This project streamlines the path from Bitcoin to yield.  
Users simply connect their Bitcoin wallet, select the amount of BTC to deposit, and the app handles:

1. BTC → STRK Swap via cross-chain atomic swap (Atomiq SDK)
2. Wallet Approval via Xverse
3. Deposit into Yield Protocols (Vesu)
4. Yield Accrual and balance tracking on Starknet

## 🧩 Architecture
| Layer | Tool / Protocol | Purpose |
|-------|------------------|----------|
| Wallet | Xverse Wallet | Connects user’s native BTC (L1 or Lightning) |
| Bridge / Swap | Atomiq SDK | Cross-chain swap BTC → STRK |
| Smart Contracts | Cairo (on Starknet) | Receives STRK/WBTC and auto-deposits into yield protocols |
| Yield Engine | Vesu | Generates on-chain yield |
| Frontend | Next.js + TypeScript + Tailwind | Provides clean UI |

## ⚙️ Flow Summary
1️⃣ Swap UI → Connect wallet & swap BTC for STRK  
2️⃣ Deposit UI → Approve contract & deposit to vault  
3️⃣ Transaction Lifecycle → Display swap states & mempool links

## 🧠 Smart Contract Overview (Cairo) (In development )
```rust
#[starknet::interface]
pub trait IYieldVault<TContractState> {
    fn deposit(ref self: TContractState, amount: u256);
    fn withdraw(ref self: TContractState, amount: u256);
}
```

## 🧪 Stack
- Frontend: Next.js, TypeScript, TailwindCSS
- Blockchain: Starknet (Cairo 2)
- Wallet: Xverse
- Bridge: Atomiq SDK
- Yield Layer: Vesu
- Dev Tools: Scarb, starkli, starknet.js

## ⚡ Installation & Setup
```bash
git clone https://github.com/naijauser/btc_gateway
cd btc_gateway
yarn install
yarn start
```

## 🔮 Future Work
- Custom Smart Contract Integration for "one-click" functionality
- Lightning integration
- Multi-asset support
- Auto-rebalance
- zk-Proof receipts
- Mobile app


## 🏁 Summary
> One-click DeFi for Bitcoin.  
Users shouldn’t need to understand bridges, rollups, or DeFi plumbing.

## ✉️ Contact
Built by **Nnamdi Aninye**  
📧 unix1gl@gmail.com
🔗 GitHub: [@naijuser](https://github.com/naijauser)
