import { network } from "hardhat";
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, http } from "viem";
import * as dotenv from "dotenv";
import { artifacts } from "hardhat";

dotenv.config();

async function deployTokenVault() {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  const adminPrivateKeyRaw = process.env.PRIVATE_KEY_ADMIN;
  if (!adminPrivateKeyRaw) throw new Error("PRIVATE_KEY_ADMIN not set in .env");
  const adminPrivateKey = adminPrivateKeyRaw as `0x${string}`;
  const adminAccount = privateKeyToAccount(adminPrivateKey);
  const adminAddress = adminAccount.address;

  const priceSetterAddressRaw = process.env.PRICE_SETTER_ADDRESS;
  if (!priceSetterAddressRaw)
    throw new Error("PRICE_SETTER_ADDRESS not set in .env");
  const priceSetterAddress = priceSetterAddressRaw as `0x${string}`;

  const erc20AddressRaw = process.env.ERC20_ADDRESS;
  if (!erc20AddressRaw) throw new Error("ERC20_ADDRESS not set in .env");
  const erc20Address = erc20AddressRaw as `0x${string}`;

  const adminWalletClient = createWalletClient({
    account: adminAccount,
    chain: publicClient.chain,
    transport: http(),
  });

  const TokenVaultArtifact = await artifacts.readArtifact("TokenVault");

  // === Deploy TokenVault ===
  console.log("Deploying TokenVault...");
  const vaultHash = await adminWalletClient.deployContract({
    abi: TokenVaultArtifact.abi,
    bytecode: TokenVaultArtifact.bytecode as `0x${string}`,
    args: [erc20Address, "TestVault", "TVT", adminAddress, priceSetterAddress],
  });
  console.log("TokenVault tx:", vaultHash);

  const vaultReceipt = await publicClient.waitForTransactionReceipt({
    hash: vaultHash,
  });

  if (!vaultReceipt.contractAddress)
    throw new Error("TokenVault deployment failed");
  const tokenVaultAddress = vaultReceipt.contractAddress;
  console.log("TokenVault deployed →", tokenVaultAddress);

  // Logs
  console.log(`TOKENVAULT_ADDRESS=${tokenVaultAddress}`);
  console.log(`ADMIN_ADDRESS=${adminAddress}`);
  console.log(`PRICE_SETTER_ADDRESS=${priceSetterAddress}`);
}

deployTokenVault().catch((err) => {
  console.error(err);
  process.exit(1);
});
