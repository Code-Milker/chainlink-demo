# Prompt Request

[Describe your coding task or question here. Be specific about files to modify, features to add, or bugs to fix.]

## Prompt Rules

You are an expert software engineer specializing in maintaining strict code quality in repositories. Follow these guidelines for all responses:

- **Adhere to Repo Structure**: Respect the existing file tree and organization. Suggest changes only if they improve modularity without unnecessary refactoring.
- **Code Quality Standards**: Use clean, readable code with proper indentation, meaningful variable names, and comments where needed. Follow language-specific best practices (e.g., PEP8 for Python, Google Style for Java).
- **Error Handling and Edge Cases**: Always include robust error handling, input validation, and consider edge cases.
- **Testing**: Suggest or include unit tests for new code. Aim for high test coverage.
- **Performance and Security**: Optimize for efficiency and security; avoid common vulnerabilities like injection or data leaks.
- **Documentation**: Update README or inline docs as necessary.
- **Minimal Changes**: Make the smallest possible changes to achieve the goal; avoid over-engineering.
- **Version Control**: Suggest commit messages and branching strategies if relevant.
- **Consistency**: Match the style of existing code in the repo.

Respond step-by-step: Analyze the request, review provided context (file tree and buffers), plan changes, then provide code diffs or full files.


## Project Directory Tree (from /Users/tylerfischer/1-projects/chainlink-demo)

```
.
├── contracts
│   ├── artifacts
│   ├── cache
│   ├── contracts
│   ├── ignition
│   ├── node_modules
│   ├── scripts
│   ├── test
│   ├── bun.lock
│   ├── hardhat.config.ts
│   ├── index.ts
│   ├── package.json
│   ├── README.md
│   └── tsconfig.json
├── dashboard
│   ├── dist
│   ├── node_modules
│   ├── public
│   ├── src
│   ├── bun.lock
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── README.md
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── demo-outline.md
├── notes.md
└── README.md

14 directories, 19 files

```

## Open Buffers

## File: contracts/package.json (1/7)
**Filetype:** json
**Modified:** No

```json
{
  "name": "contracts",
  "module": "index.ts",
  "type": "module",
  "devDependencies": {
    "@nomicfoundation/hardhat-ethers": "^4.0.3",
    "@nomicfoundation/hardhat-ignition": "^3.0.5",
    "@nomicfoundation/hardhat-network-helpers": "^3.0.3",
    "@nomicfoundation/hardhat-toolbox": "^6.1.0",
    "@nomicfoundation/hardhat-toolbox-viem": "^5.0.1",
    "@nomicfoundation/hardhat-verify": "^3.0.0",
    "@typechain/ethers-v6": "^0.5.1",
    "@typechain/hardhat": "^9.1.0",
    "@types/bun": "latest",
    "@types/node": "^22.8.5",
    "forge-std": "foundry-rs/forge-std#v1.9.4",
    "hardhat": "^3.0.14",
    "ts-node": "^10.9.2",
    "typechain": "^8.3.2",
    "viem": "^2.30.0"
  },
  "peerDependencies": {
    "typescript": "~5.8.0"
  },
  "dependencies": {
    "@chainlink/contracts": "^1.5.0",
    "@openzeppelin/contracts": "^5.4.0"
  }
}
```

---

## File: contracts/test/TokenVault.ts (2/7)
**Filetype:** typescript
**Modified:** Yes

```typescript
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getContract, GetContractReturnType, parseEther } from "viem";
import { network } from "hardhat";
import type { ERC20,  } from "hardhat/types/artifacts";

const erc20Abi = erc20Artifact.abi as ERC20["abi"];
const tokenVaultAbi = tokenVaultArtifact.abi as TokenVault["abi"];

type ERC20Contract = GetContractReturnType<ERC20["abi"], PublicClient, WalletClient>;
type TokenVaultContract = GetContractReturnType<TokenVault["abi"], PublicClient, WalletClient>;

describe("TokenVault", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient() as PublicClient;
  const [deployer, user, admin, priceSetter] = await viem.getWalletClients() as [WalletClient, WalletClient, WalletClient, WalletClient];

  let erc20: ERC20Contract;
  let tokenVault: TokenVaultContract;

  before(async function () {
    // Deploy mock ERC20
    erc20 = await viem.deployContract("MyERC20", ["TestToken", "TTK", parseEther("1000000")]) as ERC20Contract;

    // Deploy TokenVault
    tokenVault = await viem.deployContract("TokenVault", [
      erc20.address,
      "TestVault",
      "TVT",
      admin.account.address, // defaultAdmin
      priceSetter.account.address, // priceSetter
    ]) as TokenVaultContract;

    // Mint some tokens to user for testing
    await erc20.write.transfer([user.account.address, parseEther("1000")]);
  });

  it("User can request deposit and admin can fulfill it, receiving shares after fee", async function () {
    const depositAmount = parseEther("100");
    const controller = user.account.address; // Using user as controller for simplicity

    const userErc20 = getContract<ERC20["abi"], WalletClient>({
      address: erc20.address,
      abi: erc20Abi,
      client: user,
    });

    const userTokenVault = getContract<TokenVault["abi"], WalletClient>({
      address: tokenVault.address,
      abi: tokenVaultAbi,
      client: user,
    });

    const adminTokenVault = getContract<TokenVault["abi"], WalletClient>({
      address: tokenVault.address,
      abi: tokenVaultAbi,
      client: admin,
    });

    // User approves vault to spend ERC20
    await userErc20.write.approve([tokenVault.address, depositAmount]);

    // User requests deposit
    await userTokenVault.write.requestDeposit([depositAmount, controller, user.account.address]);

    // Check pending deposit
    const pending = await tokenVault.read.pendingDepositRequest([0n, controller]);
    assert.equal(pending, depositAmount);

    // Admin fulfills the deposit (using deposit function for exact assets)
    await adminTokenVault.write.deposit([depositAmount, controller, controller]);

    // Calculate expected shares: effectiveAssets = deposit - fee (0.1% default), shares = effectiveAssets * 1e30 / price (1e18) = effectiveAssets * 1e12
    const fee = (depositAmount * 1n) / 1000n; // 0.1%
    const effective = depositAmount - fee;
    const expectedShares = (effective * (10n ** 30n)) / (10n ** 18n); // 1e30 / 1e18 = 1e12

    // Check user's shares
    const shares = await tokenVault.read.balanceOf([controller]);
    assert.equal(shares, expectedShares);
  });

  // Similarly for other tests, using the typed contracts
});
```

---

## File: contracts/artifacts/contracts/TokenVault.sol/TokenVault.json (3/7)
**Filetype:** json
**Modified:** No

