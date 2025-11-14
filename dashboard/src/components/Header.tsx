import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import linkLogo from "../assets/chainlinkSymbol.png";

export default function Header() {
  const { address, isConnected } = useAccount();
  const shortenedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  return (
    <header className="bg-chainlink-dark text-chainlink-light p-4 shadow-md flex justify-between items-center">
      <div className="flex items-center space-x-3">
        <img
          src={linkLogo}
          alt="Chainlink Logo"
          className="h-8 w-auto brightness-125" // Slight brightness boost for blue logo on dark bg
        />
        <h1 className="text-2xl font-bold">Chainlink Demo Dashboard</h1>
      </div>
      <div className="flex items-center space-x-4">
        {isConnected && (
          <span className="bg-chainlink-light-blue px-3 py-1 rounded text-chainlink-dark">
            {shortenedAddress}
          </span>
        )}
        <ConnectButton />
      </div>
    </header>
  );
}
