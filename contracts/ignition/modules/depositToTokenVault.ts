import { network } from "hardhat";
import { parseEther } from "viem";
import { MyERC20$Type } from "../../artifacts/contracts/ERC20.sol/artifacts.js";
import { TokenVault$Type } from "../../artifacts/contracts/TokenVault.sol/artifacts.js";
import { GetContractReturnType } from "@nomicfoundation/hardhat-viem/types";

/**
 * Adds 5 deposits to an existing TokenVault contract.
 * Assumes:
 * - Admin (wallet[3]) has DEFAULT_ADMIN_ROLE for fulfillment.
 * - Deployer (wallet[0]) has tokens for funding users.
 * - Users are wallet clients[5] to [9] (fresh, avoiding test overlaps).
 * - Each deposit is 100 ether (adjustable).
 *
 * @param vaultAddress The address of the existing TokenVault contract.
 */
async function addFiveDeposits(vaultAddress: `0x${string}`) {
  const { viem } = await network.connect();
  const [deployer, , , admin, , user1, user2, user3, user4, user5] =
    await viem.getWalletClients();

  // Attach to existing vault
  const tokenVault: GetContractReturnType<TokenVault$Type["abi"]> =
    await viem.getContractAt("TokenVault", vaultAddress);

  // Get underlying asset address and attach
  const assetAddress = await tokenVault.read.asset();
  const erc20: GetContractReturnType<MyERC20$Type["abi"]> =
    await viem.getContractAt("MyERC20", assetAddress);

  const depositAmount = parseEther("100");

  const users = [user1, user2, user3, user4, user5];

  for (let i = 0; i < 5; i++) {
    const user = users[i];
    const controller = user.account.address;

    // Fund user from deployer
    await erc20.write.transfer([controller, depositAmount], {
      account: deployer.account,
    });

    // User approves vault
    await erc20.write.approve([vaultAddress, depositAmount], {
      account: user.account,
    });

    // User requests deposit
    await tokenVault.write.requestDeposit(
      [depositAmount, controller, controller],
      { account: user.account },
    );

    // Admin fulfills deposit
    await tokenVault.write.deposit([depositAmount, controller, controller], {
      account: admin.account,
    });

    console.log(`Deposit ${i + 1} added for user ${controller}`);
  }
}

// Example usage: await addFiveDeposits("0xYourVaultAddressHere");
