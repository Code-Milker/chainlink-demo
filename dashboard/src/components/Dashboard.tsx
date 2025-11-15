import { useState } from "react";
import { useAppStore } from "../store/appStore";
import { DeployERC20 } from "./DeployERC20";
import { DeployVault } from "./DeployVault";
import EventsSection from "./EventsSection";
import TabsSection from "./TabSection";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { useReadContract, useChainId } from "wagmi";
import TokenVaultArtifact from "../assets/abis/TokenVault.json";
const abi = TokenVaultArtifact.abi;
function truncateAddress(address: string | undefined): string {
  if (!address) return "";
  return `${address.slice(0, 12)}...${address.slice(-8)}`;
}
export default function Dashboard({ vaults }: { vaults: string[] }) {
  const { selectedVault, setSelectedVault } = useAppStore();
  const [showDeploy, setShowDeploy] = useState(false);
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
  // Fetch asset address
  const { data: assetAddress } = useReadContract({
    address: selectedVault as `0x${string}` | undefined,
    abi,
    functionName: "asset",
    query: { enabled: !!selectedVault },
  });
  // Auto-select first if none
  if (!selectedVault && vaults.length > 0) {
    setSelectedVault(vaults[0]);
  }
  const handleCopyVault = () => {
    if (selectedVault) {
      navigator.clipboard.writeText(selectedVault);
      setCopiedVault(true);
      setTimeout(() => setCopiedVault(false), 2000);
    }
  };
  const handleCopyAsset = () => {
    if (assetAddress) {
      navigator.clipboard.writeText(assetAddress as string);
      setCopiedAsset(true);
      setTimeout(() => setCopiedAsset(false), 2000);
    }
  };
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-4 mb-6">
        <Listbox value={selectedVault} onChange={setSelectedVault}>
          <ListboxButton className="w-[300px] bg-chainlink-dark border border-chainlink-light-blue px-3 py-2 rounded text-left">
            {truncateAddress(selectedVault) || "Select a vault"}
          </ListboxButton>
          <ListboxOptions className="absolute mt-1 bg-chainlink-dark border border-chainlink-light-blue rounded shadow-lg">
            {vaults.map((vault) => (
              <ListboxOption
                key={vault}
                value={vault}
                className="px-3 py-2 hover:bg-chainlink-light-blue cursor-pointer"
              >
                {truncateAddress(vault)}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Listbox>
        <button
          onClick={() => setShowDeploy(!showDeploy)}
          className="bg-chainlink-blue hover:bg-chainlink-light-blue text-chainlink-light py-2 px-4 rounded"
        >
          {showDeploy && "Hide Deploy"}
          {!showDeploy && "Create New Vault"}
        </button>
      </div>
      {showDeploy && (
        <div className="space-y-6 mb-8">
          <DeployERC20 />
          <DeployVault />
        </div>
      )}
      {/* {selectedVault && ( */}
      {/*   <EventsSection vaultAddress={selectedVault as `0x${string}`} /> */}
      {/* )} */}
      {selectedVault && (
        <TabsSection vaultAddress={selectedVault as `0x${string}`} />
      )}
    </div>
  );
}
