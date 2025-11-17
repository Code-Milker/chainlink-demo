import { create } from "zustand";
import { persist } from "zustand/middleware";
type AppState = {
  deployedVaults: { [key: string]: string[] };
  selectedVault: string | null;
  selectedSection: "dashboard" | "admin" | "user" | "about" | "deploy";
  addVault: (
    userAddress: string,
    vaultAddress: string,
    chainId: number,
  ) => void;
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
      addVault: (userAddress, vaultAddress, chainId) => {
        const key = `${chainId}_${userAddress}`;
        const userVaults = get().deployedVaults[key] || [];
        if (!userVaults.includes(vaultAddress)) {
          set({
            deployedVaults: {
              ...get().deployedVaults,
              [key]: [...userVaults, vaultAddress],
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
