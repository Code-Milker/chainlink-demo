import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "viem";
import { mainnet, arbitrum, sepolia, arbitrumSepolia } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "Chainlink Demo Dashboard",
  projectId: "4d10c1627ea643cbafa23aa073d2c8b7", // From walletconnect.com
  chains: [mainnet, arbitrum, sepolia, arbitrumSepolia],
  transports: {
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
    [sepolia.id]: http(),
    [arbitrumSepolia.id]: http(),
  },
});
