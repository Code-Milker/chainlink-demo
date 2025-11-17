// dashboard/src/components/EventsSection.tsx
import { useEffect, useState } from "react";
import { usePublicClient, useChainId, useWatchContractEvent } from "wagmi";
import { formatEther, decodeEventLog } from "viem";
import {
  AlertCircle,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  ShieldOff,
  Shield,
  UserCheck,
  ArrowUpDown,
  Copy,
  ExternalLink,
} from "lucide-react";
import TokenVaultArtifact from "../../assets/abis/TokenVault.json";

const abi = TokenVaultArtifact.abi;

export default function DashBoardTab({
  vaultAddress,
}: {
  vaultAddress: `0x${string}`;
}) {
  const client = usePublicClient();
  const chainId = useChainId();
  const [events, setEvents] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const explorerUrls: Record<number, string> = {
    1: "https://etherscan.io",
    11155111: "https://sepolia.etherscan.io",
    42161: "https://arbiscan.io",
    421614: "https://sepolia.arbiscan.io",
  };
  const explorerUrl = explorerUrls[chainId] || "https://etherscan.io";

  // Fetch past events on mount
  useEffect(() => {
    if (!client) return;
    const fetchPastEvents = async () => {
      try {
        const latest = await client.getBlockNumber();
        const fromBlock = latest - 999n; // Limit to last 1000 blocks
        const logs = await client.getLogs({
          address: vaultAddress,
          fromBlock,
          toBlock: "latest",
        });
        const decoded = logs.map((log) => ({
          ...log,
          ...decodeEventLog({
            abi,
            data: log.data,
            topics: log.topics,
          }),
        }));
        setEvents(decoded.reverse()); // Newest first
      } catch (err) {
        setError("Failed to fetch past events. Showing real-time only.");
        console.error(err);
      }
    };
    fetchPastEvents();
  }, [client, vaultAddress]);

  // Watch for new events
  useWatchContractEvent({
    address: vaultAddress,
    abi,
    onLogs: (logs) => {
      const decoded = logs.map((log) =>
        decodeEventLog({
          abi,
          data: log.data,
          topics: log.topics,
        }),
      );
      setEvents((prev) => [...decoded, ...prev]);
    },
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getEventIcon = (eventName: string) => {
    switch (eventName) {
      case "Deposit":
      case "DepositRequest":
        return <CheckCircle2 className="w-5 h-5 text-[#217B71]" />;
      case "Withdraw":
      case "RedeemRequest":
        return <AlertCircle className="w-5 h-5 text-[#E54918]" />;
      case "Paused":
        return <PauseCircle className="w-5 h-5 text-[#E54918]" />;
      case "Unpaused":
        return <PlayCircle className="w-5 h-5 text-[#217B71]" />;
      case "AccountFrozen":
        return <ShieldOff className="w-5 h-5 text-[#E54918]" />;
      case "AccountUnfrozen":
        return <Shield className="w-5 h-5 text-[#217B71]" />;
      case "OperatorSet":
        return <UserCheck className="w-5 h-5 text-[#4A21C2]" />;
      case "Transfer":
      case "Approval":
        return <ArrowUpDown className="w-5 h-5 text-[#0847F7]" />;
      default:
        return <AlertCircle className="w-5 h-5 text-[#F7B808]" />;
    }
  };

  const formatArgs = (args: any) => {
    if (!args) return "{}";
    const formatted: any = {};
    for (const key in args) {
      if (key === "assets" || key === "shares" || key === "value") {
        formatted[key] = formatEther(args[key]);
      } else {
        formatted[key] = args[key].toString();
      }
    }
    return JSON.stringify(formatted, null, 2);
  };

  return (
    <div className="bg-[#0B101C]/80 backdrop-blur-sm border border-[#0847F7]/30 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0847F7]/20 to-[#8AA6F9]/10 px-8 py-6 border-b border-[#0847F7]/30">
        <h2 className="text-2xl font-bold text-[#F8FAFF] flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0847F7]/20 rounded-xl flex items-center justify-center">
            📊
          </div>
          Events Dashboard
        </h2>
        <p className="text-[#F2EBE0] mt-1">
          Real-time contract events and details
        </p>
      </div>

      {/* Contract Info */}
      <div className="px-8 py-6 border-b border-[#0847F7]/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#8AA6F9]">Contract Address</p>
            <p className="text-[#F8FAFF] font-mono">{vaultAddress}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleCopy(vaultAddress)}
              className="flex items-center gap-2 px-4 py-2 bg-[#0847F7]/30 text-[#F8FAFF] rounded-lg hover:bg-[#0847F7]/50"
            >
              <Copy className="w-4 h-4" />
              {copied ? "Copied!" : "Copy"}
            </button>
            <a
              href={`${explorerUrl}/address/${vaultAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-[#0847F7]/30 text-[#F8FAFF] rounded-lg hover:bg-[#0847F7]/50"
            >
              <ExternalLink className="w-4 h-4" />
              Explorer
            </a>
          </div>
        </div>
      </div>

      <div className="p-8">
        {error && <p className="text-[#E54918] mb-4">{error}</p>}
        <div className="space-y-4">
          {events.length === 0 ? (
            <p className="text-center text-[#8AA6F9]">
              No events yet. Interact with the contract to see activity.
            </p>
          ) : (
            events.map((event, index) => (
              <div
                key={index}
                className="bg-[#0B101C]/60 border border-[#0847F7]/30 rounded-xl p-6 flex items-start gap-4"
              >
                {getEventIcon(event.eventName)}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-bold text-[#F8FAFF]">
                      {event.eventName}
                    </h4>
                    <div className="text-sm text-[#8AA6F9]">
                      Block: {event.blockNumber?.toString() || "Pending"}
                    </div>
                  </div>
                  <p className="text-sm text-[#8AA6F9] mb-2">
                    Tx: {event.transactionHash?.slice(0, 10)}...
                    <a
                      href={`${explorerUrl}/tx/${event.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-[#0847F7] hover:underline"
                    >
                      <ExternalLink className="w-4 h-4 inline" />
                    </a>
                  </p>
                  <pre className="mt-2 text-xs text-[#F2EBE0] bg-black/30 p-3 rounded-lg overflow-x-auto">
                    {formatArgs(event.args)}
                  </pre>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
