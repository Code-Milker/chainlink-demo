import { useState } from "react";
import "./App.css";
import Header from "./components/Header.tsx";
import { DeployVault } from "./components/DeployVault.tsx";

function App() {
  const [count, setCount] = useState(0);
  return (
    <div className="dark:bg-chainlink-dark dark:text-chainlink-light min-h-screen">
      {" "}
      {/* Dark theme body */}
      <Header />
      <DeployVault />
    </div>
  );
}

export default App;
