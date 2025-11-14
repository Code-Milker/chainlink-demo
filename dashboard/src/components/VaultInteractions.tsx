// dashboard/src/components/VaultInteractions.tsx
import { useState } from "react";
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import TokenVaultArtifact from "../assets/abis/TokenVault.json";

const abi = TokenVaultArtifact.abi;

export function VaultInteractions({
  vaultAddress,
}: {
  vaultAddress: `0x${string}`;
}) {
  const { address: userAddress } = useAccount();
  const [assetsToDeposit, setAssetsToDeposit] = useState("");
  const [controller, setController] = useState(userAddress || "");
  const [owner, setOwner] = useState(userAddress || "");
  const { writeContract, data: writeData } = useWriteContract();
  const { data: receipt } = useWaitForTransactionReceipt({ hash: writeData });

  // Example read: Get current price (NAV)
  const { data: price, isLoading: priceLoading } = useReadContract({
    abi,
    address: vaultAddress,
    functionName: "getPrice",
  });

  // Example write: Request deposit
  const handleRequestDeposit = () => {
    if (!assetsToDeposit || !controller || !owner) {
      alert("Please fill in all fields");
      return;
    }
    writeContract({
      abi,
      address: vaultAddress,
      functionName: "requestDeposit",
      args: [BigInt(assetsToDeposit), controller, owner],
    });
  };

  return (
    <div className="bg-chainlink-dark text-chainlink-light p-6 rounded-lg shadow-md max-w-md mx-auto mt-8">
      <h2 className="text-xl font-bold mb-4 text-chainlink-light-blue">
        Interact with Vault
      </h2>
      <p className="mb-4">
        Current Price (NAV):{" "}
        {priceLoading ? "Loading..." : price ? price.toString() : "N/A"}
      </p>
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Assets to Deposit
          </label>
          <input
            type="number"
            value={assetsToDeposit}
            onChange={(e) => setAssetsToDeposit(e.target.value)}
            className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded text-chainlink-light"
            placeholder="100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Controller Address
          </label>
          <input
            type="text"
            value={controller}
            onChange={(e) => setController(e.target.value)}
            className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded text-chainlink-light"
            placeholder="0x..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Owner Address
          </label>
          <input
            type="text"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded text-chainlink-light"
            placeholder="0x..."
          />
        </div>
        <button
          type="button"
          onClick={handleRequestDeposit}
          className="w-full bg-chainlink-blue text-chainlink-light py-2 rounded hover:bg-chainlink-light-blue"
        >
          Request Deposit
        </button>
      </form>
      {receipt && (
        <p className="mt-4 text-chainlink-light-blue">
          Transaction confirmed: {receipt.transactionHash}
        </p>
      )}
    </div>
  );
}
