import { network } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();
import { parseEther } from "viem";
import { MyERC20$Type } from "../../artifacts/contracts/ERC20.sol/artifacts.js";
import { GetContractReturnType } from "@nomicfoundation/hardhat-viem/types";
/**
 * Distributes the deposit token (underlying ERC20) from admin to 5 different accounts.
 * Assumes:
 * - Admin (wallet[3]) has sufficient tokens to distribute.
 * - Recipients are addresses from .env ADDRESS1 to ADDRESS5.
 * - Each distribution is 100 ether (adjustable).
 *
 * @param tokenAddress The address of the ERC20 token contract (deposit token).
 */
async function distributeTokensToFiveAccounts(tokenAddress: `0x${string}`) {
  const { viem } = await network.connect();
  const [, , , admin] = await viem.getWalletClients();
  // Attach to the ERC20 token
  const erc20: GetContractReturnType<MyERC20$Type["abi"]> =
    await viem.getContractAt("MyERC20", tokenAddress);
  const amount = parseEther("100");
  const addresses = [
    process.env.ADDRESS1,
    process.env.ADDRESS2,
    process.env.ADDRESS3,
    process.env.ADDRESS4,
    process.env.ADDRESS5,
  ] as `0x${string}`[];
  for (let i = 0; i < 5; i++) {
    const recipient = addresses[i];
    // Admin distributes tokens to recipient
    await erc20.write.transfer([recipient, amount], { account: admin.account });
    console.log(`Distributed ${amount} tokens to user ${recipient}`);
  }
}
// Example usage: await distributeTokensToFiveAccounts("0xYourTokenAddressHere");
