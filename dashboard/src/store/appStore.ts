import { create } from "zustand";
import { persist } from "zustand/middleware";
type AppState = {
  deployedERC20: { [key: string]: string[] };
  deployedVaults: { [key: string]: string[] };
  selectedVault: string | null;
  selectedSection:
    | "dashboard"
    | "admin"
    | "user"
    | "about"
    | "environment"
    | "deploy";
  addERC20: (
    userAddress: string,
    erc20Address: string,
    chainId: number,
  ) => void;
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
type PersistedState = Pick<
  AppState,
  "deployedERC20" | "deployedVaults" | "selectedVault"
>;
export const useAppStore = create<
  AppState,
  [["zustand/persist", PersistedState]]
>(
  persist(
    (set, get) => ({
      deployedERC20: {},
      deployedVaults: {},
      selectedVault: null,
      selectedSection: "about",
      addERC20: (userAddress, erc20Address, chainId) => {
        const key = `${chainId}_${userAddress}`;
        const userERC20s = get().deployedERC20[key] || [];
        if (!userERC20s.includes(erc20Address)) {
          set({
            deployedERC20: {
              ...get().deployedERC20,
              [key]: [...userERC20s, erc20Address],
            },
          });
        }
      },
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
        deployedERC20: state.deployedERC20,
        deployedVaults: state.deployedVaults,
        selectedVault: state.selectedVault,
      }),
    },
  ),
);
