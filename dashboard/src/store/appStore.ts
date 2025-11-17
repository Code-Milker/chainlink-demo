import { create } from "zustand";
import { persist } from "zustand/middleware";
type AppState = {
  deployedVaults: { [userAddress: string]: string[] };
  selectedVault: string | null;
  selectedSection: "dashboard" | "admin" | "user" | "about" | "deploy";
  addVault: (userAddress: string, vaultAddress: string) => void;
  setSelectedVault: (vault: string) => void;
  setSelectedSection: (
    section: "dashboard" | "admin" | "user" | "about" | "deploy",
  ) => void;
};
type PersistedState = Pick<AppState, "deployedVaults" | "selectedVault">;
export const useAppStore = create<
  AppState,
  [["zustand/persist", PersistedState]]
>(
  persist(
    (set, get) => ({
      deployedVaults: {},
      selectedVault: null,
      selectedSection: "about",
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
      partialize: (state) => ({
        deployedVaults: state.deployedVaults,
        selectedVault: state.selectedVault,
      }),
    },
  ),
);
