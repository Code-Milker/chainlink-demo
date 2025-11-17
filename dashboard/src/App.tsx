// dashboard/src/App.tsx
import { useAccount } from "wagmi";
import { useAppStore } from "./store/appStore";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import DashboardTab from "./components/tabs/Dashboard";
import AdminTab from "./components/tabs/AdminTab";
import UserTab from "./components/tabs/UserTab";
import DeployTokenVault from "./components/DeployTokenVault";
import { useEffect } from "react";
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
  const {
    deployedVaults,
    selectedVault,
    setSelectedVault,
    selectedSection,
    setSelectedSection,
  } = useAppStore();
  const userVaults = address ? deployedVaults[address] || [] : [];

  // Auto-select/validate vault + default to about/deploy section
  useEffect(() => {
    if (isConnected && address) {
      const vaults = deployedVaults[address] ?? [];
      if (vaults.length > 0) {
        if (!selectedVault || !vaults.includes(selectedVault)) {
          setSelectedVault(vaults[0]);
        }
        setSelectedSection("about");
      } else {
        setSelectedSection("deploy");
        setSelectedVault(null);
      }
    }
  }, [
    isConnected,
    address,
    deployedVaults,
    selectedVault,
    setSelectedVault,
    setSelectedSection,
  ]);

  return (
    <div className="dark:bg-chainlink-dark dark:text-chainlink-light min-h-screen">
      <Header />
      {isConnected && (
        <div className="flex min-h-screen bg-[#0B101C]">
          <Sidebar />
          <main className="flex-1 p-8 md:pl-64">
            <div className="max-w-4xl mx-auto">
              {userVaults.length > 0 && (
                <div className="flex items-center space-x-4 mb-6">
                  <Listbox value={selectedVault} onChange={setSelectedVault}>
                    <ListboxButton className="w-[300px] bg-chainlink-dark border border-chainlink-light-blue px-3 py-2 rounded text-left">
                      {truncateAddress(selectedVault) || "Select a vault"}
                    </ListboxButton>
                    <ListboxOptions className="absolute mt-1 bg-chainlink-dark border border-chainlink-light-blue rounded shadow-lg z-10">
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
                </div>
              )}
              {selectedSection === "deploy" && <DeployTokenVault />}
              {selectedVault && selectedSection === "dashboard" && (
                <DashboardTab vaultAddress={selectedVault as `0x${string}`} />
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
      {!isConnected && (
        <div className="flex min-h-screen bg-[#0B101C]">
          <main className="flex-1 p-8 mt-20">
            <div className="max-w-4xl mx-auto">
              <AboutTab />
            </div>
          </main>
        </div>
      )}
    </div>
  );
}

export default App;
