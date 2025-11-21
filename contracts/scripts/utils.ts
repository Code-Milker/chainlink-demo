// contracts/ignition/modules/utils.ts
import type { PublicClient } from "viem";
import hre from "hardhat"; // ← Import Hardhat runtime for viem.getTestClient

/**
 * Mines one block **only** on local Hardhat/EDR/Anvil nodes, including all pending transactions.
 * Safe to call on any chain — does nothing on real networks.
 */
export async function mineOneBlockIfLocal(publicClient: PublicClient) {
  const chainId = publicClient.chain.id;
  const localChainIds = new Set([31337, 1337, 31338]); // Hardhat, Anvil, EDR defaults
  if (!localChainIds.has(chainId)) return;

  try {
    const testClient = await hre.viem.getTestClient(); // ← Get Viem TestClient via Hardhat
    await testClient.mine({ blocks: 1 }); // ← Mine 1 block (includes pending txs)
    console.log("mined");
  } catch (e) {
    console.warn("Failed to mine block (not local network?)", e);
  }
}
// Custom polling function with timeout and logging
export async function pollForReceipt(
  publicClient: any,
  hash: `0x${string}`,
  options: { pollIntervalMs?: number; timeoutMs?: number } = {},
) {
  const { pollIntervalMs = 1500, timeoutMs = 100000 } = options; // Defaults: Poll every 0.5s, timeout after 30s
  const startTime = Date.now();

  while (true) {
    try {
      const receipt = await publicClient.getTransactionReceipt({ hash });
      if (receipt) {
        console.log("Receipt found:", receipt); // Debug log
        return receipt;
      }
    } catch (error) {
      console.warn("Error fetching receipt:", error.message); // Log any RPC errors
    }

    if (Date.now() - startTime > timeoutMs) {
      throw new Error(
        `Timeout waiting for receipt for tx ${hash} after ${timeoutMs}ms`,
      );
    }

    console.log(`Polling for receipt (${hash})...`); // Debug: See if it's looping
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}
