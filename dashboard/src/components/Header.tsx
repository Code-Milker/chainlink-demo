import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useBalance, useChainId } from "wagmi";
import { formatEther } from "viem";
import linkLogo from "../assets/chainlinkSymbol.png";

const LINK_ADDRESSES: { [key: number]: `0x${string}` } = {
  1: "0x514910771af9ca656af840dff83e8264ecf986ca", // Ethereum Mainnet
  11155111: "0x779877a7b0d9e8603169ddbd7836e478b4624789", // Ethereum Sepolia
  42161: "0xf97f4df75117a78c1a5a0dbb814af92458539fb4", // Arbitrum Mainnet
  421614: "0x7f1b9ee544f9ff9bb521ab79c205d79c55250a36", // Arbitrum Sepolia
  // Local Hardhat (31337) not included; will show N/A
};

export default function Header() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const shortenedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  const linkAddress = LINK_ADDRESSES[chainId] || undefined;

  const { data: ethBalance } = useBalance({ address });
  const { data: linkBalance } = useBalance({ address, token: linkAddress });

  const formattedEth = ethBalance
    ? parseFloat(formatEther(ethBalance.value)).toFixed(4)
    : "0.0000";

  const formattedLink = linkBalance
    ? parseFloat(formatEther(linkBalance.value)).toFixed(4)
    : linkAddress
      ? "Loading..."
      : "N/A";

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
          <>
            <span className="bg-chainlink-light-blue px-3 py-1 rounded text-chainlink-dark">
              ETH: {formattedEth}
            </span>
            <span className="bg-chainlink-light-blue px-3 py-1 rounded text-chainlink-dark">
              LINK: {formattedLink}
            </span>
          </>
        )}
        <ConnectButton />
      </div>
    </header>
  );
}
