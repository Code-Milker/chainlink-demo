import { VaultInteractions } from "../VaultInteractions.tsx";

export default function UserTab({
  vaultAddress,
}: {
  vaultAddress: `0x${string}`;
}) {
  return (
    <div className="p-4 bg-chainlink-dark border border-chainlink-light-blue rounded mt-4">
      <h3 className="text-lg font-bold mb-2">User Operations</h3>
      <VaultInteractions vaultAddress={vaultAddress} />
      {/* Add more forms: requestRedeem, cancelDeposit, setOperator */}
    </div>
  );
}
