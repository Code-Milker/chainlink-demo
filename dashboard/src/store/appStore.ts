import { create } from "zustand";
import { persist } from "zustand/middleware";
type AppState = {
  deployedVaults: { [userAddress: string]: string[] };
  selectedVault: string | null;
  selectedSection: "dashboard" | "admin" | "user" | "about";
  addVault: (userAddress: string, vaultAddress: string) => void;
  setSelectedVault: (vault: string) => void;
  setSelectedSection: (
    section: "dashboard" | "admin" | "user" | "about",
  ) => void;
};
export const useAppStore = create(
  persist<AppState>(
    (set, get) => ({
      deployedVaults: {},
      selectedVault: null,
      selectedSection: "dashboard",
      addVault: (userAddress, vaultAddress) => {
        const userVaults = get().deployedVaults[userAddress] || [];
        if (!userVaults.includes(vaultAddress)) {
          set({
            deployedVaults: {
              ...get().deployedVaults,
              [userAddress]: [...userVaults, vaultAddress],
            },
          });
        }
        // Auto-select the new one if none selected
        if (!get().selectedVault) {
          set({ selectedVault: vaultAddress });
        }
      },
      setSelectedVault: (vault) => set({ selectedVault: vault }),
      setSelectedSection: (section) => set({ selectedSection: section }),
    }),
    {
      name: "app-storage", // Key in localStorage
    },
  ),
);
