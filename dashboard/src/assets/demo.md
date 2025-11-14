# Chainlink Token Vault Demo Overview

This demo was built on November 13th to showcase my deep understanding of the blockchain tooling ecosystem, as well as my ability to quickly prototype products with a complex web of dependencies. It highlights proficiency in integrating smart contracts with oracle services, frontend development for user-friendly interactions, and adherence to best practices in both Solidity and modern web development.

The demo itself interfaces with a Token Vault contract used for asynchronously managing Real-World Assets (RWAs). Once a user deposits assets, a Chainlink Automation will run, detect the user deposit, determine if the user has permissions to receive the asset, and then manually trigger minting and sending the wrapped assets.

As of now, this demo UI currently supports deploying the deposit token ERC-20 that the Token Vault accepts as payment, deploying the Token Vault based on user configurations, a dashboard that tracks Token Vault events, a read section for fetching read data, an admin section for managing the contract (e.g., changing fees, minting, etc.), and a user section for depositing, etc.

The frontend was written in React using industry-standard tools such as Wagmi for blockchain interactions, RainbowKit for wallet connection and UI modals, Tanstack React Query for data fetching and caching, Zustand for state management with persistence, HeadlessUI for accessible UI components like tabs and listboxes, and Tailwind CSS for styling. The app is built with Vite for fast development and bundling, and TypeScript for type safety.

While the contract environment made use of the following tools: Hardhat for deployment and testing (implied via ABI artifacts), OpenZeppelin contracts for secure ERC standards and utilities, Chainlink contracts for automation integration, and Solidity 0.8.20 with best practices like role-based access control and safe transfers.

Following enhancements will be adding a DB to formally track all users and contracts they create (currently using local storage for proof of concept), adding an external adapter to replace Chainlink Automations—this will allow users to have more fine-grained control over the contract's data feed, performing actions, and managing oracles. Adding CCIP to make the tokenized asset available on different chains. And thoughtful UI enhancements as opposed to large forms.

This demo was built in about 8 hours which demonstrates my strong understanding of both the blockchain and more specifically the Chainlink ecosystem, while also having the skill set to quickly implement and iterate upon prototypes into products.

## Libraries Used

### Smart Contract (Solidity)
- **OpenZeppelin Contracts (@openzeppelin/contracts)**: Provides secure, audited implementations for ERC-4626 (vaults), AccessControl (roles), Pausable (emergency stops), IERC165 (interface detection), and SafeERC20 (safe token transfers).
- **Chainlink Contracts (@chainlink/contracts)**: Specifically, ILogAutomation for integrating with Chainlink Automation via log-based triggers.
- **Math Library**: Built-in usage from OpenZeppelin for safe mathematical operations like mulDiv with rounding.

### Frontend (React/TypeScript)
- **Wagmi**: Core library for Ethereum interactions, including hooks like useAccount, useBalance, useReadContract, useWriteContract, and useChainId.
- **RainbowKit (@rainbow-me/rainbowkit)**: Wallet connection UI and provider, with dark theme support for modals.
- **Tanstack React Query (@tanstack/react-query)**: For managing asynchronous data fetching, caching, and synchronization with blockchain queries.
- **Zustand**: Lightweight state management with persistence middleware for storing deployed vaults in local storage.
- **HeadlessUI (@headlessui/react)**: For building accessible UI components like tabs, listboxes, and buttons without predefined styles.
- **Viem**: Underlying library for Wagmi, handling low-level Ethereum interactions like formatting ether and ABI parsing.
- **Tailwind CSS**: Utility-first CSS framework for styling, with custom colors (e.g., chainlink-blue, chainlink-dark) themed around Chainlink branding.
- **Other Dev Tools**: Vite for bundling, ESLint for linting, TypeScript for type safety, and Autoprefixer/PostCSS for CSS compatibility.

## Functionality Supported

