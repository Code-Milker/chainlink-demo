import {
  Code,
  Layers,
  ShieldCheck,
  Database,
  Globe,
  Zap,
  BookOpen,
  CheckCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import { useAppStore } from "../../store/appStore";
import { useAccount } from "wagmi";
export default function AboutTab() {
  const { setSelectedSection } = useAppStore();
  const { isConnected } = useAccount();
  return (
    <div className="bg-[#0B101C]/80 backdrop-blur-sm border border-[#0847F7]/30 rounded-2xl p-8">
      <div className="max-w-3xl mx-auto space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-[#F8FAFF] bg-gradient-to-r from-[#0847F7] to-[#8AA6F9] bg-clip-text text-transparent">
            Chainlink Token Vault Demo
          </h2>
          <p className="text-xl text-[#8AA6F9]">
            A showcase of asynchronous RWA tokenization integrated with
            Chainlink's Automation
          </p>
        </div>
        {/* Overview Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-[#0847F7]" />
            <h3 className="text-2xl font-bold text-[#F8FAFF]">
              Project Overview
            </h3>
          </div>
          <div className="bg-[#0B101C]/60 border border-[#0847F7]/20 rounded-xl p-6 space-y-4 text-[#8AA6F9]">
            <p>
              This demo illustrates a sophisticated Token Vault system for
              managing Real-World Assets (RWAs) asynchronously. Built in
              approximately 12 hours, it demonstrates rapid prototyping
              capabilities while integrating complex and multichain blockchain
              components.
            </p>
            <p>
              Users deposit assets, triggering Chainlink Automation to verify
              permissions and mint wrapped tokens. The system supports
              cross-chain potential via CCIP and fine-grained oracle control
              through external adapters.
            </p>
            <p>
              The architecture combines secure smart contracts with a responsive
              frontend, adhering to EIP-7540 for asynchronous vaults and best
              practices in blockchain development.
            </p>
            <p>
              The smart contracts integrate with Chainlink Automation for
              event-triggered fulfillment of deposit and redeem requests,
              ensuring secure and automated processing.
            </p>
            <p>
              View the source code on GitHub:{" "}
              <a
                href="https://github.com/Code-Milker/chainlink-demo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0847F7] hover:underline"
              >
                https://github.com/Code-Milker/chainlink-demo
              </a>
              . This repository, started on November 13th, 2025, contains two
              main components:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                The React app: A frontend dashboard for interacting with the
                Token Vault, including deployment, admin controls, user
                operations, and event monitoring.
              </li>
              <li>
                The contracts environment: Hardhat-based smart contracts setup
                with the TokenVault implementation, tests, and deployment
                scripts.
              </li>
            </ul>
          </div>
        </section>
        {/* Technology Stack */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Layers className="w-6 h-6 text-[#0847F7]" />
            <h3 className="text-2xl font-bold text-[#F8FAFF]">
              Technology Stack
            </h3>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[#0B101C]/60 border border-[#0847F7]/20 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-[#217B71]" />
                <h4 className="text-xl font-bold text-[#F8FAFF]">
                  Smart Contracts
                </h4>
              </div>
              <ul className="space-y-3 text-[#8AA6F9]">
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#4A21C2] mt-1" />
                  <span>
                    OpenZeppelin: Secure ERC-4626 vaults, access controls, and
                    utilities
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="w-4 h-4 text-[#4A21C2] mt-1" />
                  <span>
                    Chainlink: Automation via ILogAutomation for event-triggered
                    fulfillment
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <BookOpen className="w-4 h-4 text-[#4A21C2] mt-1" />
                  <span>
                    Solidity 0.8.20 with math libraries for precise calculations
                  </span>
                </li>
              </ul>
            </div>
            <div className="bg-[#0B101C]/60 border border-[#0847F7]/20 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-[#217B71]" />
                <h4 className="text-xl font-bold text-[#F8FAFF]">Frontend</h4>
              </div>
              <ul className="space-y-3 text-[#8AA6F9]">
                <li className="flex items-start gap-2">
                  <Zap className="w-4 h-4 text-[#4A21C2] mt-1" />
                  <span>Wagmi & Viem: Blockchain interactions and hooks</span>
                </li>
                <li className="flex items-start gap-2">
                  <Globe className="w-4 h-4 text-[#4A21C2] mt-1" />
                  <span>RainbowKit: Wallet connections with dark theme</span>
                </li>
                <li className="flex items-start gap-2">
                  <Database className="w-4 h-4 text-[#4A21C2] mt-1" />
                  <span>
                    Zustand & React Query: State management and data caching
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Layers className="w-4 h-4 text-[#4A21C2] mt-1" />
                  <span>
                    HeadlessUI & Tailwind: Accessible components and styling
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>
        {/* Key Features */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-[#0847F7]" />
            <h3 className="text-2xl font-bold text-[#F8FAFF]">Key Features</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[#0B101C]/60 border border-[#0847F7]/20 rounded-xl p-6 space-y-4">
              <h4 className="text-xl font-bold text-[#F8FAFF]">
                Contract Capabilities
              </h4>
              <ul className="space-y-3 text-[#8AA6F9]">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#217B71] mt-1" />
                  <span>
                    Asynchronous deposits/redemptions (EIP-7540 compliant)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#217B71] mt-1" />
                  <span>Automated fulfillment via Chainlink Automation</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#217B71] mt-1" />
                  <span>Dynamic NAV pricing and fee management</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#217B71] mt-1" />
                  <span>Role-based access and emergency controls</span>
                </li>
              </ul>
            </div>
            <div className="bg-[#0B101C]/60 border border-[#0847F7]/20 rounded-xl p-6 space-y-4">
              <h4 className="text-xl font-bold text-[#F8FAFF]">
                Frontend Functionality
              </h4>
              <ul className="space-y-3 text-[#8AA6F9]">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#217B71] mt-1" />
                  <span>Wallet integration with balance displays</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#217B71] mt-1" />
                  <span>Contract deployment wizards</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#217B71] mt-1" />
                  <span>Event monitoring dashboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#217B71] mt-1" />
                  <span>Role-specific tabs: Read, Admin, User</span>
                </li>
              </ul>
            </div>
          </div>
        </section>
        {/* Future Enhancements */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-[#0847F7]" />
            <h3 className="text-2xl font-bold text-[#F8FAFF]">
              Future Enhancements
            </h3>
          </div>
          <div className="bg-[#0B101C]/60 border border-[#0847F7]/20 rounded-xl p-6 space-y-4 text-[#8AA6F9]">
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-[#4A21C2] mt-1" />
                <span>Database integration for user and contract tracking</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-[#4A21C2] mt-1" />
                <span>External adapters for advanced oracle control</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-[#4A21C2] mt-1" />
                <span>CCIP for cross-chain token availability</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-[#4A21C2] mt-1" />
                <span>Refined UI with visualizations and analytics</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-[#4A21C2] mt-1" />
                <span>
                  Integration with Chainlink Functions for custom computations
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-[#4A21C2] mt-1" />
                <span>
                  Support for multiple asset types and yield strategies
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-[#4A21C2] mt-1" />
                <span>Multi-chain deployment and management improvements</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-[#4A21C2] mt-1" />
                <span>Enhanced security audits and formal verification</span>
              </li>
            </ul>
          </div>
        </section>
        {/* Call to Action */}
        <div className="text-center">
          <p className="text-lg text-[#8AA6F9] mb-4">
            To get started, deploy your token vault contract now.
          </p>
          <button
            onClick={() => {
              if (!isConnected) {
                // Trigger wallet connection - since ConnectButton is in header, perhaps just alert or switch to deploy anyway
                alert("Please connect your wallet first.");
                return;
              }
              setSelectedSection("deploy");
            }}
            className="bg-gradient-to-r from-[#0847F7] to-[#8AA6F9] text-[#F8FAFF] font-bold py-3 px-6 rounded-xl hover:opacity-80 transition-opacity flex items-center gap-2 mx-auto"
          >
            {isConnected ? "Deploy Now" : "Connect to Deploy"}{" "}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
        {/* Footer */}
        <div className="text-center text-sm text-[#8AA6F9]/70">
          Integrated with Chainlink's ecosystem for secure, automated RWA
          management. Built by Ty Fischer.
        </div>
      </div>
    </div>
  );
}
