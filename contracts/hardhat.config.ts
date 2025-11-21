import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import hardhatNetworkHelpers from "@nomicfoundation/hardhat-network-helpers";
import { defineConfig } from "hardhat/config"; // ← Removed unused configVariable import
import hardhatIgnitionViemPlugin from "@nomicfoundation/hardhat-ignition-viem";
import * as dotenv from "dotenv"; // ← Added to load .env

dotenv.config(); // ← Load .env file

// Helper to get env vars or throw (mimics configVariable behavior)
const getEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} not set in .env`);
  }
  return value;
};

export default defineConfig({
  plugins: [
    hardhatToolboxViemPlugin,
    hardhatNetworkHelpers,
    hardhatIgnitionViemPlugin,
  ],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
      mining: { auto: true }, // Instant mining to prevent hangs
      // Optional: If optimizer doesn't fix it, un-comment below for local testing only
      // allowUnlimitedContractSize: true
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
      mining: { auto: true },
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: getEnv("SEPOLIA_RPC_URL"), // ← Reads directly from .env
      accounts: [getEnv("PRIVATE_KEY_ADMIN")], // ← Use PRIVATE_KEY_ADMIN for signing
    },
    arbsepolia: {
      type: "http",
      chainType: "op",
      url: getEnv("ARBSEPOLIA_RPC_URL"), // ← Reads directly from .env
      accounts: [getEnv("PRIVATE_KEY_ADMIN")], // ← Use PRIVATE_KEY_ADMIN for signing
      chainId: 421614,
    },
  },
});
