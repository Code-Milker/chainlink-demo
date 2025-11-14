import { useAccount } from "wagmi";
import { useAppStore } from "./store/appStore";
import Header from "./components/Header";
import Dashboard from "./components/Dashboard";
import { DeployERC20 } from "./components/DeployERC20";
import { DeployVault } from "./components/DeployVault";

function App() {
  const { address, isConnected } = useAccount();
  const { deployedVaults } = useAppStore();
  const userVaults = address ? deployedVaults[address] || [] : [];

  return (
    <div className="dark:bg-chainlink-dark dark:text-chainlink-light min-h-screen">
      <Header />
      {isConnected && userVaults.length > 0 && (
        <Dashboard vaults={userVaults} />
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
