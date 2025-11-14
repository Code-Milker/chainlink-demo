import { useState, useEffect } from "react";
import "./App.css";
import Header from "./components/Header.tsx";
import {
  useConnectModal,
  useAccountModal,
  useChainModal,
} from "@rainbow-me/rainbowkit"; // Add these hooks

function App() {
  const [count, setCount] = useState(0);
  const { connectModalOpen } = useConnectModal();
  const { accountModalOpen } = useAccountModal();
  const { chainModalOpen } = useChainModal();

  // Detect if any modal is open and toggle body class
  useEffect(() => {
    const isAnyModalOpen =
      connectModalOpen || accountModalOpen || chainModalOpen;
    if (isAnyModalOpen) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
  }, [connectModalOpen, accountModalOpen, chainModalOpen]);

  return (
    <div className="dark:bg-chainlink-dark dark:text-chainlink-light min-h-screen">
      <Header />
      <div className="p-4">o (Sample content in dark mode)</div>
    </div>
  );
}

export default App;
