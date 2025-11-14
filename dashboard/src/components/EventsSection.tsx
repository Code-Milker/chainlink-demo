import { useWatchContractEvent } from "wagmi";
import { useState } from "react";
import TokenVaultArtifact from "../assets/abis/TokenVault.json";

const abi = TokenVaultArtifact.abi;

export default function EventsSection({
  vaultAddress,
}: {
  vaultAddress: `0x${string}`;
}) {
  const [events, setEvents] = useState<any[]>([]);

  // Listen for events (e.g., DepositRequest, RedeemRequest)
  useWatchContractEvent({
    address: vaultAddress,
    abi,
    eventName: "DepositRequest",
    onLogs: (logs) => {
      setEvents((prev) => [...prev, ...logs]);
    },
  });

  useWatchContractEvent({
    address: vaultAddress,
    abi,
    eventName: "RedeemRequest",
    onLogs: (logs) => {
      setEvents((prev) => [...prev, ...logs]);
    },
  });

  // Add more event listeners as needed, e.g., DepositCancelled, RedeemCancelled, etc.

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4 text-chainlink-light-blue">
        Vault Events
      </h2>
      {events.length === 0 && <p>No events yet.</p>}
      {events.length > 0 && (
        <table className="w-full border-collapse border border-chainlink-light-blue">
          <thead>
            <tr className="bg-chainlink-blue text-chainlink-light">
              <th className="p-2">Event</th>
              <th className="p-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event, i) => (
              <tr key={i} className="border-b border-chainlink-light-blue">
                <td className="p-2">{event.eventName}</td>
                <td className="p-2">{JSON.stringify(event.args)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
