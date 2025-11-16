// dashboard/src/components/Sidebar.tsx
import { LayoutDashboard, BookOpen, Shield, User, Info } from "lucide-react";
import { useAppStore } from "../store/appStore";

export default function Sidebar() {
  const { selectedSection, setSelectedSection } = useAppStore();

  const sections = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "read", label: "Read", icon: BookOpen },
    { id: "admin", label: "Admin", icon: Shield },
    { id: "user", label: "User", icon: User },
    { id: "about", label: "About Demo", icon: Info },
  ];

  return (
    <aside className="w-64 bg-[#0B101C]/80 border-r border-[#0847F7]/30 h-screen p-6 space-y-4 fixed top-0 left-0 overflow-y-auto z-0">
      <h2 className="text-2xl font-bold text-[#F8FAFF] mb-8">Navigation</h2>
      <nav className="space-y-2">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() =>
              setSelectedSection(
                section.id as "dashboard" | "read" | "admin" | "user" | "about",
              )
            }
            className={`w-full flex items-center gap-3 py-3 px-4 rounded-lg text-left transition-all ${
              selectedSection === section.id
                ? "bg-[#0847F7] text-[#F8FAFF] shadow-md"
                : "text-[#8AA6F9] hover:bg-[#0847F7]/30 hover:text-[#F8FAFF]"
            }`}
          >
            <section.icon className="w-5 h-5" />
            {section.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
