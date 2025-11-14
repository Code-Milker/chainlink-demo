// dashboard/src/components/DeployERC20.tsx
import { useState } from "react";
import { useWalletClient, usePublicClient, useAccount } from "wagmi";
import MyERC20Artifact from "../assets/abis/ERC20.json"; // Adjust path based on your Hardhat setup

const abi = MyERC20Artifact.abi;
const bytecode = MyERC20Artifact.bytecode as `0x${string}`;

export function DeployERC20() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("My Token");
  const [symbol, setSymbol] = useState("MTK");
  const [initialSupply, setInitialSupply] = useState("1000000000000000000000"); // e.g., 1000 tokens with 18 decimals

  const handleDeploy = async () => {
    if (!walletClient) {
      alert("Connect wallet first");
      return;
    }
    if (!publicClient) {
      alert("Public client not available");
      return;
    }
    if (!name || !symbol || !initialSupply) {
      alert("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const hash = await walletClient.deployContract({
        abi,
        bytecode,
        args: [name, symbol, BigInt(initialSupply)],
        chain: null, // Auto-detects from wallet
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      setDeployedAddress(receipt.contractAddress as string);
    } catch (error) {
      console.error("Deployment failed:", error);
      alert("Deployment failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-chainlink-dark text-chainlink-light p-6 rounded-lg shadow-md max-w-md mx-auto mt-8">
      <h2 className="text-xl font-bold mb-4 text-chainlink-light-blue">
        Deploy ERC-20 Token
      </h2>
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Token Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded text-chainlink-light"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Token Symbol</label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded text-chainlink-light"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Initial Supply (in wei)
          </label>
          <input
            type="text"
            value={initialSupply}
            onChange={(e) => setInitialSupply(e.target.value)}
            className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded text-chainlink-light"
            placeholder="1000000000000000000000" // 1000 * 10^18
          />
        </div>
        <button
          type="button"
          onClick={handleDeploy}
          disabled={loading}
          className="w-full bg-chainlink-blue text-chainlink-light py-2 rounded hover:bg-chainlink-light-blue disabled:opacity-50"
        >
          {loading ? "Deploying..." : "Deploy ERC-20"}
        </button>
      </form>
      {deployedAddress && (
        <p className="mt-4 text-chainlink-light-blue">
          Deployed at: {deployedAddress} (Copy this as Asset Address for Vault)
        </p>
      )}
    </div>
  );
}
