import { useAppStore } from "../../store/appStore";
import { Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useChainId } from "wagmi";

export default function EnvironmentTab() {
  const {
    deployedVaults,
    selectedVault,
    setSelectedVault,
    setSelectedSection,
  } = useAppStore();
  const currentChainId = useChainId();
  const [copied, setCopied] = useState<string | null>(null);

  const chainNames: Record<number, string> = {
    1: "Ethereum Mainnet",
    11155111: "Sepolia Testnet",
    42161: "Arbitrum Mainnet",
    421614: "Arbitrum Sepolia",
    // Add more as needed
  };

  const explorerUrls: Record<number, string> = {
    1: "https://etherscan.io",
    11155111: "https://sepolia.etherscan.io",
    42161: "https://arbiscan.io",
    421614: "https://sepolia.arbiscan.io",
  };

  const groupedVaults: { [chainId: number]: string[] } = {};

  Object.keys(deployedVaults).forEach((key) => {
    const [chIdStr] = key.split("_");
    const chId = parseInt(chIdStr);
    if (!isNaN(chId)) {
      if (!groupedVaults[chId]) groupedVaults[chId] = [];
      groupedVaults[chId].push(...deployedVaults[key]);
    }
  });

  const sortedChains = Object.keys(groupedVaults).sort(
    (a, b) => Number(a) - Number(b),
  );

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSwitch = (vault: string) => {
    setSelectedVault(vault);
    setSelectedSection("dashboard"); // Or "about" as preferred
  };

  return (
    <div className="bg-[#0B101C]/80 backdrop-blur-sm border border-[#0847F7]/30 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0847F7]/20 to-[#8AA6F9]/10 px-8 py-6 border-b border-[#0847F7]/30">
        <h2 className="text-2xl font-bold text-[#F8FAFF] flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0847F7]/20 rounded-xl flex items-center justify-center">
            🌐
          </div>
          Environment
        </h2>
        <p className="text-[#F2EBE0] mt-1">
          Overview of deployed contracts across chains
        </p>
      </div>
      <div className="p-8">
        {sortedChains.length === 0 ? (
          <p className="text-center text-[#8AA6F9]">
            No deployed contracts yet. Deploy a vault to see them here.
          </p>
        ) : (
          sortedChains.map((chIdStr) => {
            const chId = Number(chIdStr);
            const chainName = chainNames[chId] || `Chain ID: ${chId}`;
            const explorerUrl = explorerUrls[chId] || "https://etherscan.io";
            const vaults = groupedVaults[chId];
            return (
              <div key={chId} className="mb-8">
                <h3 className="text-xl font-bold text-[#0847F7] mb-4">
                  {chainName} {chId === currentChainId && "(Current)"}
                </h3>
                <div className="bg-[#0B101C]/60 border border-[#0847F7]/30 rounded-xl p-6">
                  <h4 className="text-lg font-medium text-[#F8FAFF] mb-4">
                    Vaults
                  </h4>
                  <div className="space-y-4">
                    {vaults.map((vault) => (
                      <div
                        key={vault}
                        className="flex items-center justify-between bg-[#0B101C]/40 p-4 rounded-lg"
                      >
                        <p className="text-[#F8FAFF] font-mono truncate">
                          {vault}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCopy(vault)}
                            className="flex items-center gap-2 px-3 py-1 bg-[#0847F7]/30 text-[#F8FAFF] rounded hover:bg-[#0847F7]/50"
                          >
                            <Copy className="w-4 h-4" />
                            {copied === vault ? "Copied" : ""}
                          </button>
                          <a
                            href={`${explorerUrl}/address/${vault}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-1 bg-[#0847F7]/30 text-[#F8FAFF] rounded hover:bg-[#0847F7]/50"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          {selectedVault === vault ? (
                            <span className="px-3 py-1 bg-[#217B71]/30 text-[#F8FAFF] rounded">
                              Current
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSwitch(vault)}
                              className="px-3 py-1 bg-[#0847F7]/30 text-[#F8FAFF] rounded hover:bg-[#0847F7]/50"
                            >
                              Switch to
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
