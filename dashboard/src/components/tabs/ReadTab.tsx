import { useReadContract } from "wagmi";
import TokenVaultArtifact from "../../assets/abis/TokenVault.json";

const abi = TokenVaultArtifact.abi;

export default function ReadTab({
  vaultAddress,
}: {
  vaultAddress: `0x${string}`;
}) {
  const { data: price, isLoading: priceLoading } = useReadContract({
    address: vaultAddress,
    abi,
    functionName: "getPrice",
  });

  // Add more reads: pendingDepositRequest, etc.
  const { data: fee } = useReadContract({
    address: vaultAddress,
    abi,
    functionName: "fee",
  });

  return (
    <div className="p-4 bg-chainlink-dark border border-chainlink-light-blue rounded mt-4">
      <h3 className="text-lg font-bold mb-2">Read Operations</h3>
      <p>
        Current Price (NAV): {priceLoading && "Loading..."}{" "}
        {!priceLoading && (price?.toString() ?? "N/A")}
      </p>
      <p>Fee (basis points): {fee?.toString() ?? "N/A"}</p>
      {/* Add forms/inputs for params if needed, e.g., pendingDepositRequest with controller input */}
    </div>
  );
}