```json
{
  "_format": "hh3-artifact-1",
  "contractName": "TokenVault",
  "sourceName": "contracts/TokenVault.sol",
  "abi": [
    {
      "inputs": [
        {
          "internalType": "contract IERC20",
          "name": "asset_",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "name_",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "symbol_",
          "type": "string"
        },
        {
          "internalType": "address",
          "name": "defaultAdmin",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "priceSetter",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [],
      "name": "AccessControlBadConfirmation",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "internalType": "bytes32",
          "name": "neededRole",
          "type": "bytes32"
        }
      ],
      "name": "AccessControlUnauthorizedAccount",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "allowance",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "needed",
          "type": "uint256"
        }
      ],
      "name": "ERC20InsufficientAllowance",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "sender",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "balance",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "needed",
          "type": "uint256"
        }
      ],
      "name": "ERC20InsufficientBalance",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "approver",
          "type": "address"
        }
      ],
      "name": "ERC20InvalidApprover",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        }
      ],
      "name": "ERC20InvalidReceiver",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "sender",
          "type": "address"
        }
      ],
      "name": "ERC20InvalidSender",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        }
      ],
      "name": "ERC20InvalidSpender",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "assets",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "max",
          "type": "uint256"
        }
      ],
      "name": "ERC4626ExceededMaxDeposit",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "max",
          "type": "uint256"
        }
      ],
      "name": "ERC4626ExceededMaxMint",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "max",
          "type": "uint256"
        }
      ],
      "name": "ERC4626ExceededMaxRedeem",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "assets",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "max",
          "type": "uint256"
        }
      ],
      "name": "ERC4626ExceededMaxWithdraw",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "EnforcedPause",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "ExpectedPause",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "token",
          "type": "address"
        }
      ],
      "name": "SafeERC20FailedOperation",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "AccountFrozen",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "AccountUnfrozen",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Approval",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "sender",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "assets",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        }
      ],
      "name": "Deposit",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "controller",
          "type": "address"
        }
      ],
      "name": "DepositCancelled",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "controller",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "requestId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "sender",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "assets",
          "type": "uint256"
        }
      ],
      "name": "DepositRequest",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "controller",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "operator",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "approved",
          "type": "bool"
        }
      ],
      "name": "OperatorSet",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "Paused",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "controller",
          "type": "address"
        }
      ],
      "name": "RedeemCancelled",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "controller",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "requestId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "sender",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        }
      ],
      "name": "RedeemRequest",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "previousAdminRole",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "newAdminRole",
          "type": "bytes32"
        }
      ],
      "name": "RoleAdminChanged",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "sender",
          "type": "address"
        }
      ],
      "name": "RoleGranted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "sender",
          "type": "address"
        }
      ],
      "name": "RoleRevoked",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Transfer",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "Unpaused",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "sender",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "assets",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        }
      ],
      "name": "Withdraw",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "DEFAULT_ADMIN_ROLE",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "PRICE_SETTER_ROLE",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        }
      ],
      "name": "allowance",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "approve",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "asset",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "balanceOf",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "controller",
          "type": "address"
        }
      ],
      "name": "cancelDeposit",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "controller",
          "type": "address"
        }
      ],
      "name": "cancelRedeem",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "index",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "timestamp",
              "type": "uint256"
            },
            {
              "internalType": "bytes32",
              "name": "txHash",
              "type": "bytes32"
            },
            {
              "internalType": "uint256",
              "name": "blockNumber",
              "type": "uint256"
            },
            {
              "internalType": "bytes32",
              "name": "blockHash",
              "type": "bytes32"
            },
            {
              "internalType": "address",
              "name": "source",
              "type": "address"
            },
            {
              "internalType": "bytes32[]",
              "name": "topics",
              "type": "bytes32[]"
            },
            {
              "internalType": "bytes",
              "name": "data",
              "type": "bytes"
            }
          ],
          "internalType": "struct Log",
          "name": "log",
          "type": "tuple"
        },
        {
          "internalType": "bytes",
          "name": "",
          "type": "bytes"
        }
      ],
      "name": "checkLog",
      "outputs": [
        {
          "internalType": "bool",
          "name": "upkeepNeeded",
          "type": "bool"
        },
        {
          "internalType": "bytes",
          "name": "performData",
          "type": "bytes"
        }
      ],
      "stateMutability": "pure",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "controller",
          "type": "address"
        }
      ],
      "name": "claimableDepositRequest",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "assets",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "controller",
          "type": "address"
        }
      ],
      "name": "claimableRedeemRequest",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        }
      ],
      "name": "convertToAssets",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "assets",
          "type": "uint256"
        }
      ],
      "name": "convertToShares",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "decimals",
      "outputs": [
        {
          "internalType": "uint8",
          "name": "",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "assets",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "controller",
          "type": "address"
        }
      ],
      "name": "deposit",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "assets",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        }
      ],
      "name": "deposit",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "fee",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "freezeAccount",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "frozenAccounts",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "getPercentage",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getPrice",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        }
      ],
      "name": "getRoleAdmin",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "automationRegistry",
          "type": "address"
        }
      ],
      "name": "grantAutomationRole",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "grantRole",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "hasRole",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "controller",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "operator",
          "type": "address"
        }
      ],
      "name": "isOperator",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "controller",
          "type": "address"
        }
      ],
      "name": "makeDepositClaimable",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "controller",
          "type": "address"
        }
      ],
      "name": "makeRedeemClaimable",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "maxDeposit",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "maxMint",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "maxRedeem",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "maxWithdraw",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        }
      ],
      "name": "mint",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "controller",
          "type": "address"
        }
      ],
      "name": "mint",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "assets",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "name",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "pause",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "paused",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "controller",
          "type": "address"
        }
      ],
      "name": "pendingDepositRequest",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "assets",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "controller",
          "type": "address"
        }
      ],
      "name": "pendingRedeemRequest",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes",
          "name": "performData",
          "type": "bytes"
        }
      ],
      "name": "performUpkeep",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "assets",
          "type": "uint256"
        }
      ],
      "name": "previewDeposit",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        }
      ],
      "name": "previewMint",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        }
      ],
      "name": "previewRedeem",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "assets",
          "type": "uint256"
        }
      ],
      "name": "previewWithdraw",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "controller",
          "type": "address"
        }
      ],
      "name": "redeem",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "assets",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "callerConfirmation",
          "type": "address"
        }
      ],
      "name": "renounceRole",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "assets",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "controller",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "requestDeposit",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "requestId",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "controller",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "requestRedeem",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "requestId",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "revokeRole",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_fee",
          "type": "uint256"
        }
      ],
      "name": "setFee",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "operator",
          "type": "address"
        },
        {
          "internalType": "bool",
          "name": "approved",
          "type": "bool"
        }
      ],
      "name": "setOperator",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "newPrice",
          "type": "uint256"
        }
      ],
      "name": "setPrice",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes4",
          "name": "interfaceId",
          "type": "bytes4"
        }
      ],
      "name": "supportsInterface",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "symbol",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalAssets",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalSupply",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "recipient",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "transfer",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "sender",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "recipient",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "transferFrom",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "unfreezeAccount",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "unpause",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "assets",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "controller",
          "type": "address"
        }
      ],
      "name": "withdraw",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ],
  "bytecode": "0x60c0604052670de0b6b3a76400006007556001600b55348015610020575f5ffd5b50604051616d49380380616d4983398181016040528101906100429190610568565b84848481600390816100549190610827565b5080600490816100649190610827565b5050505f5f6100788361011c60201b60201c565b915091508161008857601261008a565b805b60ff1660a08160ff16815250508273ffffffffffffffffffffffffffffffffffffffff1660808173ffffffffffffffffffffffffffffffffffffffff16815250505050506100e05f5f1b8361022560201b60201c565b506101117f04824fcb60e7cc526d70b264caa65b62ed44d9c8e5d230e8ff6b0c7373843b8a8261022560201b60201c565b5050505050506109a5565b5f5f5f5f8473ffffffffffffffffffffffffffffffffffffffff1660405160240160405160208183030381529060405263313ce56760e01b6020820180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff838183161783525050505060405161018f919061093a565b5f60405180830381855afa9150503d805f81146101c7576040519150601f19603f3d011682016040523d82523d5f602084013e6101cc565b606091505b50915091508180156101e057506020815110155b15610217575f818060200190518101906101fa919061097a565b905060ff801681116102155760018194509450505050610220565b505b5f5f9350935050505b915091565b5f610236838361031b60201b60201c565b61031157600160055f8581526020019081526020015f205f015f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f6101000a81548160ff0219169083151502179055506102ae61037f60201b60201c565b73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16847f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d60405160405180910390a460019050610315565b5f90505b92915050565b5f60055f8481526020019081526020015f205f015f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f9054906101000a900460ff16905092915050565b5f33905090565b5f604051905090565b5f5ffd5b5f5ffd5b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f6103c082610397565b9050919050565b5f6103d1826103b6565b9050919050565b6103e1816103c7565b81146103eb575f5ffd5b50565b5f815190506103fc816103d8565b92915050565b5f5ffd5b5f5ffd5b5f601f19601f8301169050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b6104508261040a565b810181811067ffffffffffffffff8211171561046f5761046e61041a565b5b80604052505050565b5f610481610386565b905061048d8282610447565b919050565b5f67ffffffffffffffff8211156104ac576104ab61041a565b5b6104b58261040a565b9050602081019050919050565b8281835e5f83830152505050565b5f6104e26104dd84610492565b610478565b9050828152602081018484840111156104fe576104fd610406565b5b6105098482856104c2565b509392505050565b5f82601f83011261052557610524610402565b5b81516105358482602086016104d0565b91505092915050565b610547816103b6565b8114610551575f5ffd5b50565b5f815190506105628161053e565b92915050565b5f5f5f5f5f60a086880312156105815761058061038f565b5b5f61058e888289016103ee565b955050602086015167ffffffffffffffff8111156105af576105ae610393565b5b6105bb88828901610511565b945050604086015167ffffffffffffffff8111156105dc576105db610393565b5b6105e888828901610511565b93505060606105f988828901610554565b925050608061060a88828901610554565b9150509295509295909350565b5f81519050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b5f600282049050600182168061066557607f821691505b60208210810361067857610677610621565b5b50919050565b5f819050815f5260205f209050919050565b5f6020601f8301049050919050565b5f82821b905092915050565b5f600883026106da7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8261069f565b6106e4868361069f565b95508019841693508086168417925050509392505050565b5f819050919050565b5f819050919050565b5f61072861072361071e846106fc565b610705565b6106fc565b9050919050565b5f819050919050565b6107418361070e565b61075561074d8261072f565b8484546106ab565b825550505050565b5f5f905090565b61076c61075d565b610777818484610738565b505050565b5b8181101561079a5761078f5f82610764565b60018101905061077d565b5050565b601f8211156107df576107b08161067e565b6107b984610690565b810160208510156107c8578190505b6107dc6107d485610690565b83018261077c565b50505b505050565b5f82821c905092915050565b5f6107ff5f19846008026107e4565b1980831691505092915050565b5f61081783836107f0565b9150826002028217905092915050565b61083082610617565b67ffffffffffffffff8111156108495761084861041a565b5b610853825461064e565b61085e82828561079e565b5f60209050601f83116001811461088f575f841561087d578287015190505b610887858261080c565b8655506108ee565b601f19841661089d8661067e565b5f5b828110156108c45784890151825560018201915060208501945060208101905061089f565b868310156108e157848901516108dd601f8916826107f0565b8355505b6001600288020188555050505b505050505050565b5f81519050919050565b5f81905092915050565b5f610914826108f6565b61091e8185610900565b935061092e8185602086016104c2565b80840191505092915050565b5f610945828461090a565b915081905092915050565b610959816106fc565b8114610963575f5ffd5b50565b5f8151905061097481610950565b92915050565b5f6020828403121561098f5761098e61038f565b5b5f61099c84828501610966565b91505092915050565b60805160a0516163836109c65f395f6114fa01525f61179601526163835ff3fe608060405234801561000f575f5ffd5b50600436106103ad575f3560e01c8063788649ea116101f2578063b6363cf211610118578063dd62ed3e116100ab578063ef8b30f71161007a578063ef8b30f714610c72578063f00acbaa14610ca2578063f26c159f14610cc0578063f5a23d8d14610cdc576103ad565b8063dd62ed3e14610bc4578063ddca3f4314610bf4578063e161c3bf14610c12578063eaed1d0714610c42576103ad565b8063ce96cb77116100e7578063ce96cb7714610b18578063d547741f14610b48578063d905777e14610b64578063da39b3e714610b94576103ad565b8063b6363cf214610a58578063ba08765214610a88578063c63d75b614610ab8578063c6e6f59214610ae8576103ad565b806394bf804d11610190578063a217fddf1161015f578063a217fddf146109aa578063a9059cbb146109c8578063b3d7f6b9146109f8578063b460af9414610a28576103ad565b806394bf804d1461090e57806395d89b411461093e57806398d5fdca1461095c578063995ea21a1461097a576103ad565b806385b77f45116101cc57806385b77f4514610862578063860838a51461089257806391b7f5ed146108c257806391d14854146108de576103ad565b8063788649ea1461080c5780637d41c86e146108285780638456cb5914610858576103ad565b806338401c43116102d7578063558a7297116102755780636db79869116102445780636db79869146107745780636e553f651461079057806370a08231146107c057806376b4eb32146107f0576103ad565b8063558a7297146106ee5780635c975abb1461071e57806369fe0e2d1461073c5780636d14c2f614610758576103ad565b8063402d267d116102b1578063402d267d1461064157806340691db4146106715780634585e33b146106a25780634cdad506146106be576103ad565b806338401c43146105fd57806338d52e0f146106195780633f4ba83a14610637576103ad565b806318160ddd1161034f5780632e2d29841161031e5780632e2d2984146105775780632f2ff15d146105a7578063313ce567146105c357806336568abe146105e1576103ad565b806318160ddd146104c957806323b872dd146104e7578063248a9ca31461051757806326c6f96c14610547576103ad565b806307a2d13a1161038b57806307a2d13a1461041d578063095ea7b31461044d5780630a28a4771461047d5780630de93209146104ad576103ad565b806301e1d114146103b157806301ffc9a7146103cf57806306fdde03146103ff575b5f5ffd5b6103b9610d0c565b6040516103c69190614aec565b60405180910390f35b6103e960048036038101906103e49190614b6b565b610d91565b6040516103f69190614bb0565b60405180910390f35b610407610f46565b6040516104149190614c39565b60405180910390f35b61043760048036038101906104329190614c83565b610fd6565b6040516104449190614aec565b60405180910390f35b61046760048036038101906104629190614d08565b610fe8565b6040516104749190614bb0565b60405180910390f35b61049760048036038101906104929190614c83565b61100a565b6040516104a49190614aec565b60405180910390f35b6104c760048036038101906104c29190614d46565b611046565b005b6104d1611063565b6040516104de9190614aec565b60405180910390f35b61050160048036038101906104fc9190614d71565b61106c565b60405161050e9190614bb0565b60405180910390f35b610531600480360381019061052c9190614df4565b611195565b60405161053e9190614e2e565b60405180910390f35b610561600480360381019061055c9190614e47565b6111b2565b60405161056e9190614aec565b60405180910390f35b610591600480360381019061058c9190614e85565b611333565b60405161059e9190614aec565b60405180910390f35b6105c160048036038101906105bc9190614ed5565b6114cd565b005b6105cb6114ef565b6040516105d89190614f2e565b60405180910390f35b6105fb60048036038101906105f69190614ed5565b611528565b005b61061760048036038101906106129190614d46565b6115a3565b005b610621611793565b60405161062e9190614f56565b60405180910390f35b61063f6117ba565b005b61065b60048036038101906106569190614d46565b6117d1565b6040516106689190614aec565b60405180910390f35b61068b600480360381019061068691906150be565b6117fa565b604051610699929190615186565b60405180910390f35b6106bc60048036038101906106b79190615211565b61182a565b005b6106d860048036038101906106d39190614c83565b6118eb565b6040516106e59190614aec565b60405180910390f35b61070860048036038101906107039190615286565b611927565b6040516107159190614bb0565b60405180910390f35b610726611a26565b6040516107339190614bb0565b60405180910390f35b61075660048036038101906107519190614c83565b611a3b565b005b610772600480360381019061076d9190614d46565b611a97565b005b61078e60048036038101906107899190614d46565b611cae565b005b6107aa60048036038101906107a59190614e47565b611da2565b6040516107b79190614aec565b60405180910390f35b6107da60048036038101906107d59190614d46565b611e22565b6040516107e79190614aec565b60405180910390f35b61080a60048036038101906108059190614d46565b611e67565b005b61082660048036038101906108219190614d46565b611f5b565b005b610842600480360381019061083d9190614e85565b612002565b60405161084f9190614aec565b60405180910390f35b610860612417565b005b61087c60048036038101906108779190614e85565b61242e565b6040516108899190614aec565b60405180910390f35b6108ac60048036038101906108a79190614d46565b6128e2565b6040516108b99190614bb0565b60405180910390f35b6108dc60048036038101906108d79190614c83565b6128ff565b005b6108f860048036038101906108f39190614ed5565b612976565b6040516109059190614bb0565b60405180910390f35b61092860048036038101906109239190614e47565b6129da565b6040516109359190614aec565b60405180910390f35b610946612a5a565b6040516109539190614c39565b60405180910390f35b610964612aea565b6040516109719190614aec565b60405180910390f35b610994600480360381019061098f9190614e47565b612af3565b6040516109a19190614aec565b60405180910390f35b6109b2612c74565b6040516109bf9190614e2e565b60405180910390f35b6109e260048036038101906109dd9190614d08565b612c7a565b6040516109ef9190614bb0565b60405180910390f35b610a126004803603810190610a0d9190614c83565b612da1565b604051610a1f9190614aec565b60405180910390f35b610a426004803603810190610a3d9190614e85565b612ddd565b604051610a4f9190614aec565b60405180910390f35b610a726004803603810190610a6d91906152c4565b61304f565b604051610a7f9190614bb0565b60405180910390f35b610aa26004803603810190610a9d9190614e85565b6130dd565b604051610aaf9190614aec565b60405180910390f35b610ad26004803603810190610acd9190614d46565b61334e565b604051610adf9190614aec565b60405180910390f35b610b026004803603810190610afd9190614c83565b613377565b604051610b0f9190614aec565b60405180910390f35b610b326004803603810190610b2d9190614d46565b613389565b604051610b3f9190614aec565b60405180910390f35b610b626004803603810190610b5d9190614ed5565b6133a3565b005b610b7e6004803603810190610b799190614d46565b6133c5565b604051610b8b9190614aec565b60405180910390f35b610bae6004803603810190610ba99190614e85565b6133d6565b604051610bbb9190614aec565b60405180910390f35b610bde6004803603810190610bd991906152c4565b613604565b604051610beb9190614aec565b60405180910390f35b610bfc613686565b604051610c099190614aec565b60405180910390f35b610c2c6004803603810190610c279190614c83565b61368c565b604051610c399190614aec565b60405180910390f35b610c5c6004803603810190610c579190614e47565b6136af565b604051610c699190614aec565b60405180910390f35b610c8c6004803603810190610c879190614c83565b613830565b604051610c999190614aec565b60405180910390f35b610caa61386c565b604051610cb79190614e2e565b60405180910390f35b610cda6004803603810190610cd59190614d46565b613890565b005b610cf66004803603810190610cf19190614e47565b613938565b604051610d039190614aec565b60405180910390f35b5f610d15611793565b73ffffffffffffffffffffffffffffffffffffffff166370a08231306040518263ffffffff1660e01b8152600401610d4d9190614f56565b602060405180830381865afa158015610d68573d5f5f3e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610d8c9190615316565b905090565b5f7fbb9d82b2000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff19161480610e42575063e3bc4e6560e01b7bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916145b80610e915750632f0a18c560e01b7bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916145b80610ee0575063ce3bbe5060e01b7bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916145b80610f2f575063620ee8e460e01b7bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916145b80610f3f5750610f3e82613ab9565b5b9050919050565b606060038054610f559061536e565b80601f0160208091040260200160405190810160405280929190818152602001828054610f819061536e565b8015610fcc5780601f10610fa357610100808354040283529160200191610fcc565b820191905f5260205f20905b815481529060010190602001808311610faf57829003601f168201915b5050505050905090565b5f610fe1825f613b32565b9050919050565b5f5f610ff2613bbb565b9050610fff818585613bc2565b600191505092915050565b5f6040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161103d9061540e565b60405180910390fd5b5f5f1b61105281613bd4565b61105e5f5f1b83613be8565b505050565b5f600254905090565b5f600c5f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f9054906101000a900460ff16156110f7576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016110ee90615476565b60405180910390fd5b600c5f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f9054906101000a900460ff1615611181576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401611178906154de565b60405180910390fd5b61118c848484613cd2565b90509392505050565b5f60055f8381526020019081526020015f20600101549050919050565b5f5f60085f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f206040518060800160405290815f82015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001600182015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200160028201548152602001600382015f9054906101000a900460ff1660048111156112d3576112d26154fc565b5b60048111156112e5576112e46154fc565b5b815250509050600160048111156112ff576112fe6154fc565b5b81606001516004811115611316576113156154fc565b5b0361132857806040015191505061132d565b5f9150505b92915050565b5f5f5f1b61134081613bd4565b5f60085f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20905060016004811115611394576113936154fc565b5b816003015f9054906101000a900460ff1660048111156113b7576113b66154fc565b5b146113f7576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016113ee90615573565b60405180910390fd5b5f611405826002015461368c565b826002015461141491906155be565b9050611420815f613d00565b935061142c8685613d89565b6003826003015f6101000a81548160ff02191690836004811115611453576114526154fc565b5b02179055508573ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167fdcbc1c05240f31ff3ad067ef1ee35ce4997762752e3a095284754544f4c709d78460020154876040516114bb9291906155f1565b60405180910390a35050509392505050565b6114d682611195565b6114df81613bd4565b6114e98383613be8565b50505050565b5f6114f8613e08565b7f00000000000000000000000000000000000000000000000000000000000000006115239190615618565b905090565b611530613bbb565b73ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614611594576040517f6697b23200000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b61159e8282613e0f565b505050565b5f60095f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f209050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614806116455750611644823361304f565b5b611684576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161167b90615696565b60405180910390fd5b60016004811115611698576116976154fc565b5b816003015f9054906101000a900460ff1660048111156116bb576116ba6154fc565b5b146116fb576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016116f2906156fe565b60405180910390fd5b61172c30825f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff168360020154613ef9565b6004816003015f6101000a81548160ff02191690836004811115611753576117526154fc565b5b02179055507fa34b209824d24e31467e4012a81027b4937d3285d7ea71229352f1520fc61b79826040516117879190614f56565b60405180910390a15050565b5f7f0000000000000000000000000000000000000000000000000000000000000000905090565b5f5f1b6117c681613bd4565b6117ce613fe9565b50565b5f7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff9050919050565b5f606060019150836040516020016118129190615a07565b60405160208183030381529060405290509250929050565b5f828281019061183a9190615bee565b90505f5f5f5f5f8560e001518060200190518101906118599190615c70565b945094509450945094503073ffffffffffffffffffffffffffffffffffffffff16632e2d29848287886040518463ffffffff1660e01b81526004016118a093929190615ce7565b6020604051808303815f875af11580156118bc573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906118e09190615316565b505050505050505050565b5f6040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161191e9061540e565b60405180910390fd5b5f81600a5f3373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f6101000a81548160ff0219169083151502179055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167fceb576d9f15e4e200fdb5096d64d5dfd667e16def20c1eefd14256d8e3faa26784604051611a149190614bb0565b60405180910390a36001905092915050565b5f60065f9054906101000a900460ff16905090565b5f5f1b611a4781613bd4565b6103e8821115611a8c576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401611a8390615d66565b60405180910390fd5b81600b819055505050565b5f60085f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f209050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161480611b395750611b38823361304f565b5b611b78576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401611b6f90615696565b60405180910390fd5b60016004811115611b8c57611b8b6154fc565b5b816003015f9054906101000a900460ff166004811115611baf57611bae6154fc565b5b14611bef576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401611be690615573565b60405180910390fd5b611c47815f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff168260020154611c22611793565b73ffffffffffffffffffffffffffffffffffffffff1661404a9092919063ffffffff16565b6004816003015f6101000a81548160ff02191690836004811115611c6e57611c6d6154fc565b5b02179055507f315b8a0ece450231870bda1ecceeabdc74b6d0e53d6eb663bb910e3a6f42d6f182604051611ca29190614f56565b60405180910390a15050565b5f5f1b611cba81613bd4565b5f60085f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20905060016004811115611d0e57611d0d6154fc565b5b816003015f9054906101000a900460ff166004811115611d3157611d306154fc565b5b14611d71576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401611d6890615dce565b60405180910390fd5b6002816003015f6101000a81548160ff02191690836004811115611d9857611d976154fc565b5b0217905550505050565b5f5f611dad836117d1565b905080841115611df8578284826040517f79012fb2000000000000000000000000000000000000000000000000000000008152600401611def93929190615dec565b60405180910390fd5b5f611e0285613830565b9050611e17611e0f613bbb565b8587846140c9565b809250505092915050565b5f5f5f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20549050919050565b5f5f1b611e7381613bd4565b5f60095f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20905060016004811115611ec757611ec66154fc565b5b816003015f9054906101000a900460ff166004811115611eea57611ee96154fc565b5b14611f2a576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401611f2190615dce565b60405180910390fd5b6002816003015f6101000a81548160ff02191690836004811115611f5157611f506154fc565b5b0217905550505050565b5f5f1b611f6781613bd4565b5f600c5f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f6101000a81548160ff0219169083151502179055508173ffffffffffffffffffffffffffffffffffffffff167ff915cd9fe234de6e8d3afe7bf2388d35b2b6d48e8c629a24602019bde79c213a60405160405180910390a25050565b5f61200b614153565b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1603612042573391505b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff1603612079578192505b8173ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614806120b957506120b8833361304f565b5b6120f8576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016120ef90615696565b60405180910390fd5b5f841161213a576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161213190615e6b565b60405180910390fd5b8361214483611e22565b1015612185576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161217c90615ed3565b60405180910390fd5b612190823086613ef9565b5f90505f60048111156121a6576121a56154fc565b5b60095f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f206003015f9054906101000a900460ff166004811115612205576122046154fc565b5b14612245576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161223c90615f3b565b60405180910390fd5b60405180608001604052808373ffffffffffffffffffffffffffffffffffffffff1681526020018473ffffffffffffffffffffffffffffffffffffffff168152602001858152602001600160048111156122a2576122a16154fc565b5b81525060095f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f820151815f015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055506020820151816001015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550604082015181600201556060820151816003015f6101000a81548160ff021916908360048111156123a05761239f6154fc565b5b0217905550905050808273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167f1fdc681a13d8c5da54e301c7ce6542dcde4581e4725043fdab2db12ddc5745063388604051612408929190615f59565b60405180910390a49392505050565b5f5f1b61242381613bd4565b61242b614194565b50565b5f612437614153565b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff160361246e573391505b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff16036124a5578192505b8173ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614806124e557506124e4833361304f565b5b612524576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161251b90615696565b60405180910390fd5b5f8411612566576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161255d90615fca565b60405180910390fd5b8361256f611793565b73ffffffffffffffffffffffffffffffffffffffff166370a08231336040518263ffffffff1660e01b81526004016125a79190614f56565b602060405180830381865afa1580156125c2573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906125e69190615316565b1015612627576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161261e90616032565b60405180910390fd5b61265b333086612635611793565b73ffffffffffffffffffffffffffffffffffffffff166141f6909392919063ffffffff16565b5f90505f6004811115612671576126706154fc565b5b60085f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f206003015f9054906101000a900460ff1660048111156126d0576126cf6154fc565b5b14612710576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016127079061609a565b60405180910390fd5b60405180608001604052808373ffffffffffffffffffffffffffffffffffffffff1681526020018473ffffffffffffffffffffffffffffffffffffffff1681526020018581526020016001600481111561276d5761276c6154fc565b5b81525060085f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f820151815f015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055506020820151816001015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550604082015181600201556060820151816003015f6101000a81548160ff0219169083600481111561286b5761286a6154fc565b5b0217905550905050808273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167fbb58420bb8ce44e11b84e214cc0de10ce5e7c24d0355b2815c3d758b514cae7233886040516128d3929190615f59565b60405180910390a49392505050565b600c602052805f5260405f205f915054906101000a900460ff1681565b7f04824fcb60e7cc526d70b264caa65b62ed44d9c8e5d230e8ff6b0c7373843b8a61292981613bd4565b5f821161296b576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161296290616102565b60405180910390fd5b816007819055505050565b5f60055f8481526020019081526020015f205f015f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f9054906101000a900460ff16905092915050565b5f5f6129e58361334e565b905080841115612a30578284826040517f284ff667000000000000000000000000000000000000000000000000000000008152600401612a2793929190615dec565b60405180910390fd5b5f612a3a85612da1565b9050612a4f612a47613bbb565b8583886140c9565b809250505092915050565b606060048054612a699061536e565b80601f0160208091040260200160405190810160405280929190818152602001828054612a959061536e565b8015612ae05780601f10612ab757610100808354040283529160200191612ae0565b820191905f5260205f20905b815481529060010190602001808311612ac357829003601f168201915b5050505050905090565b5f600754905090565b5f5f60085f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f206040518060800160405290815f82015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001600182015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200160028201548152602001600382015f9054906101000a900460ff166004811115612c1457612c136154fc565b5b6004811115612c2657612c256154fc565b5b81525050905060026004811115612c4057612c3f6154fc565b5b81606001516004811115612c5757612c566154fc565b5b03612c69578060400151915050612c6e565b5f9150505b92915050565b5f5f1b81565b5f600c5f3373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f9054906101000a900460ff1615612d05576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401612cfc90615476565b60405180910390fd5b600c5f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f9054906101000a900460ff1615612d8f576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401612d86906154de565b60405180910390fd5b612d998383614278565b905092915050565b5f6040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401612dd49061540e565b60405180910390fd5b5f5f5f1b612dea81613bd4565b5f60095f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20905060016004811115612e3e57612e3d6154fc565b5b816003015f9054906101000a900460ff166004811115612e6157612e606154fc565b5b14612ea1576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401612e98906156fe565b60405180910390fd5b612eac866001613d00565b92508060020154831115612ef5576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401612eec9061616a565b60405180910390fd5b612f278587612f02611793565b73ffffffffffffffffffffffffffffffffffffffff1661404a9092919063ffffffff16565b612f31308461429a565b8281600201541115612f7a57612f7930825f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff16858460020154612f7491906155be565b613ef9565b5b6003816003015f6101000a81548160ff02191690836004811115612fa157612fa06154fc565b5b0217905550805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168573ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167ffbde797d201c681b91056529119e0b02407c7bb96a4a2c75c01fc9667232c8db898760405161303e9291906155f1565b60405180910390a450509392505050565b5f600a5f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f9054906101000a900460ff16905092915050565b5f5f5f1b6130ea81613bd4565b5f60095f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2090506001600481111561313e5761313d6154fc565b5b816003015f9054906101000a900460ff166004811115613161576131606154fc565b5b146131a1576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401613198906156fe565b60405180910390fd5b80600201548611156131e8576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016131df9061616a565b60405180910390fd5b6131f2865f613b32565b92506132268584613201611793565b73ffffffffffffffffffffffffffffffffffffffff1661404a9092919063ffffffff16565b613230308761429a565b85816002015411156132795761327830825f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1688846002015461327391906155be565b613ef9565b5b6003816003015f6101000a81548160ff021916908360048111156132a05761329f6154fc565b5b0217905550805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168573ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167ffbde797d201c681b91056529119e0b02407c7bb96a4a2c75c01fc9667232c8db868a60405161333d9291906155f1565b60405180910390a450509392505050565b5f7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff9050919050565b5f613382825f613d00565b9050919050565b5f61339c61339683611e22565b5f613b32565b9050919050565b6133ac82611195565b6133b581613bd4565b6133bf8383613e0f565b50505050565b5f6133cf82611e22565b9050919050565b5f5f5f1b6133e381613bd4565b5f60085f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20905060016004811115613437576134366154fc565b5b816003015f9054906101000a900460ff16600481111561345a576134596154fc565b5b1461349a576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161349190615573565b60405180910390fd5b6134a5866001613b32565b925080600201548311156134ee576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016134e5906161d2565b60405180910390fd5b6134f88587613d89565b828160020154111561356857613567815f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1684836002015461353a91906155be565b613542611793565b73ffffffffffffffffffffffffffffffffffffffff1661404a9092919063ffffffff16565b5b6003816003015f6101000a81548160ff0219169083600481111561358f5761358e6154fc565b5b02179055508473ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167fdcbc1c05240f31ff3ad067ef1ee35ce4997762752e3a095284754544f4c709d785896040516135f39291906155f1565b60405180910390a350509392505050565b5f60015f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2054905092915050565b600b5481565b5f6103e8600b548361369e91906161f0565b6136a8919061625e565b9050919050565b5f5f60095f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f206040518060800160405290815f82015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001600182015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200160028201548152602001600382015f9054906101000a900460ff1660048111156137d0576137cf6154fc565b5b60048111156137e2576137e16154fc565b5b815250509050600260048111156137fc576137fb6154fc565b5b81606001516004811115613813576138126154fc565b5b0361382557806040015191505061382a565b5f9150505b92915050565b5f6040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016138639061540e565b60405180910390fd5b7f04824fcb60e7cc526d70b264caa65b62ed44d9c8e5d230e8ff6b0c7373843b8a81565b5f5f1b61389c81613bd4565b6001600c5f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f6101000a81548160ff0219169083151502179055508173ffffffffffffffffffffffffffffffffffffffff167f4f2a367e694e71282f29ab5eaa04c4c0be45ac5bf2ca74fb67068b98bdc2887d60405160405180910390a25050565b5f5f60095f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f206040518060800160405290815f82015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001600182015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200160028201548152602001600382015f9054906101000a900460ff166004811115613a5957613a586154fc565b5b6004811115613a6b57613a6a6154fc565b5b81525050905060016004811115613a8557613a846154fc565b5b81606001516004811115613a9c57613a9b6154fc565b5b03613aae578060400151915050613ab3565b5f9150505b92915050565b5f7f7965db0b000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff19161480613b2b5750613b2a82614319565b5b9050919050565b5f5f6003811115613b4657613b456154fc565b5b826003811115613b5957613b586154fc565b5b03613b8b57613b846007546c0c9f2c9cd04674edea400000005f86614382909392919063ffffffff16565b9050613bb5565b613bb26007546c0c9f2c9cd04674edea40000000600186614382909392919063ffffffff16565b90505b92915050565b5f33905090565b613bcf83838360016143cf565b505050565b613be581613be0613bbb565b61459e565b50565b5f613bf38383612976565b613cc857600160055f8581526020019081526020015f205f015f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f6101000a81548160ff021916908315150217905550613c65613bbb565b73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16847f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d60405160405180910390a460019050613ccc565b5f90505b92915050565b5f5f613cdc613bbb565b9050613ce98582856145ef565b613cf4858585613ef9565b60019150509392505050565b5f5f6003811115613d1457613d136154fc565b5b826003811115613d2757613d266154fc565b5b03613d5957613d526c0c9f2c9cd04674edea400000006007545f86614382909392919063ffffffff16565b9050613d83565b613d806c0c9f2c9cd04674edea40000000600754600186614382909392919063ffffffff16565b90505b92915050565b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1603613df9575f6040517fec442f05000000000000000000000000000000000000000000000000000000008152600401613df09190614f56565b60405180910390fd5b613e045f8383614682565b5050565b5f5f905090565b5f613e1a8383612976565b15613eef575f60055f8581526020019081526020015f205f015f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f6101000a81548160ff021916908315150217905550613e8c613bbb565b73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16847ff6391f5c32d9c69d2a47ea670b442974b53935d1edc7fd64eb21e047a839171b60405160405180910390a460019050613ef3565b5f90505b92915050565b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff1603613f69575f6040517f96c6fd1e000000000000000000000000000000000000000000000000000000008152600401613f609190614f56565b60405180910390fd5b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1603613fd9575f6040517fec442f05000000000000000000000000000000000000000000000000000000008152600401613fd09190614f56565b60405180910390fd5b613fe4838383614682565b505050565b613ff161489b565b5f60065f6101000a81548160ff0219169083151502179055507f5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa614033613bbb565b6040516140409190614f56565b60405180910390a1565b6140c4838473ffffffffffffffffffffffffffffffffffffffff1663a9059cbb858560405160240161407d929190615f59565b604051602081830303815290604052915060e01b6020820180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff83818316178352505050506148db565b505050565b6140dc6140d4611793565b8530856141f6565b6140e68382613d89565b8273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167fdcbc1c05240f31ff3ad067ef1ee35ce4997762752e3a095284754544f4c709d784846040516141459291906155f1565b60405180910390a350505050565b61415b611a26565b15614192576040517fd93c066500000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b565b61419c614153565b600160065f6101000a81548160ff0219169083151502179055507f62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a2586141df613bbb565b6040516141ec9190614f56565b60405180910390a1565b614272848573ffffffffffffffffffffffffffffffffffffffff166323b872dd86868660405160240161422b9392919061628e565b604051602081830303815290604052915060e01b6020820180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff83818316178352505050506148db565b50505050565b5f5f614282613bbb565b905061428f818585613ef9565b600191505092915050565b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff160361430a575f6040517f96c6fd1e0000000000000000000000000000000000000000000000000000000081526004016143019190614f56565b60405180910390fd5b614315825f83614682565b5050565b5f7f01ffc9a7000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916149050919050565b5f6143b061438f83614976565b80156143ab57505f84806143a6576143a5616231565b5b868809115b6149a3565b6143bb8686866149ae565b6143c591906162c3565b9050949350505050565b5f73ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff160361443f575f6040517fe602df050000000000000000000000000000000000000000000000000000000081526004016144369190614f56565b60405180910390fd5b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff16036144af575f6040517f94280d620000000000000000000000000000000000000000000000000000000081526004016144a69190614f56565b60405180910390fd5b8160015f8673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20819055508015614598578273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b9258460405161458f9190614aec565b60405180910390a35b50505050565b6145a88282612976565b6145eb5780826040517fe2517d3f0000000000000000000000000000000000000000000000000000000081526004016145e29291906162f6565b60405180910390fd5b5050565b5f6145fa8484613604565b90507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff81101561467c578181101561466d578281836040517ffb8f41b200000000000000000000000000000000000000000000000000000000815260040161466493929190615dec565b60405180910390fd5b61467b84848484035f6143cf565b5b50505050565b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff16036146d2578060025f8282546146c691906162c3565b925050819055506147a0565b5f5f5f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205490508181101561475b578381836040517fe450d38c00000000000000000000000000000000000000000000000000000000815260040161475293929190615dec565b60405180910390fd5b8181035f5f8673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2081905550505b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16036147e7578060025f8282540392505081905550614831565b805f5f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f82825401925050819055505b8173ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef8360405161488e9190614aec565b60405180910390a3505050565b6148a3611a26565b6148d9576040517f8dfc202b00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b565b5f5f60205f8451602086015f885af1806148fa576040513d5f823e3d81fd5b3d92505f519150505f821461491357600181141561492e565b5f8473ffffffffffffffffffffffffffffffffffffffff163b145b1561497057836040517f5274afe70000000000000000000000000000000000000000000000000000000081526004016149679190614f56565b60405180910390fd5b50505050565b5f6001600283600381111561498e5761498d6154fc565b5b614998919061631d565b60ff16149050919050565b5f8115159050919050565b5f5f5f6149bb8686614a8d565b915091505f82036149e0578381816149d6576149d5616231565b5b0492505050614a86565b8184116149ff576149fe6149f95f861460126011614aaa565b614ac3565b5b5f8486880990508181118303925080820391505f855f038616905080860495508083049250600181825f0304019050808402831792505f600287600302189050808702600203810290508087026002038102905080870260020381029050808702600203810290508087026002038102905080870260020381029050808402955050505050505b9392505050565b5f5f5f198385098385029150818110828203039250509250929050565b5f614ab4846149a3565b82841802821890509392505050565b634e487b715f52806020526024601cfd5b5f819050919050565b614ae681614ad4565b82525050565b5f602082019050614aff5f830184614add565b92915050565b5f604051905090565b5f5ffd5b5f5ffd5b5f7fffffffff0000000000000000000000000000000000000000000000000000000082169050919050565b614b4a81614b16565b8114614b54575f5ffd5b50565b5f81359050614b6581614b41565b92915050565b5f60208284031215614b8057614b7f614b0e565b5b5f614b8d84828501614b57565b91505092915050565b5f8115159050919050565b614baa81614b96565b82525050565b5f602082019050614bc35f830184614ba1565b92915050565b5f81519050919050565b5f82825260208201905092915050565b8281835e5f83830152505050565b5f601f19601f8301169050919050565b5f614c0b82614bc9565b614c158185614bd3565b9350614c25818560208601614be3565b614c2e81614bf1565b840191505092915050565b5f6020820190508181035f830152614c518184614c01565b905092915050565b614c6281614ad4565b8114614c6c575f5ffd5b50565b5f81359050614c7d81614c59565b92915050565b5f60208284031215614c9857614c97614b0e565b5b5f614ca584828501614c6f565b91505092915050565b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f614cd782614cae565b9050919050565b614ce781614ccd565b8114614cf1575f5ffd5b50565b5f81359050614d0281614cde565b92915050565b5f5f60408385031215614d1e57614d1d614b0e565b5b5f614d2b85828601614cf4565b9250506020614d3c85828601614c6f565b9150509250929050565b5f60208284031215614d5b57614d5a614b0e565b5b5f614d6884828501614cf4565b91505092915050565b5f5f5f60608486031215614d8857614d87614b0e565b5b5f614d9586828701614cf4565b9350506020614da686828701614cf4565b9250506040614db786828701614c6f565b9150509250925092565b5f819050919050565b614dd381614dc1565b8114614ddd575f5ffd5b50565b5f81359050614dee81614dca565b92915050565b5f60208284031215614e0957614e08614b0e565b5b5f614e1684828501614de0565b91505092915050565b614e2881614dc1565b82525050565b5f602082019050614e415f830184614e1f565b92915050565b5f5f60408385031215614e5d57614e5c614b0e565b5b5f614e6a85828601614c6f565b9250506020614e7b85828601614cf4565b9150509250929050565b5f5f5f60608486031215614e9c57614e9b614b0e565b5b5f614ea986828701614c6f565b9350506020614eba86828701614cf4565b9250506040614ecb86828701614cf4565b9150509250925092565b5f5f60408385031215614eeb57614eea614b0e565b5b5f614ef885828601614de0565b9250506020614f0985828601614cf4565b9150509250929050565b5f60ff82169050919050565b614f2881614f13565b82525050565b5f602082019050614f415f830184614f1f565b92915050565b614f5081614ccd565b82525050565b5f602082019050614f695f830184614f47565b92915050565b5f5ffd5b5f6101008284031215614f8957614f88614f6f565b5b81905092915050565b5f5ffd5b5f5ffd5b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b614fd082614bf1565b810181811067ffffffffffffffff82111715614fef57614fee614f9a565b5b80604052505050565b5f615001614b05565b905061500d8282614fc7565b919050565b5f67ffffffffffffffff82111561502c5761502b614f9a565b5b61503582614bf1565b9050602081019050919050565b828183375f83830152505050565b5f61506261505d84615012565b614ff8565b90508281526020810184848401111561507e5761507d614f96565b5b615089848285615042565b509392505050565b5f82601f8301126150a5576150a4614f92565b5b81356150b5848260208601615050565b91505092915050565b5f5f604083850312156150d4576150d3614b0e565b5b5f83013567ffffffffffffffff8111156150f1576150f0614b12565b5b6150fd85828601614f73565b925050602083013567ffffffffffffffff81111561511e5761511d614b12565b5b61512a85828601615091565b9150509250929050565b5f81519050919050565b5f82825260208201905092915050565b5f61515882615134565b615162818561513e565b9350615172818560208601614be3565b61517b81614bf1565b840191505092915050565b5f6040820190506151995f830185614ba1565b81810360208301526151ab818461514e565b90509392505050565b5f5ffd5b5f5ffd5b5f5f83601f8401126151d1576151d0614f92565b5b8235905067ffffffffffffffff8111156151ee576151ed6151b4565b5b60208301915083600182028301111561520a576152096151b8565b5b9250929050565b5f5f6020838503121561522757615226614b0e565b5b5f83013567ffffffffffffffff81111561524457615243614b12565b5b615250858286016151bc565b92509250509250929050565b61526581614b96565b811461526f575f5ffd5b50565b5f813590506152808161525c565b92915050565b5f5f6040838503121561529c5761529b614b0e565b5b5f6152a985828601614cf4565b92505060206152ba85828601615272565b9150509250929050565b5f5f604083850312156152da576152d9614b0e565b5b5f6152e785828601614cf4565b92505060206152f885828601614cf4565b9150509250929050565b5f8151905061531081614c59565b92915050565b5f6020828403121561532b5761532a614b0e565b5b5f61533884828501615302565b91505092915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b5f600282049050600182168061538557607f821691505b60208210810361539857615397615341565b5b50919050565b7f4173796e63207661756c743a20757365207072657669657720616674657220725f8201527f6571756573740000000000000000000000000000000000000000000000000000602082015250565b5f6153f8602683614bd3565b91506154038261539e565b604082019050919050565b5f6020820190508181035f830152615425816153ec565b9050919050565b7f53656e6465722066726f7a656e000000000000000000000000000000000000005f82015250565b5f615460600d83614bd3565b915061546b8261542c565b602082019050919050565b5f6020820190508181035f83015261548d81615454565b9050919050565b7f526563697069656e742066726f7a656e000000000000000000000000000000005f82015250565b5f6154c8601083614bd3565b91506154d382615494565b602082019050919050565b5f6020820190508181035f8301526154f5816154bc565b9050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602160045260245ffd5b7f4e6f2070656e64696e67206465706f73697400000000000000000000000000005f82015250565b5f61555d601283614bd3565b915061556882615529565b602082019050919050565b5f6020820190508181035f83015261558a81615551565b9050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f6155c882614ad4565b91506155d383614ad4565b92508282039050818111156155eb576155ea615591565b5b92915050565b5f6040820190506156045f830185614add565b6156116020830184614add565b9392505050565b5f61562282614f13565b915061562d83614f13565b9250828201905060ff81111561564657615645615591565b5b92915050565b7f4e6f7420617574686f72697a65640000000000000000000000000000000000005f82015250565b5f615680600e83614bd3565b915061568b8261564c565b602082019050919050565b5f6020820190508181035f8301526156ad81615674565b9050919050565b7f4e6f2070656e64696e672072656465656d0000000000000000000000000000005f82015250565b5f6156e8601183614bd3565b91506156f3826156b4565b602082019050919050565b5f6020820190508181035f830152615715816156dc565b9050919050565b5f61572a6020840184614c6f565b905092915050565b61573b81614ad4565b82525050565b5f61574f6020840184614de0565b905092915050565b61576081614dc1565b82525050565b5f6157746020840184614cf4565b905092915050565b61578581614ccd565b82525050565b5f5ffd5b5f5ffd5b5f5ffd5b5f5f833560016020038436030381126157b3576157b2615793565b5b83810192508235915060208301925067ffffffffffffffff8211156157db576157da61578b565b5b6020820236038313156157f1576157f061578f565b5b509250929050565b5f82825260208201905092915050565b5f5ffd5b82818337505050565b5f61582183856157f9565b93507f07ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff83111561585457615853615809565b5b60208302925061586583858461580d565b82840190509392505050565b5f5f8335600160200384360303811261588d5761588c615793565b5b83810192508235915060208301925067ffffffffffffffff8211156158b5576158b461578b565b5b6001820236038313156158cb576158ca61578f565b5b509250929050565b5f82825260208201905092915050565b5f6158ee83856158d3565b93506158fb838584615042565b61590483614bf1565b840190509392505050565b5f61010083016159215f84018461571c565b61592d5f860182615732565b5061593b602084018461571c565b6159486020860182615732565b506159566040840184615741565b6159636040860182615757565b50615971606084018461571c565b61597e6060860182615732565b5061598c6080840184615741565b6159996080860182615757565b506159a760a0840184615766565b6159b460a086018261577c565b506159c260c0840184615797565b85830360c08701526159d5838284615816565b925050506159e660e0840184615871565b85830360e08701526159f98382846158e3565b925050508091505092915050565b5f6020820190508181035f830152615a1f818461590f565b905092915050565b5f5ffd5b5f5ffd5b5f67ffffffffffffffff821115615a4957615a48614f9a565b5b602082029050602081019050919050565b5f615a6c615a6784615a2f565b614ff8565b90508083825260208201905060208402830185811115615a8f57615a8e6151b8565b5b835b81811015615ab85780615aa48882614de0565b845260208401935050602081019050615a91565b5050509392505050565b5f82601f830112615ad657615ad5614f92565b5b8135615ae6848260208601615a5a565b91505092915050565b5f6101008284031215615b0557615b04615a27565b5b615b10610100614ff8565b90505f615b1f84828501614c6f565b5f830152506020615b3284828501614c6f565b6020830152506040615b4684828501614de0565b6040830152506060615b5a84828501614c6f565b6060830152506080615b6e84828501614de0565b60808301525060a0615b8284828501614cf4565b60a08301525060c082013567ffffffffffffffff811115615ba657615ba5615a2b565b5b615bb284828501615ac2565b60c08301525060e082013567ffffffffffffffff811115615bd657615bd5615a2b565b5b615be284828501615091565b60e08301525092915050565b5f60208284031215615c0357615c02614b0e565b5b5f82013567ffffffffffffffff811115615c2057615c1f614b12565b5b615c2c84828501615aef565b91505092915050565b5f615c3f82614cae565b9050919050565b615c4f81615c35565b8114615c59575f5ffd5b50565b5f81519050615c6a81615c46565b92915050565b5f5f5f5f5f60a08688031215615c8957615c88614b0e565b5b5f615c9688828901615c5c565b9550506020615ca788828901615c5c565b9450506040615cb888828901615302565b9350506060615cc988828901615c5c565b9250506080615cda88828901615302565b9150509295509295909350565b5f606082019050615cfa5f830186614add565b615d076020830185614f47565b615d146040830184614f47565b949350505050565b7f4665652063616e6e6f74206578636565642031303025000000000000000000005f82015250565b5f615d50601683614bd3565b9150615d5b82615d1c565b602082019050919050565b5f6020820190508181035f830152615d7d81615d44565b9050919050565b7f4e6f742070656e64696e670000000000000000000000000000000000000000005f82015250565b5f615db8600b83614bd3565b9150615dc382615d84565b602082019050919050565b5f6020820190508181035f830152615de581615dac565b9050919050565b5f606082019050615dff5f830186614f47565b615e0c6020830185614add565b615e196040830184614add565b949350505050565b7f536861726573206d7573742062652067726561746572207468616e20300000005f82015250565b5f615e55601d83614bd3565b9150615e6082615e21565b602082019050919050565b5f6020820190508181035f830152615e8281615e49565b9050919050565b7f496e73756666696369656e7420736861726573000000000000000000000000005f82015250565b5f615ebd601383614bd3565b9150615ec882615e89565b602082019050919050565b5f6020820190508181035f830152615eea81615eb1565b9050919050565b7f50656e64696e672072656465656d2065786973747300000000000000000000005f82015250565b5f615f25601583614bd3565b9150615f3082615ef1565b602082019050919050565b5f6020820190508181035f830152615f5281615f19565b9050919050565b5f604082019050615f6c5f830185614f47565b615f796020830184614add565b9392505050565b7f417373657473206d7573742062652067726561746572207468616e20300000005f82015250565b5f615fb4601d83614bd3565b9150615fbf82615f80565b602082019050919050565b5f6020820190508181035f830152615fe181615fa8565b9050919050565b7f496e73756666696369656e742062616c616e63650000000000000000000000005f82015250565b5f61601c601483614bd3565b915061602782615fe8565b602082019050919050565b5f6020820190508181035f83015261604981616010565b9050919050565b7f50656e64696e67206465706f73697420657869737473000000000000000000005f82015250565b5f616084601683614bd3565b915061608f82616050565b602082019050919050565b5f6020820190508181035f8301526160b181616078565b9050919050565b7f5072696365206d7573742062652067726561746572207468616e2030000000005f82015250565b5f6160ec601c83614bd3565b91506160f7826160b8565b602082019050919050565b5f6020820190508181035f830152616119816160e0565b9050919050565b7f496e73756666696369656e742070656e64696e672073686172657300000000005f82015250565b5f616154601b83614bd3565b915061615f82616120565b602082019050919050565b5f6020820190508181035f83015261618181616148565b9050919050565b7f496e73756666696369656e742070656e64696e672061737365747300000000005f82015250565b5f6161bc601b83614bd3565b91506161c782616188565b602082019050919050565b5f6020820190508181035f8301526161e9816161b0565b9050919050565b5f6161fa82614ad4565b915061620583614ad4565b925082820261621381614ad4565b9150828204841483151761622a57616229615591565b5b5092915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601260045260245ffd5b5f61626882614ad4565b915061627383614ad4565b92508261628357616282616231565b5b828204905092915050565b5f6060820190506162a15f830186614f47565b6162ae6020830185614f47565b6162bb6040830184614add565b949350505050565b5f6162cd82614ad4565b91506162d883614ad4565b92508282019050808211156162f0576162ef615591565b5b92915050565b5f6040820190506163095f830185614f47565b6163166020830184614e1f565b9392505050565b5f61632782614f13565b915061633283614f13565b92508261634257616341616231565b5b82820690509291505056fea2646970667358221220bb23fae82dea969a3eab97e137ef206715a11a701a5f6e32afb30996bb7eaaa564736f6c634300081c0033",
  "deployedBytecode": "0x608060405234801561000f575f5ffd5b50600436106103ad575f3560e01c8063788649ea116101f2578063b6363cf211610118578063dd62ed3e116100ab578063ef8b30f71161007a578063ef8b30f714610c72578063f00acbaa14610ca2578063f26c159f14610cc0578063f5a23d8d14610cdc576103ad565b8063dd62ed3e14610bc4578063ddca3f4314610bf4578063e161c3bf14610c12578063eaed1d0714610c42576103ad565b8063ce96cb77116100e7578063ce96cb7714610b18578063d547741f14610b48578063d905777e14610b64578063da39b3e714610b94576103ad565b8063b6363cf214610a58578063ba08765214610a88578063c63d75b614610ab8578063c6e6f59214610ae8576103ad565b806394bf804d11610190578063a217fddf1161015f578063a217fddf146109aa578063a9059cbb146109c8578063b3d7f6b9146109f8578063b460af9414610a28576103ad565b806394bf804d1461090e57806395d89b411461093e57806398d5fdca1461095c578063995ea21a1461097a576103ad565b806385b77f45116101cc57806385b77f4514610862578063860838a51461089257806391b7f5ed146108c257806391d14854146108de576103ad565b8063788649ea1461080c5780637d41c86e146108285780638456cb5914610858576103ad565b806338401c43116102d7578063558a7297116102755780636db79869116102445780636db79869146107745780636e553f651461079057806370a08231146107c057806376b4eb32146107f0576103ad565b8063558a7297146106ee5780635c975abb1461071e57806369fe0e2d1461073c5780636d14c2f614610758576103ad565b8063402d267d116102b1578063402d267d1461064157806340691db4146106715780634585e33b146106a25780634cdad506146106be576103ad565b806338401c43146105fd57806338d52e0f146106195780633f4ba83a14610637576103ad565b806318160ddd1161034f5780632e2d29841161031e5780632e2d2984146105775780632f2ff15d146105a7578063313ce567146105c357806336568abe146105e1576103ad565b806318160ddd146104c957806323b872dd146104e7578063248a9ca31461051757806326c6f96c14610547576103ad565b806307a2d13a1161038b57806307a2d13a1461041d578063095ea7b31461044d5780630a28a4771461047d5780630de93209146104ad576103ad565b806301e1d114146103b157806301ffc9a7146103cf57806306fdde03146103ff575b5f5ffd5b6103b9610d0c565b6040516103c69190614aec565b60405180910390f35b6103e960048036038101906103e49190614b6b565b610d91565b6040516103f69190614bb0565b60405180910390f35b610407610f46565b6040516104149190614c39565b60405180910390f35b61043760048036038101906104329190614c83565b610fd6565b6040516104449190614aec565b60405180910390f35b61046760048036038101906104629190614d08565b610fe8565b6040516104749190614bb0565b60405180910390f35b61049760048036038101906104929190614c83565b61100a565b6040516104a49190614aec565b60405180910390f35b6104c760048036038101906104c29190614d46565b611046565b005b6104d1611063565b6040516104de9190614aec565b60405180910390f35b61050160048036038101906104fc9190614d71565b61106c565b60405161050e9190614bb0565b60405180910390f35b610531600480360381019061052c9190614df4565b611195565b60405161053e9190614e2e565b60405180910390f35b610561600480360381019061055c9190614e47565b6111b2565b60405161056e9190614aec565b60405180910390f35b610591600480360381019061058c9190614e85565b611333565b60405161059e9190614aec565b60405180910390f35b6105c160048036038101906105bc9190614ed5565b6114cd565b005b6105cb6114ef565b6040516105d89190614f2e565b60405180910390f35b6105fb60048036038101906105f69190614ed5565b611528565b005b61061760048036038101906106129190614d46565b6115a3565b005b610621611793565b60405161062e9190614f56565b60405180910390f35b61063f6117ba565b005b61065b60048036038101906106569190614d46565b6117d1565b6040516106689190614aec565b60405180910390f35b61068b600480360381019061068691906150be565b6117fa565b604051610699929190615186565b60405180910390f35b6106bc60048036038101906106b79190615211565b61182a565b005b6106d860048036038101906106d39190614c83565b6118eb565b6040516106e59190614aec565b60405180910390f35b61070860048036038101906107039190615286565b611927565b6040516107159190614bb0565b60405180910390f35b610726611a26565b6040516107339190614bb0565b60405180910390f35b61075660048036038101906107519190614c83565b611a3b565b005b610772600480360381019061076d9190614d46565b611a97565b005b61078e60048036038101906107899190614d46565b611cae565b005b6107aa60048036038101906107a59190614e47565b611da2565b6040516107b79190614aec565b60405180910390f35b6107da60048036038101906107d59190614d46565b611e22565b6040516107e79190614aec565b60405180910390f35b61080a60048036038101906108059190614d46565b611e67565b005b61082660048036038101906108219190614d46565b611f5b565b005b610842600480360381019061083d9190614e85565b612002565b60405161084f9190614aec565b60405180910390f35b610860612417565b005b61087c60048036038101906108779190614e85565b61242e565b6040516108899190614aec565b60405180910390f35b6108ac60048036038101906108a79190614d46565b6128e2565b6040516108b99190614bb0565b60405180910390f35b6108dc60048036038101906108d79190614c83565b6128ff565b005b6108f860048036038101906108f39190614ed5565b612976565b6040516109059190614bb0565b60405180910390f35b61092860048036038101906109239190614e47565b6129da565b6040516109359190614aec565b60405180910390f35b610946612a5a565b6040516109539190614c39565b60405180910390f35b610964612aea565b6040516109719190614aec565b60405180910390f35b610994600480360381019061098f9190614e47565b612af3565b6040516109a19190614aec565b60405180910390f35b6109b2612c74565b6040516109bf9190614e2e565b60405180910390f35b6109e260048036038101906109dd9190614d08565b612c7a565b6040516109ef9190614bb0565b60405180910390f35b610a126004803603810190610a0d9190614c83565b612da1565b604051610a1f9190614aec565b60405180910390f35b610a426004803603810190610a3d9190614e85565b612ddd565b604051610a4f9190614aec565b60405180910390f35b610a726004803603810190610a6d91906152c4565b61304f565b604051610a7f9190614bb0565b60405180910390f35b610aa26004803603810190610a9d9190614e85565b6130dd565b604051610aaf9190614aec565b60405180910390f35b610ad26004803603810190610acd9190614d46565b61334e565b604051610adf9190614aec565b60405180910390f35b610b026004803603810190610afd9190614c83565b613377565b604051610b0f9190614aec565b60405180910390f35b610b326004803603810190610b2d9190614d46565b613389565b604051610b3f9190614aec565b60405180910390f35b610b626004803603810190610b5d9190614ed5565b6133a3565b005b610b7e6004803603810190610b799190614d46565b6133c5565b604051610b8b9190614aec565b60405180910390f35b610bae6004803603810190610ba99190614e85565b6133d6565b604051610bbb9190614aec565b60405180910390f35b610bde6004803603810190610bd991906152c4565b613604565b604051610beb9190614aec565b60405180910390f35b610bfc613686565b604051610c099190614aec565b60405180910390f35b610c2c6004803603810190610c279190614c83565b61368c565b604051610c399190614aec565b60405180910390f35b610c5c6004803603810190610c579190614e47565b6136af565b604051610c699190614aec565b60405180910390f35b610c8c6004803603810190610c879190614c83565b613830565b604051610c999190614aec565b60405180910390f35b610caa61386c565b604051610cb79190614e2e565b60405180910390f35b610cda6004803603810190610cd59190614d46565b613890565b005b610cf66004803603810190610cf19190614e47565b613938565b604051610d039190614aec565b60405180910390f35b5f610d15611793565b73ffffffffffffffffffffffffffffffffffffffff166370a08231306040518263ffffffff1660e01b8152600401610d4d9190614f56565b602060405180830381865afa158015610d68573d5f5f3e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610d8c9190615316565b905090565b5f7fbb9d82b2000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff19161480610e42575063e3bc4e6560e01b7bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916145b80610e915750632f0a18c560e01b7bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916145b80610ee0575063ce3bbe5060e01b7bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916145b80610f2f575063620ee8e460e01b7bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916145b80610f3f5750610f3e82613ab9565b5b9050919050565b606060038054610f559061536e565b80601f0160208091040260200160405190810160405280929190818152602001828054610f819061536e565b8015610fcc5780601f10610fa357610100808354040283529160200191610fcc565b820191905f5260205f20905b815481529060010190602001808311610faf57829003601f168201915b5050505050905090565b5f610fe1825f613b32565b9050919050565b5f5f610ff2613bbb565b9050610fff818585613bc2565b600191505092915050565b5f6040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161103d9061540e565b60405180910390fd5b5f5f1b61105281613bd4565b61105e5f5f1b83613be8565b505050565b5f600254905090565b5f600c5f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f9054906101000a900460ff16156110f7576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016110ee90615476565b60405180910390fd5b600c5f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f9054906101000a900460ff1615611181576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401611178906154de565b60405180910390fd5b61118c848484613cd2565b90509392505050565b5f60055f8381526020019081526020015f20600101549050919050565b5f5f60085f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f206040518060800160405290815f82015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001600182015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200160028201548152602001600382015f9054906101000a900460ff1660048111156112d3576112d26154fc565b5b60048111156112e5576112e46154fc565b5b815250509050600160048111156112ff576112fe6154fc565b5b81606001516004811115611316576113156154fc565b5b0361132857806040015191505061132d565b5f9150505b92915050565b5f5f5f1b61134081613bd4565b5f60085f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20905060016004811115611394576113936154fc565b5b816003015f9054906101000a900460ff1660048111156113b7576113b66154fc565b5b146113f7576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016113ee90615573565b60405180910390fd5b5f611405826002015461368c565b826002015461141491906155be565b9050611420815f613d00565b935061142c8685613d89565b6003826003015f6101000a81548160ff02191690836004811115611453576114526154fc565b5b02179055508573ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167fdcbc1c05240f31ff3ad067ef1ee35ce4997762752e3a095284754544f4c709d78460020154876040516114bb9291906155f1565b60405180910390a35050509392505050565b6114d682611195565b6114df81613bd4565b6114e98383613be8565b50505050565b5f6114f8613e08565b7f00000000000000000000000000000000000000000000000000000000000000006115239190615618565b905090565b611530613bbb565b73ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614611594576040517f6697b23200000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b61159e8282613e0f565b505050565b5f60095f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f209050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614806116455750611644823361304f565b5b611684576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161167b90615696565b60405180910390fd5b60016004811115611698576116976154fc565b5b816003015f9054906101000a900460ff1660048111156116bb576116ba6154fc565b5b146116fb576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016116f2906156fe565b60405180910390fd5b61172c30825f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff168360020154613ef9565b6004816003015f6101000a81548160ff02191690836004811115611753576117526154fc565b5b02179055507fa34b209824d24e31467e4012a81027b4937d3285d7ea71229352f1520fc61b79826040516117879190614f56565b60405180910390a15050565b5f7f0000000000000000000000000000000000000000000000000000000000000000905090565b5f5f1b6117c681613bd4565b6117ce613fe9565b50565b5f7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff9050919050565b5f606060019150836040516020016118129190615a07565b60405160208183030381529060405290509250929050565b5f828281019061183a9190615bee565b90505f5f5f5f5f8560e001518060200190518101906118599190615c70565b945094509450945094503073ffffffffffffffffffffffffffffffffffffffff16632e2d29848287886040518463ffffffff1660e01b81526004016118a093929190615ce7565b6020604051808303815f875af11580156118bc573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906118e09190615316565b505050505050505050565b5f6040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161191e9061540e565b60405180910390fd5b5f81600a5f3373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f6101000a81548160ff0219169083151502179055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167fceb576d9f15e4e200fdb5096d64d5dfd667e16def20c1eefd14256d8e3faa26784604051611a149190614bb0565b60405180910390a36001905092915050565b5f60065f9054906101000a900460ff16905090565b5f5f1b611a4781613bd4565b6103e8821115611a8c576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401611a8390615d66565b60405180910390fd5b81600b819055505050565b5f60085f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f209050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161480611b395750611b38823361304f565b5b611b78576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401611b6f90615696565b60405180910390fd5b60016004811115611b8c57611b8b6154fc565b5b816003015f9054906101000a900460ff166004811115611baf57611bae6154fc565b5b14611bef576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401611be690615573565b60405180910390fd5b611c47815f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff168260020154611c22611793565b73ffffffffffffffffffffffffffffffffffffffff1661404a9092919063ffffffff16565b6004816003015f6101000a81548160ff02191690836004811115611c6e57611c6d6154fc565b5b02179055507f315b8a0ece450231870bda1ecceeabdc74b6d0e53d6eb663bb910e3a6f42d6f182604051611ca29190614f56565b60405180910390a15050565b5f5f1b611cba81613bd4565b5f60085f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20905060016004811115611d0e57611d0d6154fc565b5b816003015f9054906101000a900460ff166004811115611d3157611d306154fc565b5b14611d71576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401611d6890615dce565b60405180910390fd5b6002816003015f6101000a81548160ff02191690836004811115611d9857611d976154fc565b5b0217905550505050565b5f5f611dad836117d1565b905080841115611df8578284826040517f79012fb2000000000000000000000000000000000000000000000000000000008152600401611def93929190615dec565b60405180910390fd5b5f611e0285613830565b9050611e17611e0f613bbb565b8587846140c9565b809250505092915050565b5f5f5f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20549050919050565b5f5f1b611e7381613bd4565b5f60095f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20905060016004811115611ec757611ec66154fc565b5b816003015f9054906101000a900460ff166004811115611eea57611ee96154fc565b5b14611f2a576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401611f2190615dce565b60405180910390fd5b6002816003015f6101000a81548160ff02191690836004811115611f5157611f506154fc565b5b0217905550505050565b5f5f1b611f6781613bd4565b5f600c5f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f6101000a81548160ff0219169083151502179055508173ffffffffffffffffffffffffffffffffffffffff167ff915cd9fe234de6e8d3afe7bf2388d35b2b6d48e8c629a24602019bde79c213a60405160405180910390a25050565b5f61200b614153565b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1603612042573391505b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff1603612079578192505b8173ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614806120b957506120b8833361304f565b5b6120f8576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016120ef90615696565b60405180910390fd5b5f841161213a576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161213190615e6b565b60405180910390fd5b8361214483611e22565b1015612185576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161217c90615ed3565b60405180910390fd5b612190823086613ef9565b5f90505f60048111156121a6576121a56154fc565b5b60095f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f206003015f9054906101000a900460ff166004811115612205576122046154fc565b5b14612245576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161223c90615f3b565b60405180910390fd5b60405180608001604052808373ffffffffffffffffffffffffffffffffffffffff1681526020018473ffffffffffffffffffffffffffffffffffffffff168152602001858152602001600160048111156122a2576122a16154fc565b5b81525060095f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f820151815f015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055506020820151816001015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550604082015181600201556060820151816003015f6101000a81548160ff021916908360048111156123a05761239f6154fc565b5b0217905550905050808273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167f1fdc681a13d8c5da54e301c7ce6542dcde4581e4725043fdab2db12ddc5745063388604051612408929190615f59565b60405180910390a49392505050565b5f5f1b61242381613bd4565b61242b614194565b50565b5f612437614153565b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff160361246e573391505b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff16036124a5578192505b8173ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614806124e557506124e4833361304f565b5b612524576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161251b90615696565b60405180910390fd5b5f8411612566576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161255d90615fca565b60405180910390fd5b8361256f611793565b73ffffffffffffffffffffffffffffffffffffffff166370a08231336040518263ffffffff1660e01b81526004016125a79190614f56565b602060405180830381865afa1580156125c2573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906125e69190615316565b1015612627576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161261e90616032565b60405180910390fd5b61265b333086612635611793565b73ffffffffffffffffffffffffffffffffffffffff166141f6909392919063ffffffff16565b5f90505f6004811115612671576126706154fc565b5b60085f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f206003015f9054906101000a900460ff1660048111156126d0576126cf6154fc565b5b14612710576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016127079061609a565b60405180910390fd5b60405180608001604052808373ffffffffffffffffffffffffffffffffffffffff1681526020018473ffffffffffffffffffffffffffffffffffffffff1681526020018581526020016001600481111561276d5761276c6154fc565b5b81525060085f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f820151815f015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055506020820151816001015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550604082015181600201556060820151816003015f6101000a81548160ff0219169083600481111561286b5761286a6154fc565b5b0217905550905050808273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167fbb58420bb8ce44e11b84e214cc0de10ce5e7c24d0355b2815c3d758b514cae7233886040516128d3929190615f59565b60405180910390a49392505050565b600c602052805f5260405f205f915054906101000a900460ff1681565b7f04824fcb60e7cc526d70b264caa65b62ed44d9c8e5d230e8ff6b0c7373843b8a61292981613bd4565b5f821161296b576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161296290616102565b60405180910390fd5b816007819055505050565b5f60055f8481526020019081526020015f205f015f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f9054906101000a900460ff16905092915050565b5f5f6129e58361334e565b905080841115612a30578284826040517f284ff667000000000000000000000000000000000000000000000000000000008152600401612a2793929190615dec565b60405180910390fd5b5f612a3a85612da1565b9050612a4f612a47613bbb565b8583886140c9565b809250505092915050565b606060048054612a699061536e565b80601f0160208091040260200160405190810160405280929190818152602001828054612a959061536e565b8015612ae05780601f10612ab757610100808354040283529160200191612ae0565b820191905f5260205f20905b815481529060010190602001808311612ac357829003601f168201915b5050505050905090565b5f600754905090565b5f5f60085f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f206040518060800160405290815f82015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001600182015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200160028201548152602001600382015f9054906101000a900460ff166004811115612c1457612c136154fc565b5b6004811115612c2657612c256154fc565b5b81525050905060026004811115612c4057612c3f6154fc565b5b81606001516004811115612c5757612c566154fc565b5b03612c69578060400151915050612c6e565b5f9150505b92915050565b5f5f1b81565b5f600c5f3373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f9054906101000a900460ff1615612d05576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401612cfc90615476565b60405180910390fd5b600c5f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f9054906101000a900460ff1615612d8f576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401612d86906154de565b60405180910390fd5b612d998383614278565b905092915050565b5f6040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401612dd49061540e565b60405180910390fd5b5f5f5f1b612dea81613bd4565b5f60095f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20905060016004811115612e3e57612e3d6154fc565b5b816003015f9054906101000a900460ff166004811115612e6157612e606154fc565b5b14612ea1576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401612e98906156fe565b60405180910390fd5b612eac866001613d00565b92508060020154831115612ef5576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401612eec9061616a565b60405180910390fd5b612f278587612f02611793565b73ffffffffffffffffffffffffffffffffffffffff1661404a9092919063ffffffff16565b612f31308461429a565b8281600201541115612f7a57612f7930825f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff16858460020154612f7491906155be565b613ef9565b5b6003816003015f6101000a81548160ff02191690836004811115612fa157612fa06154fc565b5b0217905550805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168573ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167ffbde797d201c681b91056529119e0b02407c7bb96a4a2c75c01fc9667232c8db898760405161303e9291906155f1565b60405180910390a450509392505050565b5f600a5f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f9054906101000a900460ff16905092915050565b5f5f5f1b6130ea81613bd4565b5f60095f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2090506001600481111561313e5761313d6154fc565b5b816003015f9054906101000a900460ff166004811115613161576131606154fc565b5b146131a1576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401613198906156fe565b60405180910390fd5b80600201548611156131e8576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016131df9061616a565b60405180910390fd5b6131f2865f613b32565b92506132268584613201611793565b73ffffffffffffffffffffffffffffffffffffffff1661404a9092919063ffffffff16565b613230308761429a565b85816002015411156132795761327830825f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1688846002015461327391906155be565b613ef9565b5b6003816003015f6101000a81548160ff021916908360048111156132a05761329f6154fc565b5b0217905550805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168573ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167ffbde797d201c681b91056529119e0b02407c7bb96a4a2c75c01fc9667232c8db868a60405161333d9291906155f1565b60405180910390a450509392505050565b5f7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff9050919050565b5f613382825f613d00565b9050919050565b5f61339c61339683611e22565b5f613b32565b9050919050565b6133ac82611195565b6133b581613bd4565b6133bf8383613e0f565b50505050565b5f6133cf82611e22565b9050919050565b5f5f5f1b6133e381613bd4565b5f60085f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20905060016004811115613437576134366154fc565b5b816003015f9054906101000a900460ff16600481111561345a576134596154fc565b5b1461349a576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161349190615573565b60405180910390fd5b6134a5866001613b32565b925080600201548311156134ee576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016134e5906161d2565b60405180910390fd5b6134f88587613d89565b828160020154111561356857613567815f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1684836002015461353a91906155be565b613542611793565b73ffffffffffffffffffffffffffffffffffffffff1661404a9092919063ffffffff16565b5b6003816003015f6101000a81548160ff0219169083600481111561358f5761358e6154fc565b5b02179055508473ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167fdcbc1c05240f31ff3ad067ef1ee35ce4997762752e3a095284754544f4c709d785896040516135f39291906155f1565b60405180910390a350509392505050565b5f60015f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2054905092915050565b600b5481565b5f6103e8600b548361369e91906161f0565b6136a8919061625e565b9050919050565b5f5f60095f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f206040518060800160405290815f82015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001600182015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200160028201548152602001600382015f9054906101000a900460ff1660048111156137d0576137cf6154fc565b5b60048111156137e2576137e16154fc565b5b815250509050600260048111156137fc576137fb6154fc565b5b81606001516004811115613813576138126154fc565b5b0361382557806040015191505061382a565b5f9150505b92915050565b5f6040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016138639061540e565b60405180910390fd5b7f04824fcb60e7cc526d70b264caa65b62ed44d9c8e5d230e8ff6b0c7373843b8a81565b5f5f1b61389c81613bd4565b6001600c5f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f6101000a81548160ff0219169083151502179055508173ffffffffffffffffffffffffffffffffffffffff167f4f2a367e694e71282f29ab5eaa04c4c0be45ac5bf2ca74fb67068b98bdc2887d60405160405180910390a25050565b5f5f60095f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f206040518060800160405290815f82015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001600182015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200160028201548152602001600382015f9054906101000a900460ff166004811115613a5957613a586154fc565b5b6004811115613a6b57613a6a6154fc565b5b81525050905060016004811115613a8557613a846154fc565b5b81606001516004811115613a9c57613a9b6154fc565b5b03613aae578060400151915050613ab3565b5f9150505b92915050565b5f7f7965db0b000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff19161480613b2b5750613b2a82614319565b5b9050919050565b5f5f6003811115613b4657613b456154fc565b5b826003811115613b5957613b586154fc565b5b03613b8b57613b846007546c0c9f2c9cd04674edea400000005f86614382909392919063ffffffff16565b9050613bb5565b613bb26007546c0c9f2c9cd04674edea40000000600186614382909392919063ffffffff16565b90505b92915050565b5f33905090565b613bcf83838360016143cf565b505050565b613be581613be0613bbb565b61459e565b50565b5f613bf38383612976565b613cc857600160055f8581526020019081526020015f205f015f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f6101000a81548160ff021916908315150217905550613c65613bbb565b73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16847f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d60405160405180910390a460019050613ccc565b5f90505b92915050565b5f5f613cdc613bbb565b9050613ce98582856145ef565b613cf4858585613ef9565b60019150509392505050565b5f5f6003811115613d1457613d136154fc565b5b826003811115613d2757613d266154fc565b5b03613d5957613d526c0c9f2c9cd04674edea400000006007545f86614382909392919063ffffffff16565b9050613d83565b613d806c0c9f2c9cd04674edea40000000600754600186614382909392919063ffffffff16565b90505b92915050565b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1603613df9575f6040517fec442f05000000000000000000000000000000000000000000000000000000008152600401613df09190614f56565b60405180910390fd5b613e045f8383614682565b5050565b5f5f905090565b5f613e1a8383612976565b15613eef575f60055f8581526020019081526020015f205f015f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f6101000a81548160ff021916908315150217905550613e8c613bbb565b73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16847ff6391f5c32d9c69d2a47ea670b442974b53935d1edc7fd64eb21e047a839171b60405160405180910390a460019050613ef3565b5f90505b92915050565b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff1603613f69575f6040517f96c6fd1e000000000000000000000000000000000000000000000000000000008152600401613f609190614f56565b60405180910390fd5b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1603613fd9575f6040517fec442f05000000000000000000000000000000000000000000000000000000008152600401613fd09190614f56565b60405180910390fd5b613fe4838383614682565b505050565b613ff161489b565b5f60065f6101000a81548160ff0219169083151502179055507f5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa614033613bbb565b6040516140409190614f56565b60405180910390a1565b6140c4838473ffffffffffffffffffffffffffffffffffffffff1663a9059cbb858560405160240161407d929190615f59565b604051602081830303815290604052915060e01b6020820180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff83818316178352505050506148db565b505050565b6140dc6140d4611793565b8530856141f6565b6140e68382613d89565b8273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167fdcbc1c05240f31ff3ad067ef1ee35ce4997762752e3a095284754544f4c709d784846040516141459291906155f1565b60405180910390a350505050565b61415b611a26565b15614192576040517fd93c066500000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b565b61419c614153565b600160065f6101000a81548160ff0219169083151502179055507f62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a2586141df613bbb565b6040516141ec9190614f56565b60405180910390a1565b614272848573ffffffffffffffffffffffffffffffffffffffff166323b872dd86868660405160240161422b9392919061628e565b604051602081830303815290604052915060e01b6020820180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff83818316178352505050506148db565b50505050565b5f5f614282613bbb565b905061428f818585613ef9565b600191505092915050565b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff160361430a575f6040517f96c6fd1e0000000000000000000000000000000000000000000000000000000081526004016143019190614f56565b60405180910390fd5b614315825f83614682565b5050565b5f7f01ffc9a7000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916149050919050565b5f6143b061438f83614976565b80156143ab57505f84806143a6576143a5616231565b5b868809115b6149a3565b6143bb8686866149ae565b6143c591906162c3565b9050949350505050565b5f73ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff160361443f575f6040517fe602df050000000000000000000000000000000000000000000000000000000081526004016144369190614f56565b60405180910390fd5b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff16036144af575f6040517f94280d620000000000000000000000000000000000000000000000000000000081526004016144a69190614f56565b60405180910390fd5b8160015f8673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20819055508015614598578273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b9258460405161458f9190614aec565b60405180910390a35b50505050565b6145a88282612976565b6145eb5780826040517fe2517d3f0000000000000000000000000000000000000000000000000000000081526004016145e29291906162f6565b60405180910390fd5b5050565b5f6145fa8484613604565b90507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff81101561467c578181101561466d578281836040517ffb8f41b200000000000000000000000000000000000000000000000000000000815260040161466493929190615dec565b60405180910390fd5b61467b84848484035f6143cf565b5b50505050565b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff16036146d2578060025f8282546146c691906162c3565b925050819055506147a0565b5f5f5f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205490508181101561475b578381836040517fe450d38c00000000000000000000000000000000000000000000000000000000815260040161475293929190615dec565b60405180910390fd5b8181035f5f8673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2081905550505b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16036147e7578060025f8282540392505081905550614831565b805f5f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f82825401925050819055505b8173ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef8360405161488e9190614aec565b60405180910390a3505050565b6148a3611a26565b6148d9576040517f8dfc202b00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b565b5f5f60205f8451602086015f885af1806148fa576040513d5f823e3d81fd5b3d92505f519150505f821461491357600181141561492e565b5f8473ffffffffffffffffffffffffffffffffffffffff163b145b1561497057836040517f5274afe70000000000000000000000000000000000000000000000000000000081526004016149679190614f56565b60405180910390fd5b50505050565b5f6001600283600381111561498e5761498d6154fc565b5b614998919061631d565b60ff16149050919050565b5f8115159050919050565b5f5f5f6149bb8686614a8d565b915091505f82036149e0578381816149d6576149d5616231565b5b0492505050614a86565b8184116149ff576149fe6149f95f861460126011614aaa565b614ac3565b5b5f8486880990508181118303925080820391505f855f038616905080860495508083049250600181825f0304019050808402831792505f600287600302189050808702600203810290508087026002038102905080870260020381029050808702600203810290508087026002038102905080870260020381029050808402955050505050505b9392505050565b5f5f5f198385098385029150818110828203039250509250929050565b5f614ab4846149a3565b82841802821890509392505050565b634e487b715f52806020526024601cfd5b5f819050919050565b614ae681614ad4565b82525050565b5f602082019050614aff5f830184614add565b92915050565b5f604051905090565b5f5ffd5b5f5ffd5b5f7fffffffff0000000000000000000000000000000000000000000000000000000082169050919050565b614b4a81614b16565b8114614b54575f5ffd5b50565b5f81359050614b6581614b41565b92915050565b5f60208284031215614b8057614b7f614b0e565b5b5f614b8d84828501614b57565b91505092915050565b5f8115159050919050565b614baa81614b96565b82525050565b5f602082019050614bc35f830184614ba1565b92915050565b5f81519050919050565b5f82825260208201905092915050565b8281835e5f83830152505050565b5f601f19601f8301169050919050565b5f614c0b82614bc9565b614c158185614bd3565b9350614c25818560208601614be3565b614c2e81614bf1565b840191505092915050565b5f6020820190508181035f830152614c518184614c01565b905092915050565b614c6281614ad4565b8114614c6c575f5ffd5b50565b5f81359050614c7d81614c59565b92915050565b5f60208284031215614c9857614c97614b0e565b5b5f614ca584828501614c6f565b91505092915050565b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f614cd782614cae565b9050919050565b614ce781614ccd565b8114614cf1575f5ffd5b50565b5f81359050614d0281614cde565b92915050565b5f5f60408385031215614d1e57614d1d614b0e565b5b5f614d2b85828601614cf4565b9250506020614d3c85828601614c6f565b9150509250929050565b5f60208284031215614d5b57614d5a614b0e565b5b5f614d6884828501614cf4565b91505092915050565b5f5f5f60608486031215614d8857614d87614b0e565b5b5f614d9586828701614cf4565b9350506020614da686828701614cf4565b9250506040614db786828701614c6f565b9150509250925092565b5f819050919050565b614dd381614dc1565b8114614ddd575f5ffd5b50565b5f81359050614dee81614dca565b92915050565b5f60208284031215614e0957614e08614b0e565b5b5f614e1684828501614de0565b91505092915050565b614e2881614dc1565b82525050565b5f602082019050614e415f830184614e1f565b92915050565b5f5f60408385031215614e5d57614e5c614b0e565b5b5f614e6a85828601614c6f565b9250506020614e7b85828601614cf4565b9150509250929050565b5f5f5f60608486031215614e9c57614e9b614b0e565b5b5f614ea986828701614c6f565b9350506020614eba86828701614cf4565b9250506040614ecb86828701614cf4565b9150509250925092565b5f5f60408385031215614eeb57614eea614b0e565b5b5f614ef885828601614de0565b9250506020614f0985828601614cf4565b9150509250929050565b5f60ff82169050919050565b614f2881614f13565b82525050565b5f602082019050614f415f830184614f1f565b92915050565b614f5081614ccd565b82525050565b5f602082019050614f695f830184614f47565b92915050565b5f5ffd5b5f6101008284031215614f8957614f88614f6f565b5b81905092915050565b5f5ffd5b5f5ffd5b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b614fd082614bf1565b810181811067ffffffffffffffff82111715614fef57614fee614f9a565b5b80604052505050565b5f615001614b05565b905061500d8282614fc7565b919050565b5f67ffffffffffffffff82111561502c5761502b614f9a565b5b61503582614bf1565b9050602081019050919050565b828183375f83830152505050565b5f61506261505d84615012565b614ff8565b90508281526020810184848401111561507e5761507d614f96565b5b615089848285615042565b509392505050565b5f82601f8301126150a5576150a4614f92565b5b81356150b5848260208601615050565b91505092915050565b5f5f604083850312156150d4576150d3614b0e565b5b5f83013567ffffffffffffffff8111156150f1576150f0614b12565b5b6150fd85828601614f73565b925050602083013567ffffffffffffffff81111561511e5761511d614b12565b5b61512a85828601615091565b9150509250929050565b5f81519050919050565b5f82825260208201905092915050565b5f61515882615134565b615162818561513e565b9350615172818560208601614be3565b61517b81614bf1565b840191505092915050565b5f6040820190506151995f830185614ba1565b81810360208301526151ab818461514e565b90509392505050565b5f5ffd5b5f5ffd5b5f5f83601f8401126151d1576151d0614f92565b5b8235905067ffffffffffffffff8111156151ee576151ed6151b4565b5b60208301915083600182028301111561520a576152096151b8565b5b9250929050565b5f5f6020838503121561522757615226614b0e565b5b5f83013567ffffffffffffffff81111561524457615243614b12565b5b615250858286016151bc565b92509250509250929050565b61526581614b96565b811461526f575f5ffd5b50565b5f813590506152808161525c565b92915050565b5f5f6040838503121561529c5761529b614b0e565b5b5f6152a985828601614cf4565b92505060206152ba85828601615272565b9150509250929050565b5f5f604083850312156152da576152d9614b0e565b5b5f6152e785828601614cf4565b92505060206152f885828601614cf4565b9150509250929050565b5f8151905061531081614c59565b92915050565b5f6020828403121561532b5761532a614b0e565b5b5f61533884828501615302565b91505092915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b5f600282049050600182168061538557607f821691505b60208210810361539857615397615341565b5b50919050565b7f4173796e63207661756c743a20757365207072657669657720616674657220725f8201527f6571756573740000000000000000000000000000000000000000000000000000602082015250565b5f6153f8602683614bd3565b91506154038261539e565b604082019050919050565b5f6020820190508181035f830152615425816153ec565b9050919050565b7f53656e6465722066726f7a656e000000000000000000000000000000000000005f82015250565b5f615460600d83614bd3565b915061546b8261542c565b602082019050919050565b5f6020820190508181035f83015261548d81615454565b9050919050565b7f526563697069656e742066726f7a656e000000000000000000000000000000005f82015250565b5f6154c8601083614bd3565b91506154d382615494565b602082019050919050565b5f6020820190508181035f8301526154f5816154bc565b9050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602160045260245ffd5b7f4e6f2070656e64696e67206465706f73697400000000000000000000000000005f82015250565b5f61555d601283614bd3565b915061556882615529565b602082019050919050565b5f6020820190508181035f83015261558a81615551565b9050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f6155c882614ad4565b91506155d383614ad4565b92508282039050818111156155eb576155ea615591565b5b92915050565b5f6040820190506156045f830185614add565b6156116020830184614add565b9392505050565b5f61562282614f13565b915061562d83614f13565b9250828201905060ff81111561564657615645615591565b5b92915050565b7f4e6f7420617574686f72697a65640000000000000000000000000000000000005f82015250565b5f615680600e83614bd3565b915061568b8261564c565b602082019050919050565b5f6020820190508181035f8301526156ad81615674565b9050919050565b7f4e6f2070656e64696e672072656465656d0000000000000000000000000000005f82015250565b5f6156e8601183614bd3565b91506156f3826156b4565b602082019050919050565b5f6020820190508181035f830152615715816156dc565b9050919050565b5f61572a6020840184614c6f565b905092915050565b61573b81614ad4565b82525050565b5f61574f6020840184614de0565b905092915050565b61576081614dc1565b82525050565b5f6157746020840184614cf4565b905092915050565b61578581614ccd565b82525050565b5f5ffd5b5f5ffd5b5f5ffd5b5f5f833560016020038436030381126157b3576157b2615793565b5b83810192508235915060208301925067ffffffffffffffff8211156157db576157da61578b565b5b6020820236038313156157f1576157f061578f565b5b509250929050565b5f82825260208201905092915050565b5f5ffd5b82818337505050565b5f61582183856157f9565b93507f07ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff83111561585457615853615809565b5b60208302925061586583858461580d565b82840190509392505050565b5f5f8335600160200384360303811261588d5761588c615793565b5b83810192508235915060208301925067ffffffffffffffff8211156158b5576158b461578b565b5b6001820236038313156158cb576158ca61578f565b5b509250929050565b5f82825260208201905092915050565b5f6158ee83856158d3565b93506158fb838584615042565b61590483614bf1565b840190509392505050565b5f61010083016159215f84018461571c565b61592d5f860182615732565b5061593b602084018461571c565b6159486020860182615732565b506159566040840184615741565b6159636040860182615757565b50615971606084018461571c565b61597e6060860182615732565b5061598c6080840184615741565b6159996080860182615757565b506159a760a0840184615766565b6159b460a086018261577c565b506159c260c0840184615797565b85830360c08701526159d5838284615816565b925050506159e660e0840184615871565b85830360e08701526159f98382846158e3565b925050508091505092915050565b5f6020820190508181035f830152615a1f818461590f565b905092915050565b5f5ffd5b5f5ffd5b5f67ffffffffffffffff821115615a4957615a48614f9a565b5b602082029050602081019050919050565b5f615a6c615a6784615a2f565b614ff8565b90508083825260208201905060208402830185811115615a8f57615a8e6151b8565b5b835b81811015615ab85780615aa48882614de0565b845260208401935050602081019050615a91565b5050509392505050565b5f82601f830112615ad657615ad5614f92565b5b8135615ae6848260208601615a5a565b91505092915050565b5f6101008284031215615b0557615b04615a27565b5b615b10610100614ff8565b90505f615b1f84828501614c6f565b5f830152506020615b3284828501614c6f565b6020830152506040615b4684828501614de0565b6040830152506060615b5a84828501614c6f565b6060830152506080615b6e84828501614de0565b60808301525060a0615b8284828501614cf4565b60a08301525060c082013567ffffffffffffffff811115615ba657615ba5615a2b565b5b615bb284828501615ac2565b60c08301525060e082013567ffffffffffffffff811115615bd657615bd5615a2b565b5b615be284828501615091565b60e08301525092915050565b5f60208284031215615c0357615c02614b0e565b5b5f82013567ffffffffffffffff811115615c2057615c1f614b12565b5b615c2c84828501615aef565b91505092915050565b5f615c3f82614cae565b9050919050565b615c4f81615c35565b8114615c59575f5ffd5b50565b5f81519050615c6a81615c46565b92915050565b5f5f5f5f5f60a08688031215615c8957615c88614b0e565b5b5f615c9688828901615c5c565b9550506020615ca788828901615c5c565b9450506040615cb888828901615302565b9350506060615cc988828901615c5c565b9250506080615cda88828901615302565b9150509295509295909350565b5f606082019050615cfa5f830186614add565b615d076020830185614f47565b615d146040830184614f47565b949350505050565b7f4665652063616e6e6f74206578636565642031303025000000000000000000005f82015250565b5f615d50601683614bd3565b9150615d5b82615d1c565b602082019050919050565b5f6020820190508181035f830152615d7d81615d44565b9050919050565b7f4e6f742070656e64696e670000000000000000000000000000000000000000005f82015250565b5f615db8600b83614bd3565b9150615dc382615d84565b602082019050919050565b5f6020820190508181035f830152615de581615dac565b9050919050565b5f606082019050615dff5f830186614f47565b615e0c6020830185614add565b615e196040830184614add565b949350505050565b7f536861726573206d7573742062652067726561746572207468616e20300000005f82015250565b5f615e55601d83614bd3565b9150615e6082615e21565b602082019050919050565b5f6020820190508181035f830152615e8281615e49565b9050919050565b7f496e73756666696369656e7420736861726573000000000000000000000000005f82015250565b5f615ebd601383614bd3565b9150615ec882615e89565b602082019050919050565b5f6020820190508181035f830152615eea81615eb1565b9050919050565b7f50656e64696e672072656465656d2065786973747300000000000000000000005f82015250565b5f615f25601583614bd3565b9150615f3082615ef1565b602082019050919050565b5f6020820190508181035f830152615f5281615f19565b9050919050565b5f604082019050615f6c5f830185614f47565b615f796020830184614add565b9392505050565b7f417373657473206d7573742062652067726561746572207468616e20300000005f82015250565b5f615fb4601d83614bd3565b9150615fbf82615f80565b602082019050919050565b5f6020820190508181035f830152615fe181615fa8565b9050919050565b7f496e73756666696369656e742062616c616e63650000000000000000000000005f82015250565b5f61601c601483614bd3565b915061602782615fe8565b602082019050919050565b5f6020820190508181035f83015261604981616010565b9050919050565b7f50656e64696e67206465706f73697420657869737473000000000000000000005f82015250565b5f616084601683614bd3565b915061608f82616050565b602082019050919050565b5f6020820190508181035f8301526160b181616078565b9050919050565b7f5072696365206d7573742062652067726561746572207468616e2030000000005f82015250565b5f6160ec601c83614bd3565b91506160f7826160b8565b602082019050919050565b5f6020820190508181035f830152616119816160e0565b9050919050565b7f496e73756666696369656e742070656e64696e672073686172657300000000005f82015250565b5f616154601b83614bd3565b915061615f82616120565b602082019050919050565b5f6020820190508181035f83015261618181616148565b9050919050565b7f496e73756666696369656e742070656e64696e672061737365747300000000005f82015250565b5f6161bc601b83614bd3565b91506161c782616188565b602082019050919050565b5f6020820190508181035f8301526161e9816161b0565b9050919050565b5f6161fa82614ad4565b915061620583614ad4565b925082820261621381614ad4565b9150828204841483151761622a57616229615591565b5b5092915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601260045260245ffd5b5f61626882614ad4565b915061627383614ad4565b92508261628357616282616231565b5b828204905092915050565b5f6060820190506162a15f830186614f47565b6162ae6020830185614f47565b6162bb6040830184614add565b949350505050565b5f6162cd82614ad4565b91506162d883614ad4565b92508282019050808211156162f0576162ef615591565b5b92915050565b5f6040820190506163095f830185614f47565b6163166020830184614e1f565b9392505050565b5f61632782614f13565b915061633283614f13565b92508261634257616341616231565b5b82820690509291505056fea2646970667358221220bb23fae82dea969a3eab97e137ef206715a11a701a5f6e32afb30996bb7eaaa564736f6c634300081c0033",
  "linkReferences": {},
  "deployedLinkReferences": {},
  "immutableReferences": {
    "1433": [
      {
        "length": 32,
        "start": 6038
      }
    ],
    "1435": [
      {
        "length": 32,
        "start": 5370
      }
    ]
  },
  "inputSourceName": "project/contracts/TokenVault.sol",
  "buildInfoId": "solc-0_8_28-0603b955d056901204601c139176ba9bc501e814"
}
```

