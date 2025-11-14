import { create } from "zustand";
import { persist } from "zustand/middleware";

type AppState = {
  deployedVaults: { [userAddress: string]: string[] };
  selectedVault: string | null;
  addVault: (userAddress: string, vaultAddress: string) => void;
  setSelectedVault: (vault: string) => void;
};

export const useAppStore = create(
  persist<AppState>(
    (set, get) => ({
      deployedVaults: {},
      selectedVault: null,
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
    }),
    {
      name: "app-storage", // Key in localStorage
    },
  ),
);
