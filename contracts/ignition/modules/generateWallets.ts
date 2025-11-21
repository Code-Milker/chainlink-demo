import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

async function generateWallets() {
  let envContent = "";

  for (let i = 1; i <= 5; i++) {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    const address = account.address;

    envContent += `PRIVATE_KEY${i}=${privateKey}\n`;
    envContent += `ADDRESS${i}=${address}\n`;
  }

  console.log("Generated 5 wallets and saved to .env:");
  console.log(envContent);
}

generateWallets();
