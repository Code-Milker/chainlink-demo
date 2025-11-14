import { useState } from "react";
import { useWriteContract, useReadContract, useAccount } from "wagmi";
import { keccak256, toHex } from "viem";
import TokenVaultArtifact from "../../assets/abis/TokenVault.json";

const abi = TokenVaultArtifact.abi;
const PRICE_SETTER_ROLE = keccak256(toHex("PRICE_SETTER_ROLE"));

export default function AdminTab({
  vaultAddress,
}: {
  vaultAddress: `0x${string}`;
}) {
  const { address } = useAccount();
  const [newPrice, setNewPrice] = useState("");
  const { writeContract } = useWriteContract();

  // Check if user has PRICE_SETTER_ROLE
  const { data: hasPriceSetter } = useReadContract({
    address: vaultAddress,
    abi,
    functionName: "hasRole",
    args: [PRICE_SETTER_ROLE, address],
  });

  const handleSetPrice = () => {
    if (!newPrice) return;
    writeContract({
      address: vaultAddress,
      abi,
      functionName: "setPrice",
      args: [BigInt(newPrice)],
    });
  };

  return (
    <div className="p-4 bg-chainlink-dark border border-chainlink-light-blue rounded mt-4">
      <h3 className="text-lg font-bold mb-2">Admin Operations</h3>
      {hasPriceSetter && (
        <>
          <label className="block text-sm font-medium mb-1">
            Set New Price
          </label>
          <input
            type="number"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded mb-2"
          />
          <button
            onClick={handleSetPrice}
            className="bg-chainlink-blue text-chainlink-light py-2 px-4 rounded hover:bg-chainlink-light-blue"
          >
            Set Price
          </button>
        </>
      )}
      {!hasPriceSetter && <p>You do not have admin privileges.</p>}
      {/* Add more: setFee, pause, freezeAccount, fulfill deposits/redeems */}
    </div>
  );
}
