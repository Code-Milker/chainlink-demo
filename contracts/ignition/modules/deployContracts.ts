import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts"; // ← Added to derive address from private key
import * as dotenv from "dotenv";

dotenv.config();

const adminPrivateKey = process.env.PRIVATE_KEY_ADMIN as `0x${string}`;
if (!adminPrivateKey) throw new Error("PRIVATE_KEY_ADMIN not set in .env");
const adminAccount = privateKeyToAccount(adminPrivateKey);
const adminAddress = adminAccount.address; // ← Derived address properly

const priceSetterAddress = process.env.PRICE_SETTER_ADDRESS as `0x${string}`;
if (!priceSetterAddress)
  throw new Error("PRICE_SETTER_ADDRESS not set in .env");

export default buildModule("Deploy", (m) => {
  // Deploy MyERC20
  console.log("deploying erc20");
  const erc20 = m.contract("MyERC20", [
    "TestToken",
    "TTK",
    parseEther("1000000"),
  ]);

  // Deploy TokenVault, passing ERC20 address as arg (Ignition handles dependency)
  //
  console.log("deploying vault");
  const vault = m.contract("TokenVault", [
    erc20,
    "TestVault",
    "TVT",
    adminAddress,
    priceSetterAddress,
  ]);

  return { erc20, vault };
});