---

## File: contracts/artifacts/contracts/TokenVault.sol/artifacts.d.ts (4/7)
**Filetype:** bigfile
**Modified:** No

```bigfile
// This file was autogenerated by Hardhat, do not edit it.
// prettier-ignore
// tslint:disable
// eslint-disable
// biome-ignore format: see above

export interface IERC7540$Type {
  readonly _format: "hh3-artifact-1";
  readonly contractName: "IERC7540";
  readonly sourceName: "contracts/TokenVault.sol";
  readonly abi: [{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":false,"internalType":"uint256","name":"assets","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"shares","type":"uint256"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"controller","type":"address"},{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"uint256","name":"requestId","type":"uint256"},{"indexed":false,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"assets","type":"uint256"}],"name":"DepositRequest","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"controller","type":"address"},{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":false,"internalType":"bool","name":"approved","type":"bool"}],"name":"OperatorSet","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"controller","type":"address"},{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"uint256","name":"requestId","type":"uint256"},{"indexed":false,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"shares","type":"uint256"}],"name":"RedeemRequest","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":true,"internalType":"address","name":"receiver","type":"address"},{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":false,"internalType":"uint256","name":"assets","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"shares","type":"uint256"}],"name":"Withdraw","type":"event"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"asset","outputs":[{"internalType":"address","name":"assetTokenAddress","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"requestId","type":"uint256"},{"internalType":"address","name":"controller","type":"address"}],"name":"claimableDepositRequest","outputs":[{"internalType":"uint256","name":"assets","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"requestId","type":"uint256"},{"internalType":"address","name":"controller","type":"address"}],"name":"claimableRedeemRequest","outputs":[{"internalType":"uint256","name":"shares","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"shares","type":"uint256"}],"name":"convertToAssets","outputs":[{"internalType":"uint256","name":"assets","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"assets","type":"uint256"}],"name":"convertToShares","outputs":[{"internalType":"uint256","name":"shares","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"assets","type":"uint256"},{"internalType":"address","name":"receiver","type":"address"}],"name":"deposit","outputs":[{"internalType":"uint256","name":"shares","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"controller","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isOperator","outputs":[{"internalType":"bool","name":"status","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"receiver","type":"address"}],"name":"maxDeposit","outputs":[{"internalType":"uint256","name":"maxAssets","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"receiver","type":"address"}],"name":"maxMint","outputs":[{"internalType":"uint256","name":"maxShares","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"maxRedeem","outputs":[{"internalType":"uint256","name":"maxShares","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"maxWithdraw","outputs":[{"internalType":"uint256","name":"maxAssets","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"shares","type":"uint256"},{"internalType":"address","name":"receiver","type":"address"}],"name":"mint","outputs":[{"internalType":"uint256","name":"assets","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"requestId","type":"uint256"},{"internalType":"address","name":"controller","type":"address"}],"name":"pendingDepositRequest","outputs":[{"internalType":"uint256","name":"assets","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"requestId","type":"uint256"},{"internalType":"address","name":"controller","type":"address"}],"name":"pendingRedeemRequest","outputs":[{"internalType":"uint256","name":"shares","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"assets","type":"uint256"}],"name":"previewDeposit","outputs":[{"internalType":"uint256","name":"shares","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"shares","type":"uint256"}],"name":"previewMint","outputs":[{"internalType":"uint256","name":"assets","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"shares","type":"uint256"}],"name":"previewRedeem","outputs":[{"internalType":"uint256","name":"assets","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"assets","type":"uint256"}],"name":"previewWithdraw","outputs":[{"internalType":"uint256","name":"shares","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"shares","type":"uint256"},{"internalType":"address","name":"receiver","type":"address"},{"internalType":"address","name":"owner","type":"address"}],"name":"redeem","outputs":[{"internalType":"uint256","name":"assets","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"assets","type":"uint256"},{"internalType":"address","name":"controller","type":"address"},{"internalType":"address","name":"owner","type":"address"}],"name":"requestDeposit","outputs":[{"internalType":"uint256","name":"requestId","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"shares","type":"uint256"},{"internalType":"address","name":"controller","type":"address"},{"internalType":"address","name":"owner","type":"address"}],"name":"requestRedeem","outputs":[{"internalType":"uint256","name":"requestId","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setOperator","outputs":[{"internalType":"bool","name":"success","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalAssets","outputs":[{"internalType":"uint256","name":"totalManagedAssets","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"assets","type":"uint256"},{"internalType":"address","name":"receiver","type":"address"},{"internalType":"address","name":"owner","type":"address"}],"name":"withdraw","outputs":[{"internalType":"uint256","name":"shares","type":"uint256"}],"stateMutability":"nonpayable","type":"function"}];
  readonly bytecode: "0x";
  readonly deployedBytecode: "0x";
  readonly linkReferences: {};
  readonly deployedLinkReferences: {};
  readonly immutableReferences: {};
  readonly inputSourceName: "project/contracts/TokenVault.sol";
  readonly buildInfoId: "solc-0_8_28-0603b955d056901204601c139176ba9bc501e814";
};

export interface TokenVault$Type {
  readonly _format: "hh3-artifact-1";
  readonly contractName: "TokenVault";
  readonly sourceName: "contracts/TokenVault.sol";
  readonly abi: [{"inputs":[{"internalType":"contract IERC20","name":"asset_","type":"address"},{"internalType":"string","name":"name_","type":"string"},{"internalType":"string","name":"symbol_","type":"string"},{"internalType":"address","name":"defaultAdmin","type":"address"},{"internalType":"address","name":"priceSetter","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"AccessControlBadConfirmation","type":"error"},{"inputs":[{"internalType":"address","name":"account","type":"address"},{"internalType":"bytes32","name":"neededRole","type":"bytes32"}],"name":"AccessControlUnauthorizedAccount","type":"error"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"allowance","type":"uint256"},{"internalType":"uint256","name":"needed","type":"uint256"}],"name":"ERC20InsufficientAllowance","type":"error"},{"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"uint256","name":"balance","type":"uint256"},{"internalType":"uint256","name":"needed","type":"uint256"}],"name":"ERC20InsufficientBalance","type":"error"},{"inputs":[{"internalType":"address","name":"approver","type":"address"}],"name":"ERC20InvalidApprover","type":"error"},{"inputs":[{"internalType":"address","name":"receiver","type":"address"}],"name":"ERC20InvalidReceiver","type":"error"},{"inputs":[{"internalType":"address","name":"sender","type":"address"}],"name":"ERC20InvalidSender","type":"error"},{"inputs":[{"internalType":"address","name":"spender","type":"address"}],"name":"ERC20InvalidSpender","type":"error"},{"inputs":[{"internalType":"address","name":"receiver","type":"address"},{"internalType":"uint256","name":"assets","type":"uint256"},{"internalType":"uint256","name":"max","type":"uint256"}],"name":"ERC4626ExceededMaxDeposit","type":"error"},{"inputs":[{"internalType":"address","name":"receiver","type":"address"},{"internalType":"uint256","name":"shares","type":"uint256"},{"internalType":"uint256","name":"max","type":"uint256"}],"name":"ERC4626ExceededMaxMint","type":"error"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"shares","type":"uint256"},{"internalType":"uint256","name":"max","type":"uint256"}],"name":"ERC4626ExceededMaxRedeem","type":"error"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"assets","type":"uint256"},{"internalType":"uint256","name":"max","type":"uint256"}],"name":"ERC4626ExceededMaxWithdraw","type":"error"},{"inputs":[],"name":"EnforcedPause","type":"error"},{"inputs":[],"name":"ExpectedPause","type":"error"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"SafeERC20FailedOperation","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"}],"name":"AccountFrozen","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"}],"name":"AccountUnfrozen","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":false,"internalType":"uint256","name":"assets","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"shares","type":"uint256"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"controller","type":"address"}],"name":"DepositCancelled","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"controller","type":"address"},{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"uint256","name":"requestId","type":"uint256"},{"indexed":false,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"assets","type":"uint256"}],"name":"DepositRequest","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"controller","type":"address"},{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":false,"internalType":"bool","name":"approved","type":"bool"}],"name":"OperatorSet","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Paused","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"controller","type":"address"}],"name":"RedeemCancelled","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"controller","type":"address"},{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"uint256","name":"requestId","type":"uint256"},{"indexed":false,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"shares","type":"uint256"}],"name":"RedeemRequest","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"role","type":"bytes32"},{"indexed":true,"internalType":"bytes32","name":"previousAdminRole","type":"bytes32"},{"indexed":true,"internalType":"bytes32","name":"newAdminRole","type":"bytes32"}],"name":"RoleAdminChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"role","type":"bytes32"},{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":true,"internalType":"address","name":"sender","type":"address"}],"name":"RoleGranted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"role","type":"bytes32"},{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":true,"internalType":"address","name":"sender","type":"address"}],"name":"RoleRevoked","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Unpaused","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":true,"internalType":"address","name":"receiver","type":"address"},{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":false,"internalType":"uint256","name":"assets","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"shares","type":"uint256"}],"name":"Withdraw","type":"event"},{"inputs":[],"name":"DEFAULT_ADMIN_ROLE","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"PRICE_SETTER_ROLE","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"asset","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"controller","type":"address"}],"name":"cancelDeposit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"controller","type":"address"}],"name":"cancelRedeem","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"components":[{"internalType":"uint256","name":"index","type":"uint256"},{"internalType":"uint256","name":"timestamp","type":"uint256"},{"internalType":"bytes32","name":"txHash","type":"bytes32"},{"internalType":"uint256","name":"blockNumber","type":"uint256"},{"internalType":"bytes32","name":"blockHash","type":"bytes32"},{"internalType":"address","name":"source","type":"address"},{"internalType":"bytes32[]","name":"topics","type":"bytes32[]"},{"internalType":"bytes","name":"data","type":"bytes"}],"internalType":"struct Log","name":"log","type":"tuple"},{"internalType":"bytes","name":"","type":"bytes"}],"name":"checkLog","outputs":[{"internalType":"bool","name":"upkeepNeeded","type":"bool"},{"internalType":"bytes","name":"performData","type":"bytes"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"address","name":"controller","type":"address"}],"name":"claimableDepositRequest","outputs":[{"internalType":"uint256","name":"assets","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"address","name":"controller","type":"address"}],"name":"claimableRedeemRequest","outputs":[{"internalType":"uint256","name":"shares","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"shares","type":"uint256"}],"name":"convertToAssets","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"assets","type":"uint256"}],"name":"convertToShares","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"assets","type":"uint256"},{"internalType":"address","name":"receiver","type":"address"},{"internalType":"address","name":"controller","type":"address"}],"name":"deposit","outputs":[{"internalType":"uint256","name":"shares","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"assets","type":"uint256"},{"internalType":"address","name":"receiver","type":"address"}],"name":"deposit","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"fee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"freezeAccount","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"frozenAccounts","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"value","type":"uint256"}],"name":"getPercentage","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"}],"name":"getRoleAdmin","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"automationRegistry","type":"address"}],"name":"grantAutomationRole","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"grantRole","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"hasRole","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"controller","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isOperator","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"controller","type":"address"}],"name":"makeDepositClaimable","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"controller","type":"address"}],"name":"makeRedeemClaimable","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"maxDeposit","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"maxMint","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"maxRedeem","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"maxWithdraw","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"shares","type":"uint256"},{"internalType":"address","name":"receiver","type":"address"}],"name":"mint","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"shares","type":"uint256"},{"internalType":"address","name":"receiver","type":"address"},{"internalType":"address","name":"controller","type":"address"}],"name":"mint","outputs":[{"internalType":"uint256","name":"assets","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pause","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"paused","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"address","name":"controller","type":"address"}],"name":"pendingDepositRequest","outputs":[{"internalType":"uint256","name":"assets","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"address","name":"controller","type":"address"}],"name":"pendingRedeemRequest","outputs":[{"internalType":"uint256","name":"shares","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes","name":"performData","type":"bytes"}],"name":"performUpkeep","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"assets","type":"uint256"}],"name":"previewDeposit","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"shares","type":"uint256"}],"name":"previewMint","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"shares","type":"uint256"}],"name":"previewRedeem","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"assets","type":"uint256"}],"name":"previewWithdraw","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"shares","type":"uint256"},{"internalType":"address","name":"receiver","type":"address"},{"internalType":"address","name":"controller","type":"address"}],"name":"redeem","outputs":[{"internalType":"uint256","name":"assets","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"callerConfirmation","type":"address"}],"name":"renounceRole","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"assets","type":"uint256"},{"internalType":"address","name":"controller","type":"address"},{"internalType":"address","name":"owner","type":"address"}],"name":"requestDeposit","outputs":[{"internalType":"uint256","name":"requestId","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"shares","type":"uint256"},{"internalType":"address","name":"controller","type":"address"},{"internalType":"address","name":"owner","type":"address"}],"name":"requestRedeem","outputs":[{"internalType":"uint256","name":"requestId","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"revokeRole","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_fee","type":"uint256"}],"name":"setFee","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setOperator","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"newPrice","type":"uint256"}],"name":"setPrice","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalAssets","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"unfreezeAccount","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"unpause","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"assets","type":"uint256"},{"internalType":"address","name":"receiver","type":"address"},{"internalType":"address","name":"controller","type":"address"}],"name":"withdraw","outputs":[{"internalType":"uint256","name":"shares","type":"uint256"}],"stateMutability":"nonpayable","type":"function"}];
  readonly bytecode: "0x60c0604052670de0b6b3a76400006007556001600b55348015610020575f5ffd5b50604051616d49380380616d4983398181016040528101906100429190610568565b84848481600390816100549190610827565b5080600490816100649190610827565b5050505f5f6100788361011c60201b60201c565b915091508161008857601261008a565b805b60ff1660a08160ff16815250508273ffffffffffffffffffffffffffffffffffffffff1660808173ffffffffffffffffffffffffffffffffffffffff16815250505050506100e05f5f1b8361022560201b60201c565b506101117f04824fcb60e7cc526d70b264caa65b62ed44d9c8e5d230e8ff6b0c7373843b8a8261022560201b60201c565b5050505050506109a5565b5f5f5f5f8473ffffffffffffffffffffffffffffffffffffffff1660405160240160405160208183030381529060405263313ce56760e01b6020820180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff838183161783525050505060405161018f919061093a565b5f60405180830381855afa9150503d805f81146101c7576040519150601f19603f3d011682016040523d82523d5f602084013e6101cc565b606091505b50915091508180156101e057506020815110155b15610217575f818060200190518101906101fa919061097a565b905060ff801681116102155760018194509450505050610220565b505b5f5f9350935050505b915091565b5f610236838361031b60201b60201c565b61031157600160055f8581526020019081526020015f205f015f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f6101000a81548160ff0219169083151502179055506102ae61037f60201b60201c565b73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16847f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d60405160405180910390a460019050610315565b5f90505b92915050565b5f60055f8481526020019081526020015f205f015f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f9054906101000a900460ff16905092915050565b5f33905090565b5f604051905090565b5f5ffd5b5f5ffd5b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f6103c082610397565b9050919050565b5f6103d1826103b6565b9050919050565b6103e1816103c7565b81146103eb575f5ffd5b50565b5f815190506103fc816103d8565b92915050565b5f5ffd5b5f5ffd5b5f601f19601f8301169050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b6104508261040a565b810181811067ffffffffffffffff8211171561046f5761046e61041a565b5b80604052505050565b5f610481610386565b905061048d8282610447565b919050565b5f67ffffffffffffffff8211156104ac576104ab61041a565b5b6104b58261040a565b9050602081019050919050565b8281835e5f83830152505050565b5f6104e26104dd84610492565b610478565b9050828152602081018484840111156104fe576104fd610406565b5b6105098482856104c2565b509392505050565b5f82601f83011261052557610524610402565b5b81516105358482602086016104d0565b91505092915050565b610547816103b6565b8114610551575f5ffd5b50565b5f815190506105628161053e565b92915050565b5f5f5f5f5f60a086880312156105815761058061038f565b5b5f61058e888289016103ee565b955050602086015167ffffffffffffffff8111156105af576105ae610393565b5b6105bb88828901610511565b945050604086015167ffffffffffffffff8111156105dc576105db610393565b5b6105e888828901610511565b93505060606105f988828901610554565b925050608061060a88828901610554565b9150509295509295909350565b5f81519050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b5f600282049050600182168061066557607f821691505b60208210810361067857610677610621565b5b50919050565b5f819050815f5260205f209050919050565b5f6020601f8301049050919050565b5f82821b905092915050565b5f600883026106da7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8261069f565b6106e4868361069f565b95508019841693508086168417925050509392505050565b5f819050919050565b5f819050919050565b5f61072861072361071e846106fc565b610705565b6106fc565b9050919050565b5f819050919050565b6107418361070e565b61075561074d8261072f565b8484546106ab565b825550505050565b5f5f905090565b61076c61075d565b610777818484610738565b505050565b5b8181101561079a5761078f5f82610764565b60018101905061077d565b5050565b601f8211156107df576107b08161067e565b6107b984610690565b810160208510156107c8578190505b6107dc6107d485610690565b83018261077c565b50505b505050565b5f82821c905092915050565b5f6107ff5f19846008026107e4565b1980831691505092915050565b5f61081783836107f0565b9150826002028217905092915050565b61083082610617565b67ffffffffffffffff8111156108495761084861041a565b5b610853825461064e565b61085e82828561079e565b5f60209050601f83116001811461088f575f841561087d578287015190505b610887858261080c565b8655506108ee565b601f19841661089d8661067e565b5f5b828110156108c45784890151825560018201915060208501945060208101905061089f565b868310156108e157848901516108dd601f8916826107f0565b8355505b6001600288020188555050505b505050505050565b5f81519050919050565b5f81905092915050565b5f610914826108f6565b61091e8185610900565b935061092e8185602086016104c2565b80840191505092915050565b5f610945828461090a565b915081905092915050565b610959816106fc565b8114610963575f5ffd5b50565b5f8151905061097481610950565b92915050565b5f6020828403121561098f5761098e61038f565b5b5f61099c84828501610966565b91505092915050565b60805160a0516163836109c65f395f6114fa01525f61179601526163835ff3fe608060405234801561000f575f5ffd5b50600436106103ad575f3560e01c8063788649ea116101f2578063b6363cf211610118578063dd62ed3e116100ab578063ef8b30f71161007a578063ef8b30f714610c72578063f00acbaa14610ca2578063f26c159f14610cc0578063f5a23d8d14610cdc576103ad565b8063dd62ed3e14610bc4578063ddca3f4314610bf4578063e161c3bf14610c12578063eaed1d0714610c42576103ad565b8063ce96cb77116100e7578063ce96cb7714610b18578063d547741f14610b48578063d905777e14610b64578063da39b3e714610b94576103ad565b8063b6363cf214610a58578063ba08765214610a88578063c63d75b614610ab8578063c6e6f59214610ae8576103ad565b806394bf804d11610190578063a217fddf1161015f578063a217fddf146109aa578063a9059cbb146109c8578063b3d7f6b9146109f8578063b460af9414610a28576103ad565b806394bf804d1461090e57806395d89b411461093e57806398d5fdca1461095c578063995ea21a1461097a576103ad565b806385b77f45116101cc57806385b77f4514610862578063860838a51461089257806391b7f5ed146108c257806391d14854146108de576103ad565b8063788649ea1461080c5780637d41c86e146108285780638456cb5914610858576103ad565b806338401c43116102d7578063558a7297116102755780636db79869116102445780636db79869146107745780636e553f651461079057806370a08231146107c057806376b4eb32146107f0576103ad565b8063558a7297146106ee5780635c975abb1461071e57806369fe0e2d1461073c5780636d14c2f614610758576103ad565b8063402d267d116102b1578063402d267d1461064157806340691db4146106715780634585e33b146106a25780634cdad506146106be576103ad565b806338401c43146105fd57806338d52e0f146106195780633f4ba83a14610637576103ad565b806318160ddd1161034f5780632e2d29841161031e5780632e2d2984146105775780632f2ff15d146105a7578063313ce567146105c357806336568abe146105e1576103ad565b806318160ddd146104c957806323b872dd146104e7578063248a9ca31461051757806326c6f96c14610547576103ad565b806307a2d13a1161038b57806307a2d13a1461041d578063095ea7b31461044d5780630a28a4771461047d5780630de93209146104ad576103ad565b806301e1d114146103b157806301ffc9a7146103cf57806306fdde03146103ff575b5f5ffd5b6103b9610d0c565b6040516103c69190614aec565b60405180910390f35b6103e960048036038101906103e49190614b6b565b610d91565b6040516103f69190614bb0565b60405180910390f35b610407610f46565b6040516104149190614c39565b60405180910390f35b61043760048036038101906104329190614c83565b610fd6565b6040516104449190614aec565b60405180910390f35b61046760048036038101906104629190614d08565b610fe8565b6040516104749190614bb0565b60405180910390f35b61049760048036038101906104929190614c83565b61100a565b6040516104a49190614aec565b60405180910390f35b6104c760048036038101906104c29190614d46565b611046565b005b6104d1611063565b6040516104de9190614aec565b60405180910390f35b61050160048036038101906104fc9190614d71565b61106c565b60405161050e9190614bb0565b60405180910390f35b610531600480360381019061052c9190614df4565b611195565b60405161053e9190614e2e565b60405180910390f35b610561600480360381019061055c9190614e47565b6111b2565b60405161056e9190614aec565b60405180910390f35b610591600480360381019061058c9190614e85565b611333565b60405161059e9190614aec565b60405180910390f35b6105c160048036038101906105bc9190614ed5565b6114cd565b005b6105cb6114ef565b6040516105d89190614f2e565b60405180910390f35b6105fb60048036038101906105f69190614ed5565b611528565b005b61061760048036038101906106129190614d46565b6115a3565b005b610621611793565b60405161062e9190614f56565b60405180910390f35b61063f6117ba565b005b61065b60048036038101906106569190614d46565b6117d1565b6040516106689190614aec565b60405180910390f35b61068b600480360381019061068691906150be565b6117fa565b604051610699929190615186565b60405180910390f35b6106bc60048036038101906106b79190615211565b61182a565b005b6106d860048036038101906106d39190614c83565b6118eb565b6040516106e59190614aec565b60405180910390f35b61070860048036038101906107039190615286565b611927565b6040516107159190614bb0565b60405180910390f35b610726611a26565b6040516107339190614bb0565b60405180910390f35b61075660048036038101906107519190614c83565b611a3b565b005b610772600480360381019061076d9190614d46565b611a97565b005b61078e60048036038101906107899190614d46565b611cae565b005b6107aa60048036038101906107a59190614e47565b611da2565b6040516107b79190614aec565b60405180910390f35b6107da60048036038101906107d59190614d46565b611e22565b6040516107e79190614aec565b60405180910390f35b61080a60048036038101906108059190614d46565b611e67565b005b61082660048036038101906108219190614d46565b611f5b565b005b610842600480360381019061083d9190614e85565b612002565b60405161084f9190614aec565b60405180910390f35b610860612417565b005b61087c60048036038101906108779190614e85565b61242e565b6040516108899190614aec565b60405180910390f35b6108ac60048036038101906108a79190614d46565b6128e2565b6040516108b99190614bb0565b60405180910390f35b6108dc60048036038101906108d79190614c83565b6128ff565b005b6108f860048036038101906108f39190614ed5565b612976565b6040516109059190614bb0565b60405180910390f35b61092860048036038101906109239190614e47565b6129da565b6040516109359190614aec565b60405180910390f35b610946612a5a565b6040516109539190614c39565b60405180910390f35b610964612aea565b6040516109719190614aec565b60405180910390f35b610994600480360381019061098f9190614e47565b612af3565b6040516109a19190614aec565b60405180910390f35b6109b2612c74565b6040516109bf9190614e2e565b60405180910390f35b6109e260048036038101906109dd9190614d08565b612c7a565b6040516109ef9190614bb0565b60405180910390f35b610a126004803603810190610a0d9190614c83565b612da1565b604051610a1f9190614aec565b60405180910390f35b610a426004803603810190610a3d9190614e85565b612ddd565b604051610a4f9190614aec565b60405180910390f35b610a726004803603810190610a6d91906152c4565b61304f565b604051610a7f9190614bb0565b60405180910390f35b610aa26004803603810190610a9d9190614e85565b6130dd565b604051610aaf9190614aec565b60405180910390f35b610ad26004803603810190610acd9190614d46565b61334e565b604051610adf9190614aec565b60405180910390f35b610b026004803603810190610afd9190614c83565b613377565b604051610b0f9190614aec565b60405180910390f35b610b326004803603810190610b2d9190614d46565b613389565b604051610b3f9190614aec565b60405180910390f35b610b626004803603810190610b5d9190614ed5565b6133a3565b005b610b7e6004803603810190610b799190614d46565b6133c5565b604051610b8b9190614aec565b60405180910390f35b610bae6004803603810190610ba99190614e85565b6133d6565b604051610bbb9190614aec565b60405180910390f35b610bde6004803603810190610bd991906152c4565b613604565b604051610beb9190614aec565b60405180910390f35b610bfc613686565b604051610c099190614aec565b60405180910390f35b610c2c6004803603810190610c279190614c83565b61368c565b604051610c399190614aec565b60405180910390f35b610c5c6004803603810190610c579190614e47565b6136af565b604051610c699190614aec565b60405180910390f35b610c8c6004803603810190610c879190614c83565b613830565b604051610c999190614aec565b60405180910390f35b610caa61386c565b604051610cb79190614e2e565b60405180910390f35b610cda6004803603810190610cd59190614d46565b613890565b005b610cf66004803603810190610cf19190614e47565b613938565b604051610d039190614aec565b60405180910390f35b5f610d15611793565b73ffffffffffffffffffffffffffffffffffffffff166370a08231306040518263ffffffff1660e01b8152600401610d4d9190614f56565b602060405180830381865afa158015610d68573d5f5f3e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610d8c9190615316565b905090565b5f7fbb9d82b2000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff19161480610e42575063e3bc4e6560e01b7bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916145b80610e915750632f0a18c560e01b7bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916145b80610ee0575063ce3bbe5060e01b7bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916145b80610f2f575063620ee8e460e01b7bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916145b80610f3f5750610f3e82613ab9565b5b9050919050565b606060038054610f559061536e565b80601f0160208091040260200160405190810160405280929190818152602001828054610f819061536e565b8015610fcc5780601f10610fa357610100808354040283529160200191610fcc565b820191905f5260205f20905b815481529060010190602001808311610faf57829003601f168201915b5050505050905090565b5f610fe1825f613b32565b9050919050565b5f5f610ff2613bbb565b9050610fff818585613bc2565b600191505092915050565b5f6040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161103d9061540e565b60405180910390fd5b5f5f1b61105281613bd4565b61105e5f5f1b83613be8565b505050565b5f600254905090565b5f600c5f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f9054906101000a900460ff16156110f7576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016110ee90615476565b60405180910390fd5b600c5f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f9054906101000a900460ff1615611181576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401611178906154de565b60405180910390fd5b61118c848484613cd2565b90509392505050565b5f60055f8381526020019081526020015f20600101549050919050565b5f5f60085f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f206040518060800160405290815f82015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001600182015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200160028201548152602001600382015f9054906101000a900460ff1660048111156112d3576112d26154fc565b5b60048111156112e5576112e46154fc565b5b815250509050600160048111156112ff576112fe6154fc565b5b81606001516004811115611316576113156154fc565b5b0361132857806040015191505061132d565b5f9150505b92915050565b5f5f5f1b61134081613bd4565b5f60085f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20905060016004811115611394576113936154fc565b5b816003015f9054906101000a900460ff1660048111156113b7576113b66154fc565b5b146113f7576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016113ee90615573565b60405180910390fd5b5f611405826002015461368c565b826002015461141491906155be565b9050611420815f613d00565b935061142c8685613d89565b6003826003015f6101000a81548160ff02191690836004811115611453576114526154fc565b5b02179055508573ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167fdcbc1c05240f31ff3ad067ef1ee35ce4997762752e3a095284754544f4c709d78460020154876040516114bb9291906155f1565b60405180910390a35050509392505050565b6114d682611195565b6114df81613bd4565b6114e98383613be8565b50505050565b5f6114f8613e08565b7f00000000000000000000000000000000000000000000000000000000000000006115239190615618565b905090565b611530613bbb565b73ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614611594576040517f6697b23200000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b61159e8282613e0f565b505050565b5f60095f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f209050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614806116455750611644823361304f565b5b611684576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161167b90615696565b60405180910390fd5b60016004811115611698576116976154fc565b5b816003015f9054906101000a900460ff1660048111156116bb576116ba6154fc565b5b146116fb576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016116f2906156fe565b60405180910390fd5b61172c30825f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff168360020154613ef9565b6004816003015f6101000a81548160ff02191690836004811115611753576117526154fc565b5b02179055507fa34b209824d24e31467e4012a81027b4937d3285d7ea71229352f1520fc61b79826040516117879190614f56565b60405180910390a15050565b5f7f0000000000000000000000000000000000000000000000000000000000000000905090565b5f5f1b6117c681613bd4565b6117ce613fe9565b50565b5f7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff9050919050565b5f606060019150836040516020016118129190615a07565b60405160208183030381529060405290509250929050565b5f828281019061183a9190615bee565b90505f5f5f5f5f8560e001518060200190518101906118599190615c70565b945094509450945094503073ffffffffffffffffffffffffffffffffffffffff16632e2d29848287886040518463ffffffff1660e01b81526004016118a093929190615ce7565b6020604051808303815f875af11580156118bc573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906118e09190615316565b505050505050505050565b5f6040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161191e9061540e565b60405180910390fd5b5f81600a5f3373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f6101000a81548160ff0219169083151502179055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167fceb576d9f15e4e200fdb5096d64d5dfd667e16def20c1eefd14256d8e3faa26784604051611a149190614bb0565b60405180910390a36001905092915050565b5f60065f9054906101000a900460ff16905090565b5f5f1b611a4781613bd4565b6103e8821115611a8c576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401611a8390615d66565b60405180910390fd5b81600b819055505050565b5f60085f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f209050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161480611b395750611b38823361304f565b5b611b78576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401611b6f90615696565b60405180910390fd5b60016004811115611b8c57611b8b6154fc565b5b816003015f9054906101000a900460ff166004811115611baf57611bae6154fc565b5b14611bef576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401611be690615573565b60405180910390fd5b611c47815f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff168260020154611c22611793565b73ffffffffffffffffffffffffffffffffffffffff1661404a9092919063ffffffff16565b6004816003015f6101000a81548160ff02191690836004811115611c6e57611c6d6154fc565b5b02179055507f315b8a0ece450231870bda1ecceeabdc74b6d0e53d6eb663bb910e3a6f42d6f182604051611ca29190614f56565b60405180910390a15050565b5f5f1b611cba81613bd4565b5f60085f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20905060016004811115611d0e57611d0d6154fc565b5b816003015f9054906101000a900460ff166004811115611d3157611d306154fc565b5b14611d71576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401611d6890615dce565b60405180910390fd5b6002816003015f6101000a81548160ff02191690836004811115611d9857611d976154fc565b5b0217905550505050565b5f5f611dad836117d1565b905080841115611df8578284826040517f79012fb2000000000000000000000000000000000000000000000000000000008152600401611def93929190615dec565b60405180910390fd5b5f611e0285613830565b9050611e17611e0f613bbb565b8587846140c9565b809250505092915050565b5f5f5f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20549050919050565b5f5f1b611e7381613bd4565b5f60095f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20905060016004811115611ec757611ec66154fc565b5b816003015f9054906101000a900460ff166004811115611eea57611ee96154fc565b5b14611f2a576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401611f2190615dce565b60405180910390fd5b6002816003015f6101000a81548160ff02191690836004811115611f5157611f506154fc565b5b0217905550505050565b5f5f1b611f6781613bd4565b5f600c5f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f6101000a81548160ff0219169083151502179055508173ffffffffffffffffffffffffffffffffffffffff167ff915cd9fe234de6e8d3afe7bf2388d35b2b6d48e8c629a24602019bde79c213a60405160405180910390a25050565b5f61200b614153565b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1603612042573391505b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff1603612079578192505b8173ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614806120b957506120b8833361304f565b5b6120f8576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016120ef90615696565b60405180910390fd5b5f841161213a576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161213190615e6b565b60405180910390fd5b8361214483611e22565b1015612185576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161217c90615ed3565b60405180910390fd5b612190823086613ef9565b5f90505f60048111156121a6576121a56154fc565b5b60095f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f206003015f9054906101000a900460ff166004811115612205576122046154fc565b5b14612245576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161223c90615f3b565b60405180910390fd5b60405180608001604052808373ffffffffffffffffffffffffffffffffffffffff1681526020018473ffffffffffffffffffffffffffffffffffffffff168152602001858152602001600160048111156122a2576122a16154fc565b5b81525060095f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f820151815f015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055506020820151816001015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550604082015181600201556060820151816003015f6101000a81548160ff021916908360048111156123a05761239f6154fc565b5b0217905550905050808273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167f1fdc681a13d8c5da54e301c7ce6542dcde4581e4725043fdab2db12ddc5745063388604051612408929190615f59565b60405180910390a49392505050565b5f5f1b61242381613bd4565b61242b614194565b50565b5f612437614153565b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff160361246e573391505b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff16036124a5578192505b8173ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614806124e557506124e4833361304f565b5b612524576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161251b90615696565b60405180910390fd5b5f8411612566576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161255d90615fca565b60405180910390fd5b8361256f611793565b73ffffffffffffffffffffffffffffffffffffffff166370a08231336040518263ffffffff1660e01b81526004016125a79190614f56565b602060405180830381865afa1580156125c2573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906125e69190615316565b1015612627576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161261e90616032565b60405180910390fd5b61265b333086612635611793565b73ffffffffffffffffffffffffffffffffffffffff166141f6909392919063ffffffff16565b5f90505f6004811115612671576126706154fc565b5b60085f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f206003015f9054906101000a900460ff1660048111156126d0576126cf6154fc565b5b14612710576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016127079061609a565b60405180910390fd5b60405180608001604052808373ffffffffffffffffffffffffffffffffffffffff1681526020018473ffffffffffffffffffffffffffffffffffffffff1681526020018581526020016001600481111561276d5761276c6154fc565b5b81525060085f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f820151815f015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055506020820151816001015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550604082015181600201556060820151816003015f6101000a81548160ff0219169083600481111561286b5761286a6154fc565b5b0217905550905050808273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167fbb58420bb8ce44e11b84e214cc0de10ce5e7c24d0355b2815c3d758b514cae7233886040516128d3929190615f59565b60405180910390a49392505050565b600c602052805f5260405f205f915054906101000a900460ff1681565b7f04824fcb60e7cc526d70b264caa65b62ed44d9c8e5d230e8ff6b0c7373843b8a61292981613bd4565b5f821161296b576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161296290616102565b60405180910390fd5b816007819055505050565b5f60055f8481526020019081526020015f205f015f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f9054906101000a900460ff16905092915050565b5f5f6129e58361334e565b905080841115612a30578284826040517f284ff667000000000000000000000000000000000000000000000000000000008152600401612a2793929190615dec565b60405180910390fd5b5f612a3a85612da1565b9050612a4f612a47613bbb565b8583886140c9565b809250505092915050565b606060048054612a699061536e565b80601f0160208091040260200160405190810160405280929190818152602001828054612a959061536e565b8015612ae05780601f10612ab757610100808354040283529160200191612ae0565b820191905f5260205f20905b815481529060010190602001808311612ac357829003601f168201915b5050505050905090565b5f600754905090565b5f5f60085f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f206040518060800160405290815f82015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001600182015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200160028201548152602001600382015f9054906101000a900460ff166004811115612c1457612c136154fc565b5b6004811115612c2657612c256154fc565b5b81525050905060026004811115612c4057612c3f6154fc565b5b81606001516004811115612c5757612c566154fc565b5b03612c69578060400151915050612c6e565b5f9150505b92915050565b5f5f1b81565b5f600c5f3373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f9054906101000a900460ff1615612d05576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401612cfc90615476565b60405180910390fd5b600c5f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f9054906101000a900460ff1615612d8f576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401612d86906154de565b60405180910390fd5b612d998383614278565b905092915050565b5f6040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401612dd49061540e565b60405180910390fd5b5f5f5f1b612dea81613bd4565b5f60095f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20905060016004811115612e3e57612e3d6154fc565b5b816003015f9054906101000a900460ff166004811115612e6157612e606154fc565b5b14612ea1576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401612e98906156fe565b60405180910390fd5b612eac866001613d00565b92508060020154831115612ef5576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401612eec9061616a565b60405180910390fd5b612f278587612f02611793565b73ffffffffffffffffffffffffffffffffffffffff1661404a9092919063ffffffff16565b612f31308461429a565b8281600201541115612f7a57612f7930825f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff16858460020154612f7491906155be565b613ef9565b5b6003816003015f6101000a81548160ff02191690836004811115612fa157612fa06154fc565b5b0217905550805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168573ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167ffbde797d201c681b91056529119e0b02407c7bb96a4a2c75c01fc9667232c8db898760405161303e9291906155f1565b60405180910390a450509392505050565b5f600a5f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f9054906101000a900460ff16905092915050565b5f5f5f1b6130ea81613bd4565b5f60095f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2090506001600481111561313e5761313d6154fc565b5b816003015f9054906101000a900460ff166004811115613161576131606154fc565b5b146131a1576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401613198906156fe565b60405180910390fd5b80600201548611156131e8576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016131df9061616a565b60405180910390fd5b6131f2865f613b32565b92506132268584613201611793565b73ffffffffffffffffffffffffffffffffffffffff1661404a9092919063ffffffff16565b613230308761429a565b85816002015411156132795761327830825f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1688846002015461327391906155be565b613ef9565b5b6003816003015f6101000a81548160ff021916908360048111156132a05761329f6154fc565b5b0217905550805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168573ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167ffbde797d201c681b91056529119e0b02407c7bb96a4a2c75c01fc9667232c8db868a60405161333d9291906155f1565b60405180910390a450509392505050565b5f7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff9050919050565b5f613382825f613d00565b9050919050565b5f61339c61339683611e22565b5f613b32565b9050919050565b6133ac82611195565b6133b581613bd4565b6133bf8383613e0f565b50505050565b5f6133cf82611e22565b9050919050565b5f5f5f1b6133e381613bd4565b5f60085f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20905060016004811115613437576134366154fc565b5b816003015f9054906101000a900460ff16600481111561345a576134596154fc565b5b1461349a576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161349190615573565b60405180910390fd5b6134a5866001613b32565b925080600201548311156134ee576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016134e5906161d2565b60405180910390fd5b6134f88587613d89565b828160020154111561356857613567815f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1684836002015461353a91906155be565b613542611793565b73ffffffffffffffffffffffffffffffffffffffff1661404a9092919063ffffffff16565b5b6003816003015f6101000a81548160ff0219169083600481111561358f5761358e6154fc565b5b02179055508473ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167fdcbc1c05240f31ff3ad067ef1ee35ce4997762752e3a095284754544f4c709d785896040516135f39291906155f1565b60405180910390a350509392505050565b5f60015f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2054905092915050565b600b5481565b5f6103e8600b548361369e91906161f0565b6136a8919061625e565b9050919050565b5f5f60095f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f206040518060800160405290815f82015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001600182015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200160028201548152602001600382015f9054906101000a900460ff1660048111156137d0576137cf6154fc565b5b60048111156137e2576137e16154fc565b5b815250509050600260048111156137fc576137fb6154fc565b5b81606001516004811115613813576138126154fc565b5b0361382557806040015191505061382a565b5f9150505b92915050565b5f6040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016138639061540e565b60405180910390fd5b7f04824fcb60e7cc526d70b264caa65b62ed44d9c8e5d230e8ff6b0c7373843b8a81565b5f5f1b61389c81613bd4565b6001600c5f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f6101000a81548160ff0219169083151502179055508173ffffffffffffffffffffffffffffffffffffffff167f4f2a367e694e71282f29ab5eaa04c4c0be45ac5bf2ca74fb67068b98bdc2887d60405160405180910390a25050565b5f5f60095f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f206040518060800160405290815f82015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001600182015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200160028201548152602001600382015f9054906101000a900460ff166004811115613a5957613a586154fc565b5b6004811115613a6b57613a6a6154fc565b5b81525050905060016004811115613a8557613a846154fc565b5b81606001516004811115613a9c57613a9b6154fc565b5b03613aae578060400151915050613ab3565b5f9150505b92915050565b5f7f7965db0b000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff19161480613b2b5750613b2a82614319565b5b9050919050565b5f5f6003811115613b4657613b456154fc565b5b826003811115613b5957613b586154fc565b5b03613b8b57613b846007546c0c9f2c9cd04674edea400000005f86614382909392919063ffffffff16565b9050613bb5565b613bb26007546c0c9f2c9cd04674edea40000000600186614382909392919063ffffffff16565b90505b92915050565b5f33905090565b613bcf83838360016143cf565b505050565b613be581613be0613bbb565b61459e565b50565b5f613bf38383612976565b613cc857600160055f8581526020019081526020015f205f015f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f6101000a81548160ff021916908315150217905550613c65613bbb565b73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16847f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d60405160405180910390a460019050613ccc565b5f90505b92915050565b5f5f613cdc613bbb565b9050613ce98582856145ef565b613cf4858585613ef9565b60019150509392505050565b5f5f6003811115613d1457613d136154fc565b5b826003811115613d2757613d266154fc565b5b03613d5957613d526c0c9f2c9cd04674edea400000006007545f86614382909392919063ffffffff16565b9050613d83565b613d806c0c9f2c9cd04674edea40000000600754600186614382909392919063ffffffff16565b90505b92915050565b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1603613df9575f6040517fec442f05000000000000000000000000000000000000000000000000000000008152600401613df09190614f56565b60405180910390fd5b613e045f8383614682565b5050565b5f5f905090565b5f613e1a8383612976565b15613eef575f60055f8581526020019081526020015f205f015f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f6101000a81548160ff021916908315150217905550613e8c613bbb565b73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16847ff6391f5c32d9c69d2a47ea670b442974b53935d1edc7fd64eb21e047a839171b60405160405180910390a460019050613ef3565b5f90505b92915050565b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff1603613f69575f6040517f96c6fd1e000000000000000000000000000000000000000000000000000000008152600401613f609190614f56565b60405180910390fd5b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1603613fd9575f6040517fec442f05000000000000000000000000000000000000000000000000000000008152600401613fd09190614f56565b60405180910390fd5b613fe4838383614682565b505050565b613ff161489b565b5f60065f6101000a81548160ff0219169083151502179055507f5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa614033613bbb565b6040516140409190614f56565b60405180910390a1565b6140c4838473ffffffffffffffffffffffffffffffffffffffff1663a9059cbb858560405160240161407d929190615f59565b604051602081830303815290604052915060e01b6020820180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff83818316178352505050506148db565b505050565b6140dc6140d4611793565b8530856141f6565b6140e68382613d89565b8273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167fdcbc1c05240f31ff3ad067ef1ee35ce4997762752e3a095284754544f4c709d784846040516141459291906155f1565b60405180910390a350505050565b61415b611a26565b15614192576040517fd93c066500000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b565b61419c614153565b600160065f6101000a81548160ff0219169083151502179055507f62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a2586141df613bbb565b6040516141ec9190614f56565b60405180910390a1565b614272848573ffffffffffffffffffffffffffffffffffffffff166323b872dd86868660405160240161422b9392919061628e565b604051602081830303815290604052915060e01b6020820180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff83818316178352505050506148db565b50505050565b5f5f614282613bbb565b905061428f818585613ef9565b600191505092915050565b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff160361430a575f6040517f96c6fd1e0000000000000000000000000000000000000000000000000000000081526004016143019190614f56565b60405180910390fd5b614315825f83614682565b5050565b5f7f01ffc9a7000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916149050919050565b5f6143b061438f83614976565b80156143ab57505f84806143a6576143a5616231565b5b868809115b6149a3565b6143bb8686866149ae565b6143c591906162c3565b9050949350505050565b5f73ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff160361443f575f6040517fe602df050000000000000000000000000000000000000000000000000000000081526004016144369190614f56565b60405180910390fd5b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff16036144af575f6040517f94280d620000000000000000000000000000000000000000000000000000000081526004016144a69190614f56565b60405180910390fd5b8160015f8673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20819055508015614598578273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b9258460405161458f9190614aec565b60405180910390a35b50505050565b6145a88282612976565b6145eb5780826040517fe2517d3f0000000000000000000000000000000000000000000000000000000081526004016145e29291906162f6565b60405180910390fd5b5050565b5f6145fa8484613604565b90507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff81101561467c578181101561466d578281836040517ffb8f41b200000000000000000000000000000000000000000000000000000000815260040161466493929190615dec565b60405180910390fd5b61467b84848484035f6143cf565b5b50505050565b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff16036146d2578060025f8282546146c691906162c3565b925050819055506147a0565b5f5f5f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205490508181101561475b578381836040517fe450d38c00000000000000000000000000000000000000000000000000000000815260040161475293929190615dec565b60405180910390fd5b8181035f5f8673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2081905550505b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16036147e7578060025f8282540392505081905550614831565b805f5f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f82825401925050819055505b8173ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef8360405161488e9190614aec565b60405180910390a3505050565b6148a3611a26565b6148d9576040517f8dfc202b00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b565b5f5f60205f8451602086015f885af1806148fa576040513d5f823e3d81fd5b3d92505f519150505f821461491357600181141561492e565b5f8473ffffffffffffffffffffffffffffffffffffffff163b145b1561497057836040517f5274afe70000000000000000000000000000000000000000000000000000000081526004016149679190614f56565b60405180910390fd5b50505050565b5f6001600283600381111561498e5761498d6154fc565b5b614998919061631d565b60ff16149050919050565b5f8115159050919050565b5f5f5f6149bb8686614a8d565b915091505f82036149e0578381816149d6576149d5616231565b5b0492505050614a86565b8184116149ff576149fe6149f95f861460126011614aaa565b614ac3565b5b5f8486880990508181118303925080820391505f855f038616905080860495508083049250600181825f0304019050808402831792505f600287600302189050808702600203810290508087026002038102905080870260020381029050808702600203810290508087026002038102905080870260020381029050808402955050505050505b9392505050565b5f5f5f198385098385029150818110828203039250509250929050565b5f614ab4846149a3565b82841802821890509392505050565b634e487b715f52806020526024601cfd5b5f819050919050565b614ae681614ad4565b82525050565b5f602082019050614aff5f830184614add565b92915050565b5f604051905090565b5f5ffd5b5f5ffd5b5f7fffffffff0000000000000000000000000000000000000000000000000000000082169050919050565b614b4a81614b16565b8114614b54575f5ffd5b50565b5f81359050614b6581614b41565b92915050565b5f60208284031215614b8057614b7f614b0e565b5b5f614b8d84828501614b57565b91505092915050565b5f8115159050919050565b614baa81614b96565b82525050565b5f602082019050614bc35f830184614ba1565b92915050565b5f81519050919050565b5f82825260208201905092915050565b8281835e5f83830152505050565b5f601f19601f8301169050919050565b5f614c0b82614bc9565b614c158185614bd3565b9350614c25818560208601614be3565b614c2e81614bf1565b840191505092915050565b5f6020820190508181035f830152614c518184614c01565b905092915050565b614c6281614ad4565b8114614c6c575f5ffd5b50565b5f81359050614c7d81614c59565b92915050565b5f60208284031215614c9857614c97614b0e565b5b5f614ca584828501614c6f565b91505092915050565b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f614cd782614cae565b9050919050565b614ce781614ccd565b8114614cf1575f5ffd5b50565b5f81359050614d0281614cde565b92915050565b5f5f60408385031215614d1e57614d1d614b0e565b5b5f614d2b85828601614cf4565b9250506020614d3c85828601614c6f565b9150509250929050565b5f60208284031215614d5b57614d5a614b0e565b5b5f614d6884828501614cf4565b91505092915050565b5f5f5f60608486031215614d8857614d87614b0e565b5b5f614d9586828701614cf4565b9350506020614da686828701614cf4565b9250506040614db786828701614c6f565b9150509250925092565b5f819050919050565b614dd381614dc1565b8114614ddd575f5ffd5b50565b5f81359050614dee81614dca565b92915050565b5f60208284031215614e0957614e08614b0e565b5b5f614e1684828501614de0565b91505092915050565b614e2881614dc1565b82525050565b5f602082019050614e415f830184614e1f565b92915050565b5f5f60408385031215614e5d57614e5c614b0e565b5b5f614e6a85828601614c6f565b9250506020614e7b85828601614cf4565b9150509250929050565b5f5f5f60608486031215614e9c57614e9b614b0e565b5b5f614ea986828701614c6f565b9350506020614eba86828701614cf4565b9250506040614ecb86828701614cf4565b9150509250925092565b5f5f60408385031215614eeb57614eea614b0e565b5b5f614ef885828601614de0565b9250506020614f0985828601614cf4565b9150509250929050565b5f60ff82169050919050565b614f2881614f13565b82525050565b5f602082019050614f415f830184614f1f565b92915050565b614f5081614ccd565b82525050565b5f602082019050614f695f830184614f47565b92915050565b5f5ffd5b5f6101008284031215614f8957614f88614f6f565b5b81905092915050565b5f5ffd5b5f5ffd5b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b614fd082614bf1565b810181811067ffffffffffffffff82111715614fef57614fee614f9a565b5b80604052505050565b5f615001614b05565b905061500d8282614fc7565b919050565b5f67ffffffffffffffff82111561502c5761502b614f9a565b5b61503582614bf1565b9050602081019050919050565b828183375f83830152505050565b5f61506261505d84615012565b614ff8565b90508281526020810184848401111561507e5761507d614f96565b5b615089848285615042565b509392505050565b5f82601f8301126150a5576150a4614f92565b5b81356150b5848260208601615050565b91505092915050565b5f5f604083850312156150d4576150d3614b0e565b5b5f83013567ffffffffffffffff8111156150f1576150f0614b12565b5b6150fd85828601614f73565b925050602083013567ffffffffffffffff81111561511e5761511d614b12565b5b61512a85828601615091565b9150509250929050565b5f81519050919050565b5f82825260208201905092915050565b5f61515882615134565b615162818561513e565b9350615172818560208601614be3565b61517b81614bf1565b840191505092915050565b5f6040820190506151995f830185614ba1565b81810360208301526151ab818461514e565b90509392505050565b5f5ffd5b5f5ffd5b5f5f83601f8401126151d1576151d0614f92565b5b8235905067ffffffffffffffff8111156151ee576151ed6151b4565b5b60208301915083600182028301111561520a576152096151b8565b5b9250929050565b5f5f6020838503121561522757615226614b0e565b5b5f83013567ffffffffffffffff81111561524457615243614b12565b5b615250858286016151bc565b92509250509250929050565b61526581614b96565b811461526f575f5ffd5b50565b5f813590506152808161525c565b92915050565b5f5f6040838503121561529c5761529b614b0e565b5b5f6152a985828601614cf4565b92505060206152ba85828601615272565b9150509250929050565b5f5f604083850312156152da576152d9614b0e565b5b5f6152e785828601614cf4565b92505060206152f885828601614cf4565b9150509250929050565b5f8151905061531081614c59565b92915050565b5f6020828403121561532b5761532a614b0e565b5b5f61533884828501615302565b91505092915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b5f600282049050600182168061538557607f821691505b60208210810361539857615397615341565b5b50919050565b7f4173796e63207661756c743a20757365207072657669657720616674657220725f8201527f6571756573740000000000000000000000000000000000000000000000000000602082015250565b5f6153f8602683614bd3565b91506154038261539e565b604082019050919050565b5f6020820190508181035f830152615425816153ec565b9050919050565b7f53656e6465722066726f7a656e000000000000000000000000000000000000005f82015250565b5f615460600d83614bd3565b915061546b8261542c565b602082019050919050565b5f6020820190508181035f83015261548d81615454565b9050919050565b7f526563697069656e742066726f7a656e000000000000000000000000000000005f82015250565b5f6154c8601083614bd3565b91506154d382615494565b602082019050919050565b5f6020820190508181035f8301526154f5816154bc565b9050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602160045260245ffd5b7f4e6f2070656e64696e67206465706f73697400000000000000000000000000005f82015250565b5f61555d601283614bd3565b915061556882615529565b602082019050919050565b5f6020820190508181035f83015261558a81615551565b9050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f6155c882614ad4565b91506155d383614ad4565b92508282039050818111156155eb576155ea615591565b5b92915050565b5f6040820190506156045f830185614add565b6156116020830184614add565b9392505050565b5f61562282614f13565b915061562d83614f13565b9250828201905060ff81111561564657615645615591565b5b92915050565b7f4e6f7420617574686f72697a65640000000000000000000000000000000000005f82015250565b5f615680600e83614bd3565b915061568b8261564c565b602082019050919050565b5f6020820190508181035f8301526156ad81615674565b9050919050565b7f4e6f2070656e64696e672072656465656d0000000000000000000000000000005f82015250565b5f6156e8601183614bd3565b91506156f3826156b4565b602082019050919050565b5f6020820190508181035f830152615715816156dc565b9050919050565b5f61572a6020840184614c6f565b905092915050565b61573b81614ad4565b82525050565b5f61574f6020840184614de0565b905092915050565b61576081614dc1565b82525050565b5f6157746020840184614cf4565b905092915050565b61578581614ccd565b82525050565b5f5ffd5b5f5ffd5b5f5ffd5b5f5f833560016020038436030381126157b3576157b2615793565b5b83810192508235915060208301925067ffffffffffffffff8211156157db576157da61578b565b5b6020820236038313156157f1576157f061578f565b5b509250929050565b5f82825260208201905092915050565b5f5ffd5b82818337505050565b5f61582183856157f9565b93507f07ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff83111561585457615853615809565b5b60208302925061586583858461580d565b82840190509392505050565b5f5f8335600160200384360303811261588d5761588c615793565b5b83810192508235915060208301925067ffffffffffffffff8211156158b5576158b461578b565b5b6001820236038313156158cb576158ca61578f565b5b509250929050565b5f82825260208201905092915050565b5f6158ee83856158d3565b93506158fb838584615042565b61590483614bf1565b840190509392505050565b5f61010083016159215f84018461571c565b61592d5f860182615732565b5061593b602084018461571c565b6159486020860182615732565b506159566040840184615741565b6159636040860182615757565b50615971606084018461571c565b61597e6060860182615732565b5061598c6080840184615741565b6159996080860182615757565b506159a760a0840184615766565b6159b460a086018261577c565b506159c260c0840184615797565b85830360c08701526159d5838284615816565b925050506159e660e0840184615871565b85830360e08701526159f98382846158e3565b925050508091505092915050565b5f6020820190508181035f830152615a1f818461590f565b905092915050565b5f5ffd5b5f5ffd5b5f67ffffffffffffffff821115615a4957615a48614f9a565b5b602082029050602081019050919050565b5f615a6c615a6784615a2f565b614ff8565b90508083825260208201905060208402830185811115615a8f57615a8e6151b8565b5b835b81811015615ab85780615aa48882614de0565b845260208401935050602081019050615a91565b5050509392505050565b5f82601f830112615ad657615ad5614f92565b5b8135615ae6848260208601615a5a565b91505092915050565b5f6101008284031215615b0557615b04615a27565b5b615b10610100614ff8565b90505f615b1f84828501614c6f565b5f830152506020615b3284828501614c6f565b6020830152506040615b4684828501614de0565b6040830152506060615b5a84828501614c6f565b6060830152506080615b6e84828501614de0565b60808301525060a0615b8284828501614cf4565b60a08301525060c082013567ffffffffffffffff811115615ba657615ba5615a2b565b5b615bb284828501615ac2565b60c08301525060e082013567ffffffffffffffff811115615bd657615bd5615a2b565b5b615be284828501615091565b60e08301525092915050565b5f60208284031215615c0357615c02614b0e565b5b5f82013567ffffffffffffffff811115615c2057615c1f614b12565b5b615c2c84828501615aef565b91505092915050565b5f615c3f82614cae565b9050919050565b615c4f81615c35565b8114615c59575f5ffd5b50565b5f81519050615c6a81615c46565b92915050565b5f5f5f5f5f60a08688031215615c8957615c88614b0e565b5b5f615c9688828901615c5c565b9550506020615ca788828901615c5c565b9450506040615cb888828901615302565b9350506060615cc988828901615c5c565b9250506080615cda88828901615302565b9150509295509295909350565b5f606082019050615cfa5f830186614add565b615d076020830185614f47565b615d146040830184614f47565b949350505050565b7f4665652063616e6e6f74206578636565642031303025000000000000000000005f82015250565b5f615d50601683614bd3565b9150615d5b82615d1c565b602082019050919050565b5f6020820190508181035f830152615d7d81615d44565b9050919050565b7f4e6f742070656e64696e670000000000000000000000000000000000000000005f82015250565b5f615db8600b83614bd3565b9150615dc382615d84565b602082019050919050565b5f6020820190508181035f830152615de581615dac565b9050919050565b5f606082019050615dff5f830186614f47565b615e0c6020830185614add565b615e196040830184614add565b949350505050565b7f536861726573206d7573742062652067726561746572207468616e20300000005f82015250565b5f615e55601d83614bd3565b9150615e6082615e21565b602082019050919050565b5f6020820190508181035f830152615e8281615e49565b9050919050565b7f496e73756666696369656e7420736861726573000000000000000000000000005f82015250565b5f615ebd601383614bd3565b9150615ec882615e89565b602082019050919050565b5f6020820190508181035f830152615eea81615eb1565b9050919050565b7f50656e64696e672072656465656d2065786973747300000000000000000000005f82015250565b5f615f25601583614bd3565b9150615f3082615ef1565b602082019050919050565b5f6020820190508181035f830152615f5281615f19565b9050919050565b5f604082019050615f6c5f830185614f47565b615f796020830184614add565b9392505050565b7f417373657473206d7573742062652067726561746572207468616e20300000005f82015250565b5f615fb4601d83614bd3565b9150615fbf82615f80565b602082019050919050565b5f6020820190508181035f830152615fe181615fa8565b9050919050565b7f496e73756666696369656e742062616c616e63650000000000000000000000005f82015250565b5f61601c601483614bd3565b915061602782615fe8565b602082019050919050565b5f6020820190508181035f83015261604981616010565b9050919050565b7f50656e64696e67206465706f73697420657869737473000000000000000000005f82015250565b5f616084601683614bd3565b915061608f82616050565b602082019050919050565b5f6020820190508181035f8301526160b181616078565b9050919050565b7f5072696365206d7573742062652067726561746572207468616e2030000000005f82015250565b5f6160ec601c83614bd3565b91506160f7826160b8565b602082019050919050565b5f6020820190508181035f830152616119816160e0565b9050919050565b7f496e73756666696369656e742070656e64696e672073686172657300000000005f82015250565b5f616154601b83614bd3565b915061615f82616120565b602082019050919050565b5f6020820190508181035f83015261618181616148565b9050919050565b7f496e73756666696369656e742070656e64696e672061737365747300000000005f82015250565b5f6161bc601b83614bd3565b91506161c782616188565b602082019050919050565b5f6020820190508181035f8301526161e9816161b0565b9050919050565b5f6161fa82614ad4565b915061620583614ad4565b925082820261621381614ad4565b9150828204841483151761622a57616229615591565b5b5092915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601260045260245ffd5b5f61626882614ad4565b915061627383614ad4565b92508261628357616282616231565b5b828204905092915050565b5f6060820190506162a15f830186614f47565b6162ae6020830185614f47565b6162bb6040830184614add565b949350505050565b5f6162cd82614ad4565b91506162d883614ad4565b92508282019050808211156162f0576162ef615591565b5b92915050565b5f6040820190506163095f830185614f47565b6163166020830184614e1f565b9392505050565b5f61632782614f13565b915061633283614f13565b92508261634257616341616231565b5b82820690509291505056fea2646970667358221220bb23fae82dea969a3eab97e137ef206715a11a701a5f6e32afb30996bb7eaaa564736f6c634300081c0033";
  readonly deployedBytecode: "0x608060405234801561000f575f5ffd5b50600436106103ad575f3560e01c8063788649ea116101f2578063b6363cf211610118578063dd62ed3e116100ab578063ef8b30f71161007a578063ef8b30f714610c72578063f00acbaa14610ca2578063f26c159f14610cc0578063f5a23d8d14610cdc576103ad565b8063dd62ed3e14610bc4578063ddca3f4314610bf4578063e161c3bf14610c12578063eaed1d0714610c42576103ad565b8063ce96cb77116100e7578063ce96cb7714610b18578063d547741f14610b48578063d905777e14610b64578063da39b3e714610b94576103ad565b8063b6363cf214610a58578063ba08765214610a88578063c63d75b614610ab8578063c6e6f59214610ae8576103ad565b806394bf804d11610190578063a217fddf1161015f578063a217fddf146109aa578063a9059cbb146109c8578063b3d7f6b9146109f8578063b460af9414610a28576103ad565b806394bf804d1461090e57806395d89b411461093e57806398d5fdca1461095c578063995ea21a1461097a576103ad565b806385b77f45116101cc57806385b77f4514610862578063860838a51461089257806391b7f5ed146108c257806391d14854146108de576103ad565b8063788649ea1461080c5780637d41c86e146108285780638456cb5914610858576103ad565b806338401c43116102d7578063558a7297116102755780636db79869116102445780636db79869146107745780636e553f651461079057806370a08231146107c057806376b4eb32146107f0576103ad565b8063558a7297146106ee5780635c975abb1461071e57806369fe0e2d1461073c5780636d14c2f614610758576103ad565b8063402d267d116102b1578063402d267d1461064157806340691db4146106715780634585e33b146106a25780634cdad506146106be576103ad565b806338401c43146105fd57806338d52e0f146106195780633f4ba83a14610637576103ad565b806318160ddd1161034f5780632e2d29841161031e5780632e2d2984146105775780632f2ff15d146105a7578063313ce567146105c357806336568abe146105e1576103ad565b806318160ddd146104c957806323b872dd146104e7578063248a9ca31461051757806326c6f96c14610547576103ad565b806307a2d13a1161038b57806307a2d13a1461041d578063095ea7b31461044d5780630a28a4771461047d5780630de93209146104ad576103ad565b806301e1d114146103b157806301ffc9a7146103cf57806306fdde03146103ff575b5f5ffd5b6103b9610d0c565b6040516103c69190614aec565b60405180910390f35b6103e960048036038101906103e49190614b6b565b610d91565b6040516103f69190614bb0565b60405180910390f35b610407610f46565b6040516104149190614c39565b60405180910390f35b61043760048036038101906104329190614c83565b610fd6565b6040516104449190614aec565b60405180910390f35b61046760048036038101906104629190614d08565b610fe8565b6040516104749190614bb0565b60405180910390f35b61049760048036038101906104929190614c83565b61100a565b6040516104a49190614aec565b60405180910390f35b6104c760048036038101906104c29190614d46565b611046565b005b6104d1611063565b6040516104de9190614aec565b60405180910390f35b61050160048036038101906104fc9190614d71565b61106c565b60405161050e9190614bb0565b60405180910390f35b610531600480360381019061052c9190614df4565b611195565b60405161053e9190614e2e565b60405180910390f35b610561600480360381019061055c9190614e47565b6111b2565b60405161056e9190614aec565b60405180910390f35b610591600480360381019061058c9190614e85565b611333565b60405161059e9190614aec565b60405180910390f35b6105c160048036038101906105bc9190614ed5565b6114cd565b005b6105cb6114ef565b6040516105d89190614f2e565b60405180910390f35b6105fb60048036038101906105f69190614ed5565b611528565b005b61061760048036038101906106129190614d46565b6115a3565b005b610621611793565b60405161062e9190614f56565b60405180910390f35b61063f6117ba565b005b61065b60048036038101906106569190614d46565b6117d1565b6040516106689190614aec565b60405180910390f35b61068b600480360381019061068691906150be565b6117fa565b604051610699929190615186565b60405180910390f35b6106bc60048036038101906106b79190615211565b61182a565b005b6106d860048036038101906106d39190614c83565b6118eb565b6040516106e59190614aec565b60405180910390f35b61070860048036038101906107039190615286565b611927565b6040516107159190614bb0565b60405180910390f35b610726611a26565b6040516107339190614bb0565b60405180910390f35b61075660048036038101906107519190614c83565b611a3b565b005b610772600480360381019061076d9190614d46565b611a97565b005b61078e60048036038101906107899190614d46565b611cae565b005b6107aa60048036038101906107a59190614e47565b611da2565b6040516107b79190614aec565b60405180910390f35b6107da60048036038101906107d59190614d46565b611e22565b6040516107e79190614aec565b60405180910390f35b61080a60048036038101906108059190614d46565b611e67565b005b61082660048036038101906108219190614d46565b611f5b565b005b610842600480360381019061083d9190614e85565b612002565b60405161084f9190614aec565b60405180910390f35b610860612417565b005b61087c60048036038101906108779190614e85565b61242e565b6040516108899190614aec565b60405180910390f35b6108ac60048036038101906108a79190614d46565b6128e2565b6040516108b99190614bb0565b60405180910390f35b6108dc60048036038101906108d79190614c83565b6128ff565b005b6108f860048036038101906108f39190614ed5565b612976565b6040516109059190614bb0565b60405180910390f35b61092860048036038101906109239190614e47565b6129da565b6040516109359190614aec565b60405180910390f35b610946612a5a565b6040516109539190614c39565b60405180910390f35b610964612aea565b6040516109719190614aec565b60405180910390f35b610994600480360381019061098f9190614e47565b612af3565b6040516109a19190614aec565b60405180910390f35b6109b2612c74565b6040516109bf9190614e2e565b60405180910390f35b6109e260048036038101906109dd9190614d08565b612c7a565b6040516109ef9190614bb0565b60405180910390f35b610a126004803603810190610a0d9190614c83565b612da1565b604051610a1f9190614aec565b60405180910390f35b610a426004803603810190610a3d9190614e85565b612ddd565b604051610a4f9190614aec565b60405180910390f35b610a726004803603810190610a6d91906152c4565b61304f565b604051610a7f9190614bb0565b60405180910390f35b610aa26004803603810190610a9d9190614e85565b6130dd565b604051610aaf9190614aec565b60405180910390f35b610ad26004803603810190610acd9190614d46565b61334e565b604051610adf9190614aec565b60405180910390f35b610b026004803603810190610afd9190614c83565b613377565b604051610b0f9190614aec565b60405180910390f35b610b326004803603810190610b2d9190614d46565b613389565b604051610b3f9190614aec565b60405180910390f35b610b626004803603810190610b5d9190614ed5565b6133a3565b005b610b7e6004803603810190610b799190614d46565b6133c5565b604051610b8b9190614aec565b60405180910390f35b610bae6004803603810190610ba99190614e85565b6133d6565b604051610bbb9190614aec565b60405180910390f35b610bde6004803603810190610bd991906152c4565b613604565b604051610beb9190614aec565b60405180910390f35b610bfc613686565b604051610c099190614aec565b60405180910390f35b610c2c6004803603810190610c279190614c83565b61368c565b604051610c399190614aec565b60405180910390f35b610c5c6004803603810190610c579190614e47565b6136af565b604051610c699190614aec565b60405180910390f35b610c8c6004803603810190610c879190614c83565b613830565b604051610c999190614aec565b60405180910390f35b610caa61386c565b604051610cb79190614e2e565b60405180910390f35b610cda6004803603810190610cd59190614d46565b613890565b005b610cf66004803603810190610cf19190614e47565b613938565b604051610d039190614aec565b60405180910390f35b5f610d15611793565b73ffffffffffffffffffffffffffffffffffffffff166370a08231306040518263ffffffff1660e01b8152600401610d4d9190614f56565b602060405180830381865afa158015610d68573d5f5f3e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610d8c9190615316565b905090565b5f7fbb9d82b2000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff19161480610e42575063e3bc4e6560e01b7bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916145b80610e915750632f0a18c560e01b7bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916145b80610ee0575063ce3bbe5060e01b7bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916145b80610f2f575063620ee8e460e01b7bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916145b80610f3f5750610f3e82613ab9565b5b9050919050565b606060038054610f559061536e565b80601f0160208091040260200160405190810160405280929190818152602001828054610f819061536e565b8015610fcc5780601f10610fa357610100808354040283529160200191610fcc565b820191905f5260205f20905b815481529060010190602001808311610faf57829003601f168201915b5050505050905090565b5f610fe1825f613b32565b9050919050565b5f5f610ff2613bbb565b9050610fff818585613bc2565b600191505092915050565b5f6040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161103d9061540e565b60405180910390fd5b5f5f1b61105281613bd4565b61105e5f5f1b83613be8565b505050565b5f600254905090565b5f600c5f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f9054906101000a900460ff16156110f7576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016110ee90615476565b60405180910390fd5b600c5f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f9054906101000a900460ff1615611181576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401611178906154de565b60405180910390fd5b61118c848484613cd2565b90509392505050565b5f60055f8381526020019081526020015f20600101549050919050565b5f5f60085f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f206040518060800160405290815f82015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001600182015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200160028201548152602001600382015f9054906101000a900460ff1660048111156112d3576112d26154fc565b5b60048111156112e5576112e46154fc565b5b815250509050600160048111156112ff576112fe6154fc565b5b81606001516004811115611316576113156154fc565b5b0361132857806040015191505061132d565b5f9150505b92915050565b5f5f5f1b61134081613bd4565b5f60085f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20905060016004811115611394576113936154fc565b5b816003015f9054906101000a900460ff1660048111156113b7576113b66154fc565b5b146113f7576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016113ee90615573565b60405180910390fd5b5f611405826002015461368c565b826002015461141491906155be565b9050611420815f613d00565b935061142c8685613d89565b6003826003015f6101000a81548160ff02191690836004811115611453576114526154fc565b5b02179055508573ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167fdcbc1c05240f31ff3ad067ef1ee35ce4997762752e3a095284754544f4c709d78460020154876040516114bb9291906155f1565b60405180910390a35050509392505050565b6114d682611195565b6114df81613bd4565b6114e98383613be8565b50505050565b5f6114f8613e08565b7f00000000000000000000000000000000000000000000000000000000000000006115239190615618565b905090565b611530613bbb565b73ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614611594576040517f6697b23200000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b61159e8282613e0f565b505050565b5f60095f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f209050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614806116455750611644823361304f565b5b611684576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161167b90615696565b60405180910390fd5b60016004811115611698576116976154fc565b5b816003015f9054906101000a900460ff1660048111156116bb576116ba6154fc565b5b146116fb576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016116f2906156fe565b60405180910390fd5b61172c30825f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff168360020154613ef9565b6004816003015f6101000a81548160ff02191690836004811115611753576117526154fc565b5b02179055507fa34b209824d24e31467e4012a81027b4937d3285d7ea71229352f1520fc61b79826040516117879190614f56565b60405180910390a15050565b5f7f0000000000000000000000000000000000000000000000000000000000000000905090565b5f5f1b6117c681613bd4565b6117ce613fe9565b50565b5f7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff9050919050565b5f606060019150836040516020016118129190615a07565b60405160208183030381529060405290509250929050565b5f828281019061183a9190615bee565b90505f5f5f5f5f8560e001518060200190518101906118599190615c70565b945094509450945094503073ffffffffffffffffffffffffffffffffffffffff16632e2d29848287886040518463ffffffff1660e01b81526004016118a093929190615ce7565b6020604051808303815f875af11580156118bc573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906118e09190615316565b505050505050505050565b5f6040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161191e9061540e565b60405180910390fd5b5f81600a5f3373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f6101000a81548160ff0219169083151502179055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167fceb576d9f15e4e200fdb5096d64d5dfd667e16def20c1eefd14256d8e3faa26784604051611a149190614bb0565b60405180910390a36001905092915050565b5f60065f9054906101000a900460ff16905090565b5f5f1b611a4781613bd4565b6103e8821115611a8c576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401611a8390615d66565b60405180910390fd5b81600b819055505050565b5f60085f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f209050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161480611b395750611b38823361304f565b5b611b78576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401611b6f90615696565b60405180910390fd5b60016004811115611b8c57611b8b6154fc565b5b816003015f9054906101000a900460ff166004811115611baf57611bae6154fc565b5b14611bef576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401611be690615573565b60405180910390fd5b611c47815f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff168260020154611c22611793565b73ffffffffffffffffffffffffffffffffffffffff1661404a9092919063ffffffff16565b6004816003015f6101000a81548160ff02191690836004811115611c6e57611c6d6154fc565b5b02179055507f315b8a0ece450231870bda1ecceeabdc74b6d0e53d6eb663bb910e3a6f42d6f182604051611ca29190614f56565b60405180910390a15050565b5f5f1b611cba81613bd4565b5f60085f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20905060016004811115611d0e57611d0d6154fc565b5b816003015f9054906101000a900460ff166004811115611d3157611d306154fc565b5b14611d71576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401611d6890615dce565b60405180910390fd5b6002816003015f6101000a81548160ff02191690836004811115611d9857611d976154fc565b5b0217905550505050565b5f5f611dad836117d1565b905080841115611df8578284826040517f79012fb2000000000000000000000000000000000000000000000000000000008152600401611def93929190615dec565b60405180910390fd5b5f611e0285613830565b9050611e17611e0f613bbb565b8587846140c9565b809250505092915050565b5f5f5f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20549050919050565b5f5f1b611e7381613bd4565b5f60095f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20905060016004811115611ec757611ec66154fc565b5b816003015f9054906101000a900460ff166004811115611eea57611ee96154fc565b5b14611f2a576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401611f2190615dce565b60405180910390fd5b6002816003015f6101000a81548160ff02191690836004811115611f5157611f506154fc565b5b0217905550505050565b5f5f1b611f6781613bd4565b5f600c5f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f6101000a81548160ff0219169083151502179055508173ffffffffffffffffffffffffffffffffffffffff167ff915cd9fe234de6e8d3afe7bf2388d35b2b6d48e8c629a24602019bde79c213a60405160405180910390a25050565b5f61200b614153565b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1603612042573391505b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff1603612079578192505b8173ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614806120b957506120b8833361304f565b5b6120f8576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016120ef90615696565b60405180910390fd5b5f841161213a576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161213190615e6b565b60405180910390fd5b8361214483611e22565b1015612185576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161217c90615ed3565b60405180910390fd5b612190823086613ef9565b5f90505f60048111156121a6576121a56154fc565b5b60095f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f206003015f9054906101000a900460ff166004811115612205576122046154fc565b5b14612245576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161223c90615f3b565b60405180910390fd5b60405180608001604052808373ffffffffffffffffffffffffffffffffffffffff1681526020018473ffffffffffffffffffffffffffffffffffffffff168152602001858152602001600160048111156122a2576122a16154fc565b5b81525060095f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f820151815f015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055506020820151816001015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550604082015181600201556060820151816003015f6101000a81548160ff021916908360048111156123a05761239f6154fc565b5b0217905550905050808273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167f1fdc681a13d8c5da54e301c7ce6542dcde4581e4725043fdab2db12ddc5745063388604051612408929190615f59565b60405180910390a49392505050565b5f5f1b61242381613bd4565b61242b614194565b50565b5f612437614153565b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff160361246e573391505b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff16036124a5578192505b8173ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614806124e557506124e4833361304f565b5b612524576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161251b90615696565b60405180910390fd5b5f8411612566576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161255d90615fca565b60405180910390fd5b8361256f611793565b73ffffffffffffffffffffffffffffffffffffffff166370a08231336040518263ffffffff1660e01b81526004016125a79190614f56565b602060405180830381865afa1580156125c2573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906125e69190615316565b1015612627576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161261e90616032565b60405180910390fd5b61265b333086612635611793565b73ffffffffffffffffffffffffffffffffffffffff166141f6909392919063ffffffff16565b5f90505f6004811115612671576126706154fc565b5b60085f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f206003015f9054906101000a900460ff1660048111156126d0576126cf6154fc565b5b14612710576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016127079061609a565b60405180910390fd5b60405180608001604052808373ffffffffffffffffffffffffffffffffffffffff1681526020018473ffffffffffffffffffffffffffffffffffffffff1681526020018581526020016001600481111561276d5761276c6154fc565b5b81525060085f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f820151815f015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055506020820151816001015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550604082015181600201556060820151816003015f6101000a81548160ff0219169083600481111561286b5761286a6154fc565b5b0217905550905050808273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167fbb58420bb8ce44e11b84e214cc0de10ce5e7c24d0355b2815c3d758b514cae7233886040516128d3929190615f59565b60405180910390a49392505050565b600c602052805f5260405f205f915054906101000a900460ff1681565b7f04824fcb60e7cc526d70b264caa65b62ed44d9c8e5d230e8ff6b0c7373843b8a61292981613bd4565b5f821161296b576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161296290616102565b60405180910390fd5b816007819055505050565b5f60055f8481526020019081526020015f205f015f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f9054906101000a900460ff16905092915050565b5f5f6129e58361334e565b905080841115612a30578284826040517f284ff667000000000000000000000000000000000000000000000000000000008152600401612a2793929190615dec565b60405180910390fd5b5f612a3a85612da1565b9050612a4f612a47613bbb565b8583886140c9565b809250505092915050565b606060048054612a699061536e565b80601f0160208091040260200160405190810160405280929190818152602001828054612a959061536e565b8015612ae05780601f10612ab757610100808354040283529160200191612ae0565b820191905f5260205f20905b815481529060010190602001808311612ac357829003601f168201915b5050505050905090565b5f600754905090565b5f5f60085f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f206040518060800160405290815f82015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001600182015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200160028201548152602001600382015f9054906101000a900460ff166004811115612c1457612c136154fc565b5b6004811115612c2657612c256154fc565b5b81525050905060026004811115612c4057612c3f6154fc565b5b81606001516004811115612c5757612c566154fc565b5b03612c69578060400151915050612c6e565b5f9150505b92915050565b5f5f1b81565b5f600c5f3373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f9054906101000a900460ff1615612d05576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401612cfc90615476565b60405180910390fd5b600c5f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f9054906101000a900460ff1615612d8f576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401612d86906154de565b60405180910390fd5b612d998383614278565b905092915050565b5f6040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401612dd49061540e565b60405180910390fd5b5f5f5f1b612dea81613bd4565b5f60095f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20905060016004811115612e3e57612e3d6154fc565b5b816003015f9054906101000a900460ff166004811115612e6157612e606154fc565b5b14612ea1576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401612e98906156fe565b60405180910390fd5b612eac866001613d00565b92508060020154831115612ef5576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401612eec9061616a565b60405180910390fd5b612f278587612f02611793565b73ffffffffffffffffffffffffffffffffffffffff1661404a9092919063ffffffff16565b612f31308461429a565b8281600201541115612f7a57612f7930825f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff16858460020154612f7491906155be565b613ef9565b5b6003816003015f6101000a81548160ff02191690836004811115612fa157612fa06154fc565b5b0217905550805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168573ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167ffbde797d201c681b91056529119e0b02407c7bb96a4a2c75c01fc9667232c8db898760405161303e9291906155f1565b60405180910390a450509392505050565b5f600a5f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f9054906101000a900460ff16905092915050565b5f5f5f1b6130ea81613bd4565b5f60095f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2090506001600481111561313e5761313d6154fc565b5b816003015f9054906101000a900460ff166004811115613161576131606154fc565b5b146131a1576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401613198906156fe565b60405180910390fd5b80600201548611156131e8576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016131df9061616a565b60405180910390fd5b6131f2865f613b32565b92506132268584613201611793565b73ffffffffffffffffffffffffffffffffffffffff1661404a9092919063ffffffff16565b613230308761429a565b85816002015411156132795761327830825f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1688846002015461327391906155be565b613ef9565b5b6003816003015f6101000a81548160ff021916908360048111156132a05761329f6154fc565b5b0217905550805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168573ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167ffbde797d201c681b91056529119e0b02407c7bb96a4a2c75c01fc9667232c8db868a60405161333d9291906155f1565b60405180910390a450509392505050565b5f7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff9050919050565b5f613382825f613d00565b9050919050565b5f61339c61339683611e22565b5f613b32565b9050919050565b6133ac82611195565b6133b581613bd4565b6133bf8383613e0f565b50505050565b5f6133cf82611e22565b9050919050565b5f5f5f1b6133e381613bd4565b5f60085f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20905060016004811115613437576134366154fc565b5b816003015f9054906101000a900460ff16600481111561345a576134596154fc565b5b1461349a576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161349190615573565b60405180910390fd5b6134a5866001613b32565b925080600201548311156134ee576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016134e5906161d2565b60405180910390fd5b6134f88587613d89565b828160020154111561356857613567815f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1684836002015461353a91906155be565b613542611793565b73ffffffffffffffffffffffffffffffffffffffff1661404a9092919063ffffffff16565b5b6003816003015f6101000a81548160ff0219169083600481111561358f5761358e6154fc565b5b02179055508473ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167fdcbc1c05240f31ff3ad067ef1ee35ce4997762752e3a095284754544f4c709d785896040516135f39291906155f1565b60405180910390a350509392505050565b5f60015f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2054905092915050565b600b5481565b5f6103e8600b548361369e91906161f0565b6136a8919061625e565b9050919050565b5f5f60095f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f206040518060800160405290815f82015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001600182015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200160028201548152602001600382015f9054906101000a900460ff1660048111156137d0576137cf6154fc565b5b60048111156137e2576137e16154fc565b5b815250509050600260048111156137fc576137fb6154fc565b5b81606001516004811115613813576138126154fc565b5b0361382557806040015191505061382a565b5f9150505b92915050565b5f6040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016138639061540e565b60405180910390fd5b7f04824fcb60e7cc526d70b264caa65b62ed44d9c8e5d230e8ff6b0c7373843b8a81565b5f5f1b61389c81613bd4565b6001600c5f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f6101000a81548160ff0219169083151502179055508173ffffffffffffffffffffffffffffffffffffffff167f4f2a367e694e71282f29ab5eaa04c4c0be45ac5bf2ca74fb67068b98bdc2887d60405160405180910390a25050565b5f5f60095f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f206040518060800160405290815f82015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001600182015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200160028201548152602001600382015f9054906101000a900460ff166004811115613a5957613a586154fc565b5b6004811115613a6b57613a6a6154fc565b5b81525050905060016004811115613a8557613a846154fc565b5b81606001516004811115613a9c57613a9b6154fc565b5b03613aae578060400151915050613ab3565b5f9150505b92915050565b5f7f7965db0b000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff19161480613b2b5750613b2a82614319565b5b9050919050565b5f5f6003811115613b4657613b456154fc565b5b826003811115613b5957613b586154fc565b5b03613b8b57613b846007546c0c9f2c9cd04674edea400000005f86614382909392919063ffffffff16565b9050613bb5565b613bb26007546c0c9f2c9cd04674edea40000000600186614382909392919063ffffffff16565b90505b92915050565b5f33905090565b613bcf83838360016143cf565b505050565b613be581613be0613bbb565b61459e565b50565b5f613bf38383612976565b613cc857600160055f8581526020019081526020015f205f015f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f6101000a81548160ff021916908315150217905550613c65613bbb565b73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16847f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d60405160405180910390a460019050613ccc565b5f90505b92915050565b5f5f613cdc613bbb565b9050613ce98582856145ef565b613cf4858585613ef9565b60019150509392505050565b5f5f6003811115613d1457613d136154fc565b5b826003811115613d2757613d266154fc565b5b03613d5957613d526c0c9f2c9cd04674edea400000006007545f86614382909392919063ffffffff16565b9050613d83565b613d806c0c9f2c9cd04674edea40000000600754600186614382909392919063ffffffff16565b90505b92915050565b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1603613df9575f6040517fec442f05000000000000000000000000000000000000000000000000000000008152600401613df09190614f56565b60405180910390fd5b613e045f8383614682565b5050565b5f5f905090565b5f613e1a8383612976565b15613eef575f60055f8581526020019081526020015f205f015f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f6101000a81548160ff021916908315150217905550613e8c613bbb565b73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16847ff6391f5c32d9c69d2a47ea670b442974b53935d1edc7fd64eb21e047a839171b60405160405180910390a460019050613ef3565b5f90505b92915050565b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff1603613f69575f6040517f96c6fd1e000000000000000000000000000000000000000000000000000000008152600401613f609190614f56565b60405180910390fd5b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1603613fd9575f6040517fec442f05000000000000000000000000000000000000000000000000000000008152600401613fd09190614f56565b60405180910390fd5b613fe4838383614682565b505050565b613ff161489b565b5f60065f6101000a81548160ff0219169083151502179055507f5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa614033613bbb565b6040516140409190614f56565b60405180910390a1565b6140c4838473ffffffffffffffffffffffffffffffffffffffff1663a9059cbb858560405160240161407d929190615f59565b604051602081830303815290604052915060e01b6020820180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff83818316178352505050506148db565b505050565b6140dc6140d4611793565b8530856141f6565b6140e68382613d89565b8273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167fdcbc1c05240f31ff3ad067ef1ee35ce4997762752e3a095284754544f4c709d784846040516141459291906155f1565b60405180910390a350505050565b61415b611a26565b15614192576040517fd93c066500000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b565b61419c614153565b600160065f6101000a81548160ff0219169083151502179055507f62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a2586141df613bbb565b6040516141ec9190614f56565b60405180910390a1565b614272848573ffffffffffffffffffffffffffffffffffffffff166323b872dd86868660405160240161422b9392919061628e565b604051602081830303815290604052915060e01b6020820180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff83818316178352505050506148db565b50505050565b5f5f614282613bbb565b905061428f818585613ef9565b600191505092915050565b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff160361430a575f6040517f96c6fd1e0000000000000000000000000000000000000000000000000000000081526004016143019190614f56565b60405180910390fd5b614315825f83614682565b5050565b5f7f01ffc9a7000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916149050919050565b5f6143b061438f83614976565b80156143ab57505f84806143a6576143a5616231565b5b868809115b6149a3565b6143bb8686866149ae565b6143c591906162c3565b9050949350505050565b5f73ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff160361443f575f6040517fe602df050000000000000000000000000000000000000000000000000000000081526004016144369190614f56565b60405180910390fd5b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff16036144af575f6040517f94280d620000000000000000000000000000000000000000000000000000000081526004016144a69190614f56565b60405180910390fd5b8160015f8673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20819055508015614598578273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b9258460405161458f9190614aec565b60405180910390a35b50505050565b6145a88282612976565b6145eb5780826040517fe2517d3f0000000000000000000000000000000000000000000000000000000081526004016145e29291906162f6565b60405180910390fd5b5050565b5f6145fa8484613604565b90507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff81101561467c578181101561466d578281836040517ffb8f41b200000000000000000000000000000000000000000000000000000000815260040161466493929190615dec565b60405180910390fd5b61467b84848484035f6143cf565b5b50505050565b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff16036146d2578060025f8282546146c691906162c3565b925050819055506147a0565b5f5f5f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205490508181101561475b578381836040517fe450d38c00000000000000000000000000000000000000000000000000000000815260040161475293929190615dec565b60405180910390fd5b8181035f5f8673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2081905550505b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16036147e7578060025f8282540392505081905550614831565b805f5f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f82825401925050819055505b8173ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef8360405161488e9190614aec565b60405180910390a3505050565b6148a3611a26565b6148d9576040517f8dfc202b00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b565b5f5f60205f8451602086015f885af1806148fa576040513d5f823e3d81fd5b3d92505f519150505f821461491357600181141561492e565b5f8473ffffffffffffffffffffffffffffffffffffffff163b145b1561497057836040517f5274afe70000000000000000000000000000000000000000000000000000000081526004016149679190614f56565b60405180910390fd5b50505050565b5f6001600283600381111561498e5761498d6154fc565b5b614998919061631d565b60ff16149050919050565b5f8115159050919050565b5f5f5f6149bb8686614a8d565b915091505f82036149e0578381816149d6576149d5616231565b5b0492505050614a86565b8184116149ff576149fe6149f95f861460126011614aaa565b614ac3565b5b5f8486880990508181118303925080820391505f855f038616905080860495508083049250600181825f0304019050808402831792505f600287600302189050808702600203810290508087026002038102905080870260020381029050808702600203810290508087026002038102905080870260020381029050808402955050505050505b9392505050565b5f5f5f198385098385029150818110828203039250509250929050565b5f614ab4846149a3565b82841802821890509392505050565b634e487b715f52806020526024601cfd5b5f819050919050565b614ae681614ad4565b82525050565b5f602082019050614aff5f830184614add565b92915050565b5f604051905090565b5f5ffd5b5f5ffd5b5f7fffffffff0000000000000000000000000000000000000000000000000000000082169050919050565b614b4a81614b16565b8114614b54575f5ffd5b50565b5f81359050614b6581614b41565b92915050565b5f60208284031215614b8057614b7f614b0e565b5b5f614b8d84828501614b57565b91505092915050565b5f8115159050919050565b614baa81614b96565b82525050565b5f602082019050614bc35f830184614ba1565b92915050565b5f81519050919050565b5f82825260208201905092915050565b8281835e5f83830152505050565b5f601f19601f8301169050919050565b5f614c0b82614bc9565b614c158185614bd3565b9350614c25818560208601614be3565b614c2e81614bf1565b840191505092915050565b5f6020820190508181035f830152614c518184614c01565b905092915050565b614c6281614ad4565b8114614c6c575f5ffd5b50565b5f81359050614c7d81614c59565b92915050565b5f60208284031215614c9857614c97614b0e565b5b5f614ca584828501614c6f565b91505092915050565b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f614cd782614cae565b9050919050565b614ce781614ccd565b8114614cf1575f5ffd5b50565b5f81359050614d0281614cde565b92915050565b5f5f60408385031215614d1e57614d1d614b0e565b5b5f614d2b85828601614cf4565b9250506020614d3c85828601614c6f565b9150509250929050565b5f60208284031215614d5b57614d5a614b0e565b5b5f614d6884828501614cf4565b91505092915050565b5f5f5f60608486031215614d8857614d87614b0e565b5b5f614d9586828701614cf4565b9350506020614da686828701614cf4565b9250506040614db786828701614c6f565b9150509250925092565b5f819050919050565b614dd381614dc1565b8114614ddd575f5ffd5b50565b5f81359050614dee81614dca565b92915050565b5f60208284031215614e0957614e08614b0e565b5b5f614e1684828501614de0565b91505092915050565b614e2881614dc1565b82525050565b5f602082019050614e415f830184614e1f565b92915050565b5f5f60408385031215614e5d57614e5c614b0e565b5b5f614e6a85828601614c6f565b9250506020614e7b85828601614cf4565b9150509250929050565b5f5f5f60608486031215614e9c57614e9b614b0e565b5b5f614ea986828701614c6f565b9350506020614eba86828701614cf4565b9250506040614ecb86828701614cf4565b9150509250925092565b5f5f60408385031215614eeb57614eea614b0e565b5b5f614ef885828601614de0565b9250506020614f0985828601614cf4565b9150509250929050565b5f60ff82169050919050565b614f2881614f13565b82525050565b5f602082019050614f415f830184614f1f565b92915050565b614f5081614ccd565b82525050565b5f602082019050614f695f830184614f47565b92915050565b5f5ffd5b5f6101008284031215614f8957614f88614f6f565b5b81905092915050565b5f5ffd5b5f5ffd5b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b614fd082614bf1565b810181811067ffffffffffffffff82111715614fef57614fee614f9a565b5b80604052505050565b5f615001614b05565b905061500d8282614fc7565b919050565b5f67ffffffffffffffff82111561502c5761502b614f9a565b5b61503582614bf1565b9050602081019050919050565b828183375f83830152505050565b5f61506261505d84615012565b614ff8565b90508281526020810184848401111561507e5761507d614f96565b5b615089848285615042565b509392505050565b5f82601f8301126150a5576150a4614f92565b5b81356150b5848260208601615050565b91505092915050565b5f5f604083850312156150d4576150d3614b0e565b5b5f83013567ffffffffffffffff8111156150f1576150f0614b12565b5b6150fd85828601614f73565b925050602083013567ffffffffffffffff81111561511e5761511d614b12565b5b61512a85828601615091565b9150509250929050565b5f81519050919050565b5f82825260208201905092915050565b5f61515882615134565b615162818561513e565b9350615172818560208601614be3565b61517b81614bf1565b840191505092915050565b5f6040820190506151995f830185614ba1565b81810360208301526151ab818461514e565b90509392505050565b5f5ffd5b5f5ffd5b5f5f83601f8401126151d1576151d0614f92565b5b8235905067ffffffffffffffff8111156151ee576151ed6151b4565b5b60208301915083600182028301111561520a576152096151b8565b5b9250929050565b5f5f6020838503121561522757615226614b0e565b5b5f83013567ffffffffffffffff81111561524457615243614b12565b5b615250858286016151bc565b92509250509250929050565b61526581614b96565b811461526f575f5ffd5b50565b5f813590506152808161525c565b92915050565b5f5f6040838503121561529c5761529b614b0e565b5b5f6152a985828601614cf4565b92505060206152ba85828601615272565b9150509250929050565b5f5f604083850312156152da576152d9614b0e565b5b5f6152e785828601614cf4565b92505060206152f885828601614cf4565b9150509250929050565b5f8151905061531081614c59565b92915050565b5f6020828403121561532b5761532a614b0e565b5b5f61533884828501615302565b91505092915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b5f600282049050600182168061538557607f821691505b60208210810361539857615397615341565b5b50919050565b7f4173796e63207661756c743a20757365207072657669657720616674657220725f8201527f6571756573740000000000000000000000000000000000000000000000000000602082015250565b5f6153f8602683614bd3565b91506154038261539e565b604082019050919050565b5f6020820190508181035f830152615425816153ec565b9050919050565b7f53656e6465722066726f7a656e000000000000000000000000000000000000005f82015250565b5f615460600d83614bd3565b915061546b8261542c565b602082019050919050565b5f6020820190508181035f83015261548d81615454565b9050919050565b7f526563697069656e742066726f7a656e000000000000000000000000000000005f82015250565b5f6154c8601083614bd3565b91506154d382615494565b602082019050919050565b5f6020820190508181035f8301526154f5816154bc565b9050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602160045260245ffd5b7f4e6f2070656e64696e67206465706f73697400000000000000000000000000005f82015250565b5f61555d601283614bd3565b915061556882615529565b602082019050919050565b5f6020820190508181035f83015261558a81615551565b9050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f6155c882614ad4565b91506155d383614ad4565b92508282039050818111156155eb576155ea615591565b5b92915050565b5f6040820190506156045f830185614add565b6156116020830184614add565b9392505050565b5f61562282614f13565b915061562d83614f13565b9250828201905060ff81111561564657615645615591565b5b92915050565b7f4e6f7420617574686f72697a65640000000000000000000000000000000000005f82015250565b5f615680600e83614bd3565b915061568b8261564c565b602082019050919050565b5f6020820190508181035f8301526156ad81615674565b9050919050565b7f4e6f2070656e64696e672072656465656d0000000000000000000000000000005f82015250565b5f6156e8601183614bd3565b91506156f3826156b4565b602082019050919050565b5f6020820190508181035f830152615715816156dc565b9050919050565b5f61572a6020840184614c6f565b905092915050565b61573b81614ad4565b82525050565b5f61574f6020840184614de0565b905092915050565b61576081614dc1565b82525050565b5f6157746020840184614cf4565b905092915050565b61578581614ccd565b82525050565b5f5ffd5b5f5ffd5b5f5ffd5b5f5f833560016020038436030381126157b3576157b2615793565b5b83810192508235915060208301925067ffffffffffffffff8211156157db576157da61578b565b5b6020820236038313156157f1576157f061578f565b5b509250929050565b5f82825260208201905092915050565b5f5ffd5b82818337505050565b5f61582183856157f9565b93507f07ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff83111561585457615853615809565b5b60208302925061586583858461580d565b82840190509392505050565b5f5f8335600160200384360303811261588d5761588c615793565b5b83810192508235915060208301925067ffffffffffffffff8211156158b5576158b461578b565b5b6001820236038313156158cb576158ca61578f565b5b509250929050565b5f82825260208201905092915050565b5f6158ee83856158d3565b93506158fb838584615042565b61590483614bf1565b840190509392505050565b5f61010083016159215f84018461571c565b61592d5f860182615732565b5061593b602084018461571c565b6159486020860182615732565b506159566040840184615741565b6159636040860182615757565b50615971606084018461571c565b61597e6060860182615732565b5061598c6080840184615741565b6159996080860182615757565b506159a760a0840184615766565b6159b460a086018261577c565b506159c260c0840184615797565b85830360c08701526159d5838284615816565b925050506159e660e0840184615871565b85830360e08701526159f98382846158e3565b925050508091505092915050565b5f6020820190508181035f830152615a1f818461590f565b905092915050565b5f5ffd5b5f5ffd5b5f67ffffffffffffffff821115615a4957615a48614f9a565b5b602082029050602081019050919050565b5f615a6c615a6784615a2f565b614ff8565b90508083825260208201905060208402830185811115615a8f57615a8e6151b8565b5b835b81811015615ab85780615aa48882614de0565b845260208401935050602081019050615a91565b5050509392505050565b5f82601f830112615ad657615ad5614f92565b5b8135615ae6848260208601615a5a565b91505092915050565b5f6101008284031215615b0557615b04615a27565b5b615b10610100614ff8565b90505f615b1f84828501614c6f565b5f830152506020615b3284828501614c6f565b6020830152506040615b4684828501614de0565b6040830152506060615b5a84828501614c6f565b6060830152506080615b6e84828501614de0565b60808301525060a0615b8284828501614cf4565b60a08301525060c082013567ffffffffffffffff811115615ba657615ba5615a2b565b5b615bb284828501615ac2565b60c08301525060e082013567ffffffffffffffff811115615bd657615bd5615a2b565b5b615be284828501615091565b60e08301525092915050565b5f60208284031215615c0357615c02614b0e565b5b5f82013567ffffffffffffffff811115615c2057615c1f614b12565b5b615c2c84828501615aef565b91505092915050565b5f615c3f82614cae565b9050919050565b615c4f81615c35565b8114615c59575f5ffd5b50565b5f81519050615c6a81615c46565b92915050565b5f5f5f5f5f60a08688031215615c8957615c88614b0e565b5b5f615c9688828901615c5c565b9550506020615ca788828901615c5c565b9450506040615cb888828901615302565b9350506060615cc988828901615c5c565b9250506080615cda88828901615302565b9150509295509295909350565b5f606082019050615cfa5f830186614add565b615d076020830185614f47565b615d146040830184614f47565b949350505050565b7f4665652063616e6e6f74206578636565642031303025000000000000000000005f82015250565b5f615d50601683614bd3565b9150615d5b82615d1c565b602082019050919050565b5f6020820190508181035f830152615d7d81615d44565b9050919050565b7f4e6f742070656e64696e670000000000000000000000000000000000000000005f82015250565b5f615db8600b83614bd3565b9150615dc382615d84565b602082019050919050565b5f6020820190508181035f830152615de581615dac565b9050919050565b5f606082019050615dff5f830186614f47565b615e0c6020830185614add565b615e196040830184614add565b949350505050565b7f536861726573206d7573742062652067726561746572207468616e20300000005f82015250565b5f615e55601d83614bd3565b9150615e6082615e21565b602082019050919050565b5f6020820190508181035f830152615e8281615e49565b9050919050565b7f496e73756666696369656e7420736861726573000000000000000000000000005f82015250565b5f615ebd601383614bd3565b9150615ec882615e89565b602082019050919050565b5f6020820190508181035f830152615eea81615eb1565b9050919050565b7f50656e64696e672072656465656d2065786973747300000000000000000000005f82015250565b5f615f25601583614bd3565b9150615f3082615ef1565b602082019050919050565b5f6020820190508181035f830152615f5281615f19565b9050919050565b5f604082019050615f6c5f830185614f47565b615f796020830184614add565b9392505050565b7f417373657473206d7573742062652067726561746572207468616e20300000005f82015250565b5f615fb4601d83614bd3565b9150615fbf82615f80565b602082019050919050565b5f6020820190508181035f830152615fe181615fa8565b9050919050565b7f496e73756666696369656e742062616c616e63650000000000000000000000005f82015250565b5f61601c601483614bd3565b915061602782615fe8565b602082019050919050565b5f6020820190508181035f83015261604981616010565b9050919050565b7f50656e64696e67206465706f73697420657869737473000000000000000000005f82015250565b5f616084601683614bd3565b915061608f82616050565b602082019050919050565b5f6020820190508181035f8301526160b181616078565b9050919050565b7f5072696365206d7573742062652067726561746572207468616e2030000000005f82015250565b5f6160ec601c83614bd3565b91506160f7826160b8565b602082019050919050565b5f6020820190508181035f830152616119816160e0565b9050919050565b7f496e73756666696369656e742070656e64696e672073686172657300000000005f82015250565b5f616154601b83614bd3565b915061615f82616120565b602082019050919050565b5f6020820190508181035f83015261618181616148565b9050919050565b7f496e73756666696369656e742070656e64696e672061737365747300000000005f82015250565b5f6161bc601b83614bd3565b91506161c782616188565b602082019050919050565b5f6020820190508181035f8301526161e9816161b0565b9050919050565b5f6161fa82614ad4565b915061620583614ad4565b925082820261621381614ad4565b9150828204841483151761622a57616229615591565b5b5092915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601260045260245ffd5b5f61626882614ad4565b915061627383614ad4565b92508261628357616282616231565b5b828204905092915050565b5f6060820190506162a15f830186614f47565b6162ae6020830185614f47565b6162bb6040830184614add565b949350505050565b5f6162cd82614ad4565b91506162d883614ad4565b92508282019050808211156162f0576162ef615591565b5b92915050565b5f6040820190506163095f830185614f47565b6163166020830184614e1f565b9392505050565b5f61632782614f13565b915061633283614f13565b92508261634257616341616231565b5b82820690509291505056fea2646970667358221220bb23fae82dea969a3eab97e137ef206715a11a701a5f6e32afb30996bb7eaaa564736f6c634300081c0033";
  readonly linkReferences: {};
  readonly deployedLinkReferences: {};
  readonly immutableReferences: {"1433":[{"length":32,"start":6038}],"1435":[{"length":32,"start":5370}]};
  readonly inputSourceName: "project/contracts/TokenVault.sol";
  readonly buildInfoId: "solc-0_8_28-0603b955d056901204601c139176ba9bc501e814";
};

import "hardhat/types/artifacts";
declare module "hardhat/types/artifacts" {
  interface ArtifactMap {
    ["IERC7540"]: IERC7540$Type
    ["TokenVault"]: TokenVault$Type;
    ["contracts/TokenVault.sol:IERC7540"]: IERC7540$Type
    ["contracts/TokenVault.sol:TokenVault"]: TokenVault$Type;
  }
}
```

