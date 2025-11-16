// dashboard/src/App.tsx
import { useAccount } from "wagmi";
import { useAppStore } from "./store/appStore";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar"; // New import
import EventsSection from "./components/EventsSection"; // Assuming this exists
import ReadTab from "./components/tabs/ReadTab";
import AdminTab from "./components/tabs/AdminTab";
import UserTab from "./components/tabs/UserTab";
import { DeployERC20 } from "./components/DeployERC20";
import { DeployVault } from "./components/DeployVault";
import { useState } from "react";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import AboutTab from "./components/tabs/AboutTab";

function truncateAddress(address: string | undefined): string {
  if (!address) return "";
  return `${address.slice(0, 12)}...${address.slice(-8)}`;
}

function App() {
  const { address, isConnected } = useAccount();
  const { deployedVaults, selectedVault, setSelectedVault, selectedSection } =
    useAppStore();
  const userVaults = address ? deployedVaults[address] || [] : [];
  const [showDeploy, setShowDeploy] = useState(false);

  // Auto-select first if none
  if (!selectedVault && userVaults.length > 0) {
    setSelectedVault(userVaults[0]);
  }

  return (
    <div className="dark:bg-chainlink-dark dark:text-chainlink-light min-h-screen">
      <Header />
      {isConnected && userVaults.length > 0 && (
        <div className="flex min-h-screen bg-[#0B101C]">
          <Sidebar />
          <main className="flex-1 p-8">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center space-x-4 mb-6">
                <Listbox value={selectedVault} onChange={setSelectedVault}>
                  <ListboxButton className="w-[300px] bg-chainlink-dark border border-chainlink-light-blue px-3 py-2 rounded text-left">
                    {truncateAddress(selectedVault) || "Select a vault"}
                  </ListboxButton>
                  <ListboxOptions className="absolute mt-1 bg-chainlink-dark border border-chainlink-light-blue rounded shadow-lg">
                    {userVaults.map((vault) => (
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
              {selectedVault && selectedSection === "dashboard" && (
                <EventsSection vaultAddress={selectedVault as `0x${string}`} />
              )}
              {selectedVault && selectedSection === "read" && (
                <ReadTab vaultAddress={selectedVault as `0x${string}`} />
              )}
              {selectedVault && selectedSection === "admin" && (
                <AdminTab vaultAddress={selectedVault as `0x${string}`} />
              )}
              {selectedVault && selectedSection === "user" && (
                <UserTab vaultAddress={selectedVault as `0x${string}`} />
              )}
              {selectedSection === "about" && <AboutTab />}
            </div>
          </main>
        </div>
      )}
      {isConnected && userVaults.length === 0 && (
        <div className="p-6 text-center max-w-2xl mx-auto">
          <p className="mb-6 text-lg">
            No vaults deployed yet. Deploy an ERC-20 asset and then a vault to
            get started.
          </p>
          <DeployERC20 />
          <DeployVault />
        </div>
      )}
      {!isConnected && (
        <p className="p-6 text-center text-lg">
          Connect your wallet via the button above to get started.
        </p>
      )}
    </div>
  );
}
export default App;
