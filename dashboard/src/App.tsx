// dashboard/src/App.tsx
import { useAccount, useChainId } from "wagmi";
import { useAppStore } from "./store/appStore";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import DashboardTab from "./components/tabs/Dashboard";
import AdminTab from "./components/tabs/AdminTab";
import UserTab from "./components/tabs/UserTab";
import DeployTokenVault from "./components/DeployTokenVault";
import EnvironmentTab from "./components/tabs/Environment";
import { useEffect } from "react";
import AboutTab from "./components/tabs/AboutTab";
function App() {
  const { address, isConnected } = useAccount();
  const chainId: number | undefined = useChainId();
  const {
    deployedVaults,
    selectedVault,
    setSelectedVault,
    selectedSection,
    setSelectedSection,
  } = useAppStore();
  const key = address && chainId !== undefined ? `${chainId}_${address}` : "";
  const userVaults = key ? deployedVaults[key] || [] : [];
  // Auto-select/validate vault + default to about/deploy section
  useEffect(() => {
    if (isConnected && address && chainId !== undefined) {
      const vaults = deployedVaults[`${chainId}_${address}`] ?? [];
      if (vaults.length > 0) {
        if (!selectedVault || !vaults.includes(selectedVault)) {
          setSelectedVault(vaults[0]);
        }
        setSelectedSection("about");
      }
    }
  }, [
    isConnected,
    address,
    deployedVaults,
    selectedVault,
    setSelectedVault,
    setSelectedSection,
    chainId,
  ]);
  useEffect(() => {
    if (!isConnected) {
      setSelectedSection("about");
    }
  }, [isConnected, setSelectedSection]);
  return (
    <div className="dark:bg-chainlink-dark dark:text-chainlink-light min-h-screen">
      <Header />
      <div className="flex min-h-screen bg-[#0B101C]">
        <Sidebar />
        <main className="flex-1 p-8 md:pl-64 pt-24">
          <div className="max-w-4xl mx-auto">
            {isConnected ? (
              <>
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
                {selectedSection === "environment" && <EnvironmentTab />}
                {selectedSection === "about" && <AboutTab />}
              </>
            ) : (
              <AboutTab />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
export default App;