---

## File: contracts/artifacts/contracts/ERC20.sol/artifacts.d.ts (5/7)
**Filetype:** typescript
**Modified:** No

```typescript
// This file was autogenerated by Hardhat, do not edit it.
// prettier-ignore
// tslint:disable
// eslint-disable
// biome-ignore format: see above

export interface MyERC20$Type {
  readonly _format: "hh3-artifact-1";
  readonly contractName: "MyERC20";
  readonly sourceName: "contracts/ERC20.sol";
  readonly abi: [{"inputs":[{"internalType":"string","name":"name_","type":"string"},{"internalType":"string","name":"symbol_","type":"string"},{"internalType":"uint256","name":"initialSupply","type":"uint256"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"allowance","type":"uint256"},{"internalType":"uint256","name":"needed","type":"uint256"}],"name":"ERC20InsufficientAllowance","type":"error"},{"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"uint256","name":"balance","type":"uint256"},{"internalType":"uint256","name":"needed","type":"uint256"}],"name":"ERC20InsufficientBalance","type":"error"},{"inputs":[{"internalType":"address","name":"approver","type":"address"}],"name":"ERC20InvalidApprover","type":"error"},{"inputs":[{"internalType":"address","name":"receiver","type":"address"}],"name":"ERC20InvalidReceiver","type":"error"},{"inputs":[{"internalType":"address","name":"sender","type":"address"}],"name":"ERC20InvalidSender","type":"error"},{"inputs":[{"internalType":"address","name":"spender","type":"address"}],"name":"ERC20InvalidSpender","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}];
  readonly bytecode: "0x608060405234801561000f575f5ffd5b506040516116ed3803806116ed8339818101604052810190610031919061048b565b82828160039081610042919061071a565b508060049081610052919061071a565b505050610065338261006d60201b60201c565b5050506108fe565b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16036100dd575f6040517fec442f050000000000000000000000000000000000000000000000000000000081526004016100d49190610828565b60405180910390fd5b6100ee5f83836100f260201b60201c565b5050565b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff1603610142578060025f828254610136919061086e565b92505081905550610210565b5f5f5f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20549050818110156101cb578381836040517fe450d38c0000000000000000000000000000000000000000000000000000000081526004016101c2939291906108b0565b60405180910390fd5b8181035f5f8673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2081905550505b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1603610257578060025f82825403925050819055506102a1565b805f5f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f82825401925050819055505b8173ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef836040516102fe91906108e5565b60405180910390a3505050565b5f604051905090565b5f5ffd5b5f5ffd5b5f5ffd5b5f5ffd5b5f601f19601f8301169050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b61036a82610324565b810181811067ffffffffffffffff8211171561038957610388610334565b5b80604052505050565b5f61039b61030b565b90506103a78282610361565b919050565b5f67ffffffffffffffff8211156103c6576103c5610334565b5b6103cf82610324565b9050602081019050919050565b8281835e5f83830152505050565b5f6103fc6103f7846103ac565b610392565b90508281526020810184848401111561041857610417610320565b5b6104238482856103dc565b509392505050565b5f82601f83011261043f5761043e61031c565b5b815161044f8482602086016103ea565b91505092915050565b5f819050919050565b61046a81610458565b8114610474575f5ffd5b50565b5f8151905061048581610461565b92915050565b5f5f5f606084860312156104a2576104a1610314565b5b5f84015167ffffffffffffffff8111156104bf576104be610318565b5b6104cb8682870161042b565b935050602084015167ffffffffffffffff8111156104ec576104eb610318565b5b6104f88682870161042b565b925050604061050986828701610477565b9150509250925092565b5f81519050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b5f600282049050600182168061056157607f821691505b6020821081036105745761057361051d565b5b50919050565b5f819050815f5260205f209050919050565b5f6020601f8301049050919050565b5f82821b905092915050565b5f600883026105d67fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8261059b565b6105e0868361059b565b95508019841693508086168417925050509392505050565b5f819050919050565b5f61061b61061661061184610458565b6105f8565b610458565b9050919050565b5f819050919050565b61063483610601565b61064861064082610622565b8484546105a7565b825550505050565b5f5f905090565b61065f610650565b61066a81848461062b565b505050565b5b8181101561068d576106825f82610657565b600181019050610670565b5050565b601f8211156106d2576106a38161057a565b6106ac8461058c565b810160208510156106bb578190505b6106cf6106c78561058c565b83018261066f565b50505b505050565b5f82821c905092915050565b5f6106f25f19846008026106d7565b1980831691505092915050565b5f61070a83836106e3565b9150826002028217905092915050565b61072382610513565b67ffffffffffffffff81111561073c5761073b610334565b5b610746825461054a565b610751828285610691565b5f60209050601f831160018114610782575f8415610770578287015190505b61077a85826106ff565b8655506107e1565b601f1984166107908661057a565b5f5b828110156107b757848901518255600182019150602085019450602081019050610792565b868310156107d457848901516107d0601f8916826106e3565b8355505b6001600288020188555050505b505050505050565b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f610812826107e9565b9050919050565b61082281610808565b82525050565b5f60208201905061083b5f830184610819565b92915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f61087882610458565b915061088383610458565b925082820190508082111561089b5761089a610841565b5b92915050565b6108aa81610458565b82525050565b5f6060820190506108c35f830186610819565b6108d060208301856108a1565b6108dd60408301846108a1565b949350505050565b5f6020820190506108f85f8301846108a1565b92915050565b610de28061090b5f395ff3fe608060405234801561000f575f5ffd5b5060043610610091575f3560e01c8063313ce56711610064578063313ce5671461013157806370a082311461014f57806395d89b411461017f578063a9059cbb1461019d578063dd62ed3e146101cd57610091565b806306fdde0314610095578063095ea7b3146100b357806318160ddd146100e357806323b872dd14610101575b5f5ffd5b61009d6101fd565b6040516100aa9190610a5b565b60405180910390f35b6100cd60048036038101906100c89190610b0c565b61028d565b6040516100da9190610b64565b60405180910390f35b6100eb6102af565b6040516100f89190610b8c565b60405180910390f35b61011b60048036038101906101169190610ba5565b6102b8565b6040516101289190610b64565b60405180910390f35b6101396102e6565b6040516101469190610c10565b60405180910390f35b61016960048036038101906101649190610c29565b6102ee565b6040516101769190610b8c565b60405180910390f35b610187610333565b6040516101949190610a5b565b60405180910390f35b6101b760048036038101906101b29190610b0c565b6103c3565b6040516101c49190610b64565b60405180910390f35b6101e760048036038101906101e29190610c54565b6103e5565b6040516101f49190610b8c565b60405180910390f35b60606003805461020c90610cbf565b80601f016020809104026020016040519081016040528092919081815260200182805461023890610cbf565b80156102835780601f1061025a57610100808354040283529160200191610283565b820191905f5260205f20905b81548152906001019060200180831161026657829003601f168201915b5050505050905090565b5f5f610297610467565b90506102a481858561046e565b600191505092915050565b5f600254905090565b5f5f6102c2610467565b90506102cf858285610480565b6102da858585610513565b60019150509392505050565b5f6012905090565b5f5f5f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20549050919050565b60606004805461034290610cbf565b80601f016020809104026020016040519081016040528092919081815260200182805461036e90610cbf565b80156103b95780601f10610390576101008083540402835291602001916103b9565b820191905f5260205f20905b81548152906001019060200180831161039c57829003601f168201915b5050505050905090565b5f5f6103cd610467565b90506103da818585610513565b600191505092915050565b5f60015f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2054905092915050565b5f33905090565b61047b8383836001610603565b505050565b5f61048b84846103e5565b90507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff81101561050d57818110156104fe578281836040517ffb8f41b20000000000000000000000000000000000000000000000000000000081526004016104f593929190610cfe565b60405180910390fd5b61050c84848484035f610603565b5b50505050565b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff1603610583575f6040517f96c6fd1e00000000000000000000000000000000000000000000000000000000815260040161057a9190610d33565b60405180910390fd5b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16036105f3575f6040517fec442f050000000000000000000000000000000000000000000000000000000081526004016105ea9190610d33565b60405180910390fd5b6105fe8383836107d2565b505050565b5f73ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff1603610673575f6040517fe602df0500000000000000000000000000000000000000000000000000000000815260040161066a9190610d33565b60405180910390fd5b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff16036106e3575f6040517f94280d620000000000000000000000000000000000000000000000000000000081526004016106da9190610d33565b60405180910390fd5b8160015f8673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f208190555080156107cc578273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925846040516107c39190610b8c565b60405180910390a35b50505050565b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff1603610822578060025f8282546108169190610d79565b925050819055506108f0565b5f5f5f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20549050818110156108ab578381836040517fe450d38c0000000000000000000000000000000000000000000000000000000081526004016108a293929190610cfe565b60405180910390fd5b8181035f5f8673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2081905550505b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1603610937578060025f8282540392505081905550610981565b805f5f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f82825401925050819055505b8173ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef836040516109de9190610b8c565b60405180910390a3505050565b5f81519050919050565b5f82825260208201905092915050565b8281835e5f83830152505050565b5f601f19601f8301169050919050565b5f610a2d826109eb565b610a3781856109f5565b9350610a47818560208601610a05565b610a5081610a13565b840191505092915050565b5f6020820190508181035f830152610a738184610a23565b905092915050565b5f5ffd5b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f610aa882610a7f565b9050919050565b610ab881610a9e565b8114610ac2575f5ffd5b50565b5f81359050610ad381610aaf565b92915050565b5f819050919050565b610aeb81610ad9565b8114610af5575f5ffd5b50565b5f81359050610b0681610ae2565b92915050565b5f5f60408385031215610b2257610b21610a7b565b5b5f610b2f85828601610ac5565b9250506020610b4085828601610af8565b9150509250929050565b5f8115159050919050565b610b5e81610b4a565b82525050565b5f602082019050610b775f830184610b55565b92915050565b610b8681610ad9565b82525050565b5f602082019050610b9f5f830184610b7d565b92915050565b5f5f5f60608486031215610bbc57610bbb610a7b565b5b5f610bc986828701610ac5565b9350506020610bda86828701610ac5565b9250506040610beb86828701610af8565b9150509250925092565b5f60ff82169050919050565b610c0a81610bf5565b82525050565b5f602082019050610c235f830184610c01565b92915050565b5f60208284031215610c3e57610c3d610a7b565b5b5f610c4b84828501610ac5565b91505092915050565b5f5f60408385031215610c6a57610c69610a7b565b5b5f610c7785828601610ac5565b9250506020610c8885828601610ac5565b9150509250929050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b5f6002820490506001821680610cd657607f821691505b602082108103610ce957610ce8610c92565b5b50919050565b610cf881610a9e565b82525050565b5f606082019050610d115f830186610cef565b610d1e6020830185610b7d565b610d2b6040830184610b7d565b949350505050565b5f602082019050610d465f830184610cef565b92915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f610d8382610ad9565b9150610d8e83610ad9565b9250828201905080821115610da657610da5610d4c565b5b9291505056fea2646970667358221220125fc37a5ecf924d93cad2987d2e864f7faa343751ffef493cda424463ea1e0864736f6c634300081c0033";
  readonly deployedBytecode: "0x608060405234801561000f575f5ffd5b5060043610610091575f3560e01c8063313ce56711610064578063313ce5671461013157806370a082311461014f57806395d89b411461017f578063a9059cbb1461019d578063dd62ed3e146101cd57610091565b806306fdde0314610095578063095ea7b3146100b357806318160ddd146100e357806323b872dd14610101575b5f5ffd5b61009d6101fd565b6040516100aa9190610a5b565b60405180910390f35b6100cd60048036038101906100c89190610b0c565b61028d565b6040516100da9190610b64565b60405180910390f35b6100eb6102af565b6040516100f89190610b8c565b60405180910390f35b61011b60048036038101906101169190610ba5565b6102b8565b6040516101289190610b64565b60405180910390f35b6101396102e6565b6040516101469190610c10565b60405180910390f35b61016960048036038101906101649190610c29565b6102ee565b6040516101769190610b8c565b60405180910390f35b610187610333565b6040516101949190610a5b565b60405180910390f35b6101b760048036038101906101b29190610b0c565b6103c3565b6040516101c49190610b64565b60405180910390f35b6101e760048036038101906101e29190610c54565b6103e5565b6040516101f49190610b8c565b60405180910390f35b60606003805461020c90610cbf565b80601f016020809104026020016040519081016040528092919081815260200182805461023890610cbf565b80156102835780601f1061025a57610100808354040283529160200191610283565b820191905f5260205f20905b81548152906001019060200180831161026657829003601f168201915b5050505050905090565b5f5f610297610467565b90506102a481858561046e565b600191505092915050565b5f600254905090565b5f5f6102c2610467565b90506102cf858285610480565b6102da858585610513565b60019150509392505050565b5f6012905090565b5f5f5f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20549050919050565b60606004805461034290610cbf565b80601f016020809104026020016040519081016040528092919081815260200182805461036e90610cbf565b80156103b95780601f10610390576101008083540402835291602001916103b9565b820191905f5260205f20905b81548152906001019060200180831161039c57829003601f168201915b5050505050905090565b5f5f6103cd610467565b90506103da818585610513565b600191505092915050565b5f60015f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2054905092915050565b5f33905090565b61047b8383836001610603565b505050565b5f61048b84846103e5565b90507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff81101561050d57818110156104fe578281836040517ffb8f41b20000000000000000000000000000000000000000000000000000000081526004016104f593929190610cfe565b60405180910390fd5b61050c84848484035f610603565b5b50505050565b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff1603610583575f6040517f96c6fd1e00000000000000000000000000000000000000000000000000000000815260040161057a9190610d33565b60405180910390fd5b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16036105f3575f6040517fec442f050000000000000000000000000000000000000000000000000000000081526004016105ea9190610d33565b60405180910390fd5b6105fe8383836107d2565b505050565b5f73ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff1603610673575f6040517fe602df0500000000000000000000000000000000000000000000000000000000815260040161066a9190610d33565b60405180910390fd5b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff16036106e3575f6040517f94280d620000000000000000000000000000000000000000000000000000000081526004016106da9190610d33565b60405180910390fd5b8160015f8673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f208190555080156107cc578273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925846040516107c39190610b8c565b60405180910390a35b50505050565b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff1603610822578060025f8282546108169190610d79565b925050819055506108f0565b5f5f5f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20549050818110156108ab578381836040517fe450d38c0000000000000000000000000000000000000000000000000000000081526004016108a293929190610cfe565b60405180910390fd5b8181035f5f8673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2081905550505b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1603610937578060025f8282540392505081905550610981565b805f5f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f82825401925050819055505b8173ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef836040516109de9190610b8c565b60405180910390a3505050565b5f81519050919050565b5f82825260208201905092915050565b8281835e5f83830152505050565b5f601f19601f8301169050919050565b5f610a2d826109eb565b610a3781856109f5565b9350610a47818560208601610a05565b610a5081610a13565b840191505092915050565b5f6020820190508181035f830152610a738184610a23565b905092915050565b5f5ffd5b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f610aa882610a7f565b9050919050565b610ab881610a9e565b8114610ac2575f5ffd5b50565b5f81359050610ad381610aaf565b92915050565b5f819050919050565b610aeb81610ad9565b8114610af5575f5ffd5b50565b5f81359050610b0681610ae2565b92915050565b5f5f60408385031215610b2257610b21610a7b565b5b5f610b2f85828601610ac5565b9250506020610b4085828601610af8565b9150509250929050565b5f8115159050919050565b610b5e81610b4a565b82525050565b5f602082019050610b775f830184610b55565b92915050565b610b8681610ad9565b82525050565b5f602082019050610b9f5f830184610b7d565b92915050565b5f5f5f60608486031215610bbc57610bbb610a7b565b5b5f610bc986828701610ac5565b9350506020610bda86828701610ac5565b9250506040610beb86828701610af8565b9150509250925092565b5f60ff82169050919050565b610c0a81610bf5565b82525050565b5f602082019050610c235f830184610c01565b92915050565b5f60208284031215610c3e57610c3d610a7b565b5b5f610c4b84828501610ac5565b91505092915050565b5f5f60408385031215610c6a57610c69610a7b565b5b5f610c7785828601610ac5565b9250506020610c8885828601610ac5565b9150509250929050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b5f6002820490506001821680610cd657607f821691505b602082108103610ce957610ce8610c92565b5b50919050565b610cf881610a9e565b82525050565b5f606082019050610d115f830186610cef565b610d1e6020830185610b7d565b610d2b6040830184610b7d565b949350505050565b5f602082019050610d465f830184610cef565b92915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f610d8382610ad9565b9150610d8e83610ad9565b9250828201905080821115610da657610da5610d4c565b5b9291505056fea2646970667358221220125fc37a5ecf924d93cad2987d2e864f7faa343751ffef493cda424463ea1e0864736f6c634300081c0033";
  readonly linkReferences: {};
  readonly deployedLinkReferences: {};
  readonly immutableReferences: {};
  readonly inputSourceName: "project/contracts/ERC20.sol";
  readonly buildInfoId: "solc-0_8_28-8bf1fd1e587be624b663b5063645ea41a797f00a";
};

import "hardhat/types/artifacts";
declare module "hardhat/types/artifacts" {
  interface ArtifactMap {
    ["MyERC20"]: MyERC20$Type;
    ["contracts/ERC20.sol:MyERC20"]: MyERC20$Type;
  }
}
```

