import { useState } from "react";
import {
  useWalletClient,
  usePublicClient,
  useChainId,
  useAccount,
} from "wagmi";
import TokenVaultArtifact from "../assets/abis/TokenVault.json"; // Adjust path based on your Hardhat setup
import { useAppStore } from "../store/appStore";
const abi = TokenVaultArtifact.abi;
const bytecode = TokenVaultArtifact.bytecode as `0x${string}`;
export function DeployVault() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const { address } = useAccount();
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [asset, setAsset] = useState("");
  const [name, setName] = useState("My Token Vault");
  const [symbol, setSymbol] = useState("MTV");
  const [defaultAdmin, setDefaultAdmin] = useState(address || "");
  const [priceSetter, setPriceSetter] = useState(address || "");
  const { addVault } = useAppStore();
  const [copied, setCopied] = useState(false);
  const explorerUrls: Record<number, string> = {
    1: "https://etherscan.io",
    11155111: "https://sepolia.etherscan.io",
    42161: "https://arbiscan.io",
    421614: "https://sepolia.arbiscan.io",
    // Add more chains as needed
  };
  const explorerUrl = explorerUrls[chainId] || "";
  const handleDeploy = async () => {
    if (!walletClient) {
      alert("Connect wallet first");
      return;
    }
    if (!publicClient) {
      alert("Public client not available");
      return;
    }
    if (!asset || !name || !symbol || !defaultAdmin || !priceSetter) {
      alert("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const hash = await walletClient.deployContract({
        abi,
        bytecode,
        args: [asset, name, symbol, defaultAdmin, priceSetter],
        chain: null, // Auto-detects from wallet
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      setDeployedAddress(receipt.contractAddress as string);
      if (receipt.contractAddress && address) {
        addVault(address, receipt.contractAddress);
      }
    } catch (error) {
      console.error("Deployment failed:", error);
      alert("Deployment failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  };
  const handleCopy = () => {
    if (deployedAddress) {
      navigator.clipboard.writeText(deployedAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <div className="bg-chainlink-dark text-chainlink-light p-6 rounded-lg shadow-md max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4 text-chainlink-light-blue">
        Deploy Token Vault
      </h2>
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Asset Address (ERC20)
          </label>
          <input
            type="text"
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
            className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded text-chainlink-light"
            placeholder="0x..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Vault Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded text-chainlink-light"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Vault Symbol</label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded text-chainlink-light"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Default Admin
          </label>
          <input
            type="text"
            value={defaultAdmin}
            onChange={(e) => setDefaultAdmin(e.target.value)}
            className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded text-chainlink-light"
            placeholder="0x..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Price Setter</label>
          <input
            type="text"
            value={priceSetter}
            onChange={(e) => setPriceSetter(e.target.value)}
            className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded text-chainlink-light"
            placeholder="0x..."
          />
        </div>
        <button
          type="button"
          onClick={handleDeploy}
          disabled={loading}
          className="w-full bg-chainlink-blue text-chainlink-light py-2 rounded hover:bg-chainlink-light-blue disabled:opacity-50"
        >
          {loading ? "Deploying..." : "Deploy to Current Chain"}
        </button>
      </form>
      {deployedAddress && (
        <div className="mt-4 text-chainlink-light-blue flex flex-col space-y-2">
          <p>Deployed at: {deployedAddress}</p>
          <button
            onClick={handleCopy}
            className="bg-chainlink-blue text-chainlink-light py-1 px-2 rounded hover:bg-chainlink-light-blue w-fit"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          {explorerUrl && (
            <a
              href={`${explorerUrl}/address/${deployedAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-chainlink-blue text-chainlink-light py-1 px-2 rounded hover:bg-chainlink-light-blue w-fit"
            >
              View in Block Explorer
            </a>
          )}
        </div>
      )}
    </div>
  );
}
