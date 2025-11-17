import {
  LayoutDashboard,
  BookOpen,
  Shield,
  User,
  Info,
  Code,
  Globe,
} from "lucide-react";
import { useAppStore } from "../store/appStore";
import { useAccount, useChainId } from "wagmi";
export default function Sidebar() {
  const { isConnected, address } = useAccount();
  const chainId: number | undefined = useChainId();
  const { deployedVaults, selectedSection, setSelectedSection } = useAppStore();
  const userVaults =
    address && chainId !== undefined
      ? deployedVaults[`${chainId}_${address}`] || []
      : [];
  const sections = [
    { id: "about", label: "Welcome", icon: Info },
    { id: "deploy", label: "Deployment Controls", icon: Code },
    { id: "admin", label: "Admin Controls", icon: Shield },
    { id: "user", label: "User Controls", icon: User },
    { id: "dashboard", label: "Events", icon: LayoutDashboard },
    { id: "environment", label: "Environment", icon: Globe },
  ];
  return (
    <aside className="hidden md:block w-64 bg-[#0B101C] border-r border-[#0847F7]/30 h-screen p-6 space-y-4 fixed top-0 left-0 overflow-y-auto z-0">
      <nav className="pt-20 space-y-2">
        {sections.map((section) => {
          const disabled =
            (!isConnected && section.id !== "about") ||
            (isConnected &&
              userVaults.length === 0 &&
              ["admin", "user", "dashboard", "environment"].includes(
                section.id,
              ));
          return (
            <button
              key={section.id}
              onClick={() => {
                if (disabled) return;
                setSelectedSection(
                  section.id as
                    | "dashboard"
                    | "admin"
                    | "user"
                    | "about"
                    | "deploy"
                    | "environment",
                );
              }}
              disabled={disabled}
              className={`w-full flex items-center gap-3 py-3 pl-2 rounded-lg text-left transition-all ${
                disabled
                  ? "opacity-50 cursor-not-allowed text-[#8AA6F9]"
                  : selectedSection === section.id
                    ? "bg-[#0847F7] text-[#F8FAFF] shadow-md"
                    : "text-[#8AA6F9] hover:bg-[#0847F7]/30 hover:text-[#F8FAFF]"
              }`}
            >
              <section.icon className="w-5 h-5" />
              {section.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