---

## File: contracts/artifacts/artifacts.d.ts (6/7)
**Filetype:** typescript
**Modified:** No

```typescript

```

---

## File: contracts/artifacts/contracts/TokenVault.sol/IERC7540.json (7/7)
**Filetype:** json
**Modified:** No

```json
{
  "_format": "hh3-artifact-1",
  "contractName": "IERC7540",
  "sourceName": "contracts/TokenVault.sol",
  "abi": [
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Approval",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "sender",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "assets",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        }
      ],
      "name": "Deposit",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "controller",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "requestId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "sender",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "assets",
          "type": "uint256"
        }
      ],
      "name": "DepositRequest",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "controller",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "operator",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "approved",
          "type": "bool"
        }
      ],
      "name": "OperatorSet",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "controller",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "requestId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "sender",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        }
      ],
      "name": "RedeemRequest",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Transfer",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "sender",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "assets",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        }
      ],
      "name": "Withdraw",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        }
      ],
      "name": "allowance",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "approve",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "asset",
      "outputs": [
        {
          "internalType": "address",
          "name": "assetTokenAddress",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "balanceOf",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "requestId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "controller",
          "type": "address"
        }
      ],
      "name": "claimableDepositRequest",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "assets",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "requestId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "controller",
          "type": "address"
        }
      ],
      "name": "claimableRedeemRequest",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        }
      ],
      "name": "convertToAssets",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "assets",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "assets",
          "type": "uint256"
        }
      ],
      "name": "convertToShares",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "decimals",
      "outputs": [
        {
          "internalType": "uint8",
          "name": "",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "assets",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        }
      ],
      "name": "deposit",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "controller",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "operator",
          "type": "address"
        }
      ],
      "name": "isOperator",
      "outputs": [
        {
          "internalType": "bool",
          "name": "status",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        }
      ],
      "name": "maxDeposit",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "maxAssets",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        }
      ],
      "name": "maxMint",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "maxShares",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "maxRedeem",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "maxShares",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "maxWithdraw",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "maxAssets",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        }
      ],
      "name": "mint",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "assets",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "name",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "requestId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "controller",
          "type": "address"
        }
      ],
      "name": "pendingDepositRequest",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "assets",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "requestId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "controller",
          "type": "address"
        }
      ],
      "name": "pendingRedeemRequest",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "assets",
          "type": "uint256"
        }
      ],
      "name": "previewDeposit",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        }
      ],
      "name": "previewMint",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "assets",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        }
      ],
      "name": "previewRedeem",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "assets",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "assets",
          "type": "uint256"
        }
      ],
      "name": "previewWithdraw",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "redeem",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "assets",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "assets",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "controller",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "requestDeposit",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "requestId",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "controller",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "requestRedeem",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "requestId",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "operator",
          "type": "address"
        },
        {
          "internalType": "bool",
          "name": "approved",
          "type": "bool"
        }
      ],
      "name": "setOperator",
      "outputs": [
        {
          "internalType": "bool",
          "name": "success",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes4",
          "name": "interfaceId",
          "type": "bytes4"
        }
      ],
      "name": "supportsInterface",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "symbol",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalAssets",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "totalManagedAssets",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalSupply",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "transfer",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "transferFrom",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "assets",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "withdraw",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ],
  "bytecode": "0x",
  "deployedBytecode": "0x",
  "linkReferences": {},
  "deployedLinkReferences": {},
  "immutableReferences": {},
  "inputSourceName": "project/contracts/TokenVault.sol",
  "buildInfoId": "solc-0_8_28-0603b955d056901204601c139176ba9bc501e814"
}
```