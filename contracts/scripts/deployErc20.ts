import { network } from "hardhat";
import { parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, http } from "viem";
import * as dotenv from "dotenv";
import { artifacts } from "hardhat";

dotenv.config();

async function deployERC20() {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  const adminPrivateKeyRaw = process.env.PRIVATE_KEY_ADMIN;
  if (!adminPrivateKeyRaw) throw new Error("PRIVATE_KEY_ADMIN not set in .env");
  const adminPrivateKey = adminPrivateKeyRaw as `0x${string}`;
  const adminAccount = privateKeyToAccount(adminPrivateKey);

  const adminWalletClient = createWalletClient({
    account: adminAccount,
    chain: publicClient.chain,
    transport: http(),
  });

  const MyERC20Artifact = await artifacts.readArtifact("MyERC20");

  // === Deploy ERC20 ===
  const erc20Hash = await adminWalletClient.deployContract({
    abi: MyERC20Artifact.abi,
    bytecode: MyERC20Artifact.bytecode as `0x${string}`,
    args: ["TestToken", "TTK", parseEther("1000000")],
  });
  console.log("ERC20 tx:", erc20Hash);

  const erc20Receipt = await publicClient.waitForTransactionReceipt({
    hash: erc20Hash,
  });
  console.log("ERC20 Receipt:", erc20Receipt);

  if (!erc20Receipt.contractAddress) throw new Error("ERC20 deployment failed");
  const erc20Address = erc20Receipt.contractAddress;
  console.log("ERC20 deployed →", erc20Address);

  // Logs
  console.log(`ERC20_ADDRESS=${erc20Address}`);
}

deployERC20().catch((err) => {
  console.error(err);
  process.exit(1);
});
