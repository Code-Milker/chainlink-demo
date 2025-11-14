import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit"; // Added darkTheme import
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "./config/wagmiConfig.ts";
import "@rainbow-me/rainbowkit/styles.css"; // Required for modal styling/positioning

const queryClient = new QueryClient();

const root = createRoot(document.getElementById("root")!);
root.render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          {" "}
          {/* Added darkTheme for modal */}
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
);

// Apply dark mode class to html root
document.documentElement.classList.add("dark");