### Smart Contract Functionality
- **Asynchronous Deposits and Redemptions (EIP-7540 Inspired)**: Users can request deposits (transferring assets to the vault) and redemptions (transferring shares back), which are pending until fulfilled by admins or automation.
- **Fulfillment Options**: Admins can fulfill requests with exact assets (deposit/withdraw) or exact shares (mint/redeem), applying fees and handling refunds/excess.
- **Chainlink Automation Integration**: Listens for DepositRequest events via logs, performs upkeep to fulfill deposits automatically.
- **Pricing and Fees**: Custom NAV price setter (role-restricted), fee calculation in basis points (up to 100%).
- **Security Features**: Pausing the contract, freezing/unfreezing accounts to block transfers, role-based access (DEFAULT_ADMIN_ROLE, PRICE_SETTER_ROLE).
- **Request Management**: Cancel pending requests, mark as claimable, track statuses (PENDING, CLAIMABLE, COMPLETE, CANCELED).
- **Overrides for Async Nature**: Reverts synchronous ERC-4626 methods (e.g., previewDeposit) to enforce async flows.
- **Operator Approvals**: Users can set operators for managing requests on their behalf.

### Frontend Functionality
- **Wallet Integration**: Connect via RainbowKit, display ETH/LINK balances, shortened addresses.
- **Deployment**: Forms to deploy custom ERC-20 tokens and Token Vaults with configurable params (name, symbol, asset, admins).
- **Dashboard**: Select from deployed vaults (stored locally), view events in a table, copy addresses, link to block explorers.
- **Tabbed Interface**:
  - **Read Tab**: Fetch and display price, fee, asset address; copy/explore addresses.
  - **Admin Tab**: Role-checked actions like set price/fee, pause/unpause, freeze/unfreeze, fulfill deposits/redemptions.
  - **User Tab**: Request deposits/redemptions, set operators, cancel requests.
- **Event Tracking**: Real-time listening for events like DepositRequest/RedeemRequest using Wagmi's useWatchContractEvent.
- **Chain Support**: Configured for Mainnet, Sepolia, Arbitrum, Arbitrum Sepolia; dynamic explorer links and LINK addresses.

## What the Contract Does

The TokenVault contract is an asynchronous tokenized vault implementing EIP-7540 standards for request-based deposits and redemptions. It extends ERC-4626 for basic vault mechanics but overrides synchronous methods to enforce async flows. Key operations:
- Users request deposits (transfer assets, emit event) or redemptions (transfer shares).
- Requests are stored per controller with statuses; admins or automation fulfill them, applying fees and minting/burning shares based on a dynamic NAV price.
- Integrates Chainlink Automation: Emits logs for events, checks/performs upkeeps to auto-fulfill (e.g., deposit after detection).
- Supports controllers/operators for delegated management, pausing for emergencies, and account freezing for compliance.
- Custom pricing: Conversions use a settable NAV (e.g., assets to shares: `assets * 1e30 / price`).
- Overall, it manages RWAs by wrapping deposits into tokenized shares, with async fulfillment to allow off-chain verification (e.g., permissions) before minting.

## Correct Patterns Used

### Smart Contract Patterns
- **Design Patterns**: Singleton-like requests (one per controller), State Machine for request statuses (enum: UNKNOWN → PENDING → CLAIMABLE → COMPLETE/CANCELED).
- **Security Patterns**: Role-based access (AccessControl) for sensitive functions; Pausable for emergency halts; SafeERC20 for transfers to prevent reverts; Frozen accounts to block malicious transfers.
- **Efficiency**: Custom math overrides with Math library for precise rounding; Fixed requestId (0) to simplify mappings.
- **Integration Patterns**: Implements ILogAutomation for Chainlink log triggers; Supports multiple interfaces (IERC7540, ERC7575) for compliance.
- **Best Practices**: SPDX license, pragma solidity ^0.8.20; Require checks for invariants; Events for all state changes; View/pure functions for reads.

### Frontend Patterns
- **State Management**: Zustand with persist for global state (deployed vaults, selected vault), avoiding prop drilling; Local storage for PoC persistence.
- **Component Design**: Modular components (Header, Dashboard, Tabs, Deploy forms); HeadlessUI for composable, accessible UI; Tabs for separation of concerns (Read/Admin/User).
- **Blockchain Interactions**: Wagmi hooks for reads/writes/events; Async handling with loading states; Error handling implied via console/alerts.
- **UI/UX Patterns**: Dark mode theme with Chainlink branding; Responsive layouts (flex, max-w); Copy buttons with feedback; Dynamic explorer links based on chainId.
- **Build Patterns**: Vite for HMR/fast builds; TypeScript for safety; ESLint for code quality; Tailwind for rapid, consistent styling without custom CSS.
- **Best Practices**: StrictMode for React; QueryClient for caching; Chain-agnostic config in wagmiConfig.ts; No direct ethers usage—leverage Wagmi abstractions.
