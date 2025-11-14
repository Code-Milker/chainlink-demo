import { useReadContract, useChainId } from "wagmi";
import { useState } from "react";
import TokenVaultArtifact from "../../assets/abis/TokenVault.json";

const abi = TokenVaultArtifact.abi;

export default function ReadTab({
  vaultAddress,
}: {
  vaultAddress: `0x${string}`;
}) {
  const chainId = useChainId();
  const [copiedVault, setCopiedVault] = useState(false);
  const [copiedAsset, setCopiedAsset] = useState(false);

  const explorerUrls: Record<number, string> = {
    1: "https://etherscan.io",
    11155111: "https://sepolia.etherscan.io",
    42161: "https://arbiscan.io",
    421614: "https://sepolia.arbiscan.io",
    // Add more chains as needed
  };
  const explorerUrl = explorerUrls[chainId] || "";

  const { data: price, isLoading: priceLoading } = useReadContract({
    address: vaultAddress,
    abi,
    functionName: "getPrice",
  });

  const { data: fee } = useReadContract({
    address: vaultAddress,
    abi,
    functionName: "fee",
  });

  const { data: assetAddress } = useReadContract({
    address: vaultAddress,
    abi,
    functionName: "asset",
  });

  const handleCopyVault = () => {
    navigator.clipboard.writeText(vaultAddress);
    setCopiedVault(true);
    setTimeout(() => setCopiedVault(false), 2000);
  };

  const handleCopyAsset = () => {
    if (assetAddress) {
      navigator.clipboard.writeText(assetAddress as string);
      setCopiedAsset(true);
      setTimeout(() => setCopiedAsset(false), 2000);
    }
  };

  return (
    <div className="p-4 bg-chainlink-dark border border-chainlink-light-blue rounded mt-4">
      <h2 className="text-xl font-bold mb-4 text-chainlink-light-blue">
        Read Operations
      </h2>
      <p>
        Current Price (NAV): {priceLoading && "Loading..."}{" "}
        {!priceLoading && (price?.toString() ?? "N/A")}
      </p>
      <p>Fee (basis points): {fee?.toString() ?? "N/A"}</p>
      <div className="flex flex-col space-y-2 mt-4">
        <h2 className="text-xl font-bold  text-chainlink-light-blue">
          Contract Addresses
        </h2>
        <p>Vault Address: {vaultAddress}</p>
        <div className="flex space-x-2">
          <button
            onClick={handleCopyVault}
            className="bg-chainlink-blue text-chainlink-light py-1 px-2 rounded hover:bg-chainlink-light-blue w-fit"
          >
            {copiedVault ? "Copied!" : "Copy"}
          </button>
          {explorerUrl && (
            <a
              href={`${explorerUrl}/address/${vaultAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-chainlink-blue text-chainlink-light py-1 px-2 rounded hover:bg-chainlink-light-blue w-fit"
            >
              View in Block Explorer
            </a>
          )}
        </div>
      </div>
      {assetAddress && (
        <div className="flex flex-col space-y-2 mt-4">
          <p>ERC20 Asset Address: {assetAddress as string}</p>
          <div className="flex space-x-2">
            <button
              onClick={handleCopyAsset}
              className="bg-chainlink-blue text-chainlink-light py-1 px-2 rounded hover:bg-chainlink-light-blue w-fit"
            >
              {copiedAsset ? "Copied!" : "Copy"}
            </button>
            {explorerUrl && (
              <a
                href={`${explorerUrl}/address/${assetAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-chainlink-blue text-chainlink-light py-1 px-2 rounded hover:bg-chainlink-light-blue w-fit"
              >
                View in Block Explorer
              </a>
            )}
          </div>
        </div>
      )}
      {/* Add forms/inputs for params if needed, e.g., pendingDepositRequest with controller input */}
    </div>
  );
}
