// dashboard/src/components/tabs/AdminTab.tsx
import { useState, useEffect } from "react";
import {
  useWriteContract,
  useReadContract,
  useAccount,
  useWatchContractEvent,
} from "wagmi";
import { keccak256, toHex } from "viem";
import {
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  PlayCircle,
  ShieldOff,
  Shield,
} from "lucide-react";
import TokenVaultArtifact from "../../../assets/abis/TokenVault.json";
const abi = TokenVaultArtifact.abi;
const PRICE_SETTER_ROLE = keccak256(toHex("PRICE_SETTER_ROLE"));
const DEFAULT_ADMIN_ROLE =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
export default function AdminTab({
  vaultAddress,
}: {
  vaultAddress: `0x${string}`;
}) {
  const { address } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const [activeSection, setActiveSection] = useState<
    "config" | "security" | "fulfill" | "roles"
  >("config");
  // States for inputs (same as before)
  const [newPrice, setNewPrice] = useState("");
  const [newFee, setNewFee] = useState("");
  const [freezeAddr, setFreezeAddr] = useState("");
  const [unfreezeAddr, setUnfreezeAddr] = useState("");
  const [depositAssets, setDepositAssets] = useState("");
  const [depositReceiver, setDepositReceiver] = useState("");
  const [depositDelegate, setDepositDelegate] = useState("");
  const [mintShares, setMintShares] = useState("");
  const [mintReceiver, setMintReceiver] = useState("");
  const [mintDelegate, setMintDelegate] = useState("");
  const [withdrawAssets, setWithdrawAssets] = useState("");
  const [withdrawReceiver, setWithdrawReceiver] = useState("");
  const [withdrawDelegate, setWithdrawDelegate] = useState("");
  const [redeemShares, setRedeemShares] = useState("");
  const [redeemReceiver, setRedeemReceiver] = useState("");
  const [redeemDelegate, setRedeemDelegate] = useState("");
  const [claimDepositDelegate, setClaimDepositDelegate] = useState("");
  const [claimRedeemDelegate, setClaimRedeemDelegate] = useState("");
  const [roleAccount, setRoleAccount] = useState("");
  const [selectedRole, setSelectedRole] = useState(PRICE_SETTER_ROLE);
  const [grantRevoke, setGrantRevoke] = useState(true);
  // Reads for intuition
  const { data: hasPriceSetter } = useReadContract({
    address: vaultAddress,
    abi,
    functionName: "hasRole",
    args: [PRICE_SETTER_ROLE, address],
  });
  const { data: hasAdmin } = useReadContract({
    address: vaultAddress,
    abi,
    functionName: "hasRole",
    args: [DEFAULT_ADMIN_ROLE, address],
  });
  const { data: isPaused, refetch: refetchPaused } = useReadContract({
    address: vaultAddress,
    abi,
    functionName: "paused",
  });
  const { data: currentFee } = useReadContract({
    address: vaultAddress,
    abi,
    functionName: "fee",
  });
  const { data: currentPrice } = useReadContract({
    address: vaultAddress,
    abi,
    functionName: "getPrice",
  });
  // Watch events for real-time refresh (e.g., after pause)
  useWatchContractEvent({
    address: vaultAddress,
    abi,
    eventName: "Paused",
    onLogs: () => refetchPaused(),
  });
  useWatchContractEvent({
    address: vaultAddress,
    abi,
    eventName: "Unpaused",
    onLogs: () => refetchPaused(),
  });
  // Set initial slider value to current fee
  useEffect(() => {
    if (currentFee !== undefined) {
      setNewFee(currentFee.toString());
    }
  }, [currentFee]);
  // Set initial price input to current price (optional, if you want to edit from current)
  useEffect(() => {
    if (currentPrice !== undefined) {
      setNewPrice(currentPrice.toString());
    }
  }, [currentPrice]);
  const navItems = [
    {
      id: "config",
      label: "Config",
      icon: (
        <div className="w-5 h-5 rounded-full bg-[#4A21C2]/20 border border-[#4A21C2]" />
      ),
    },
    {
      id: "security",
      label: "Security",
      icon: (
        <div className="w-5 h-5 rounded-full bg-[#E54918]/20 border border-[#E54918]" />
      ),
    },
    {
      id: "fulfill",
      label: "Fulfill",
      icon: (
        <div className="w-5 h-5 rounded-full bg-[#217B71]/20 border border-[#217B71]" />
      ),
    },
    {
      id: "roles",
      label: "Roles",
      icon: (
        <div className="w-5 h-5 rounded-full bg-[#0847F7]/20 border border-[#0847F7]" />
      ),
    },
  ];
  // Handlers (same as before)
  const handleSetPrice = () => {
    if (!newPrice) return;
    writeContract({
      address: vaultAddress,
      abi,
      functionName: "setPrice",
      args: [BigInt(newPrice)],
    });
  };
  const handleSetFee = () => {
    if (!newFee) return;
    writeContract({
      address: vaultAddress,
      abi,
      functionName: "setFee",
      args: [BigInt(newFee)],
    });
  };
  const handleTogglePause = () => {
    writeContract({
      address: vaultAddress,
      abi,
      functionName: isPaused ? "unpause" : "pause",
    });
  };
  const handleFreeze = () => {
    if (!freezeAddr) return;
    writeContract({
      address: vaultAddress,
      abi,
      functionName: "freezeAccount",
      args: [freezeAddr],
    });
  };
  const handleUnfreeze = () => {
    if (!unfreezeAddr) return;
    writeContract({
      address: vaultAddress,
      abi,
      functionName: "unfreezeAccount",
      args: [unfreezeAddr],
    });
  };
  const handleDepositFulfill = () => {
    if (!depositAssets || !depositReceiver || !depositDelegate) return;
    writeContract({
      address: vaultAddress,
      abi,
      functionName: "deposit",
      args: [BigInt(depositAssets), depositReceiver, depositDelegate],
    });
  };
  const handleMintFulfill = () => {
    if (!mintShares || !mintReceiver || !mintDelegate) return;
    writeContract({
      address: vaultAddress,
      abi,
      functionName: "mint",
      args: [BigInt(mintShares), mintReceiver, mintDelegate],
    });
  };
  const handleWithdrawFulfill = () => {
    if (!withdrawAssets || !withdrawReceiver || !withdrawDelegate) return;
    writeContract({
      address: vaultAddress,
      abi,
      functionName: "withdraw",
      args: [BigInt(withdrawAssets), withdrawReceiver, withdrawDelegate],
    });
  };
  const handleRedeemFulfill = () => {
    if (!redeemShares || !redeemReceiver || !redeemDelegate) return;
    writeContract({
      address: vaultAddress,
      abi,
      functionName: "redeem",
      args: [BigInt(redeemShares), redeemReceiver, redeemDelegate],
    });
  };
  const handleMakeDepositClaimable = () => {
    if (!claimDepositDelegate) return;
    writeContract({
      address: vaultAddress,
      abi,
      functionName: "makeDepositClaimable",
      args: [claimDepositDelegate],
    });
  };
  const handleMakeRedeemClaimable = () => {
    if (!claimRedeemDelegate) return;
    writeContract({
      address: vaultAddress,
      abi,
      functionName: "makeRedeemClaimable",
      args: [claimRedeemDelegate],
    });
  };
  const handleRoleAction = () => {
    if (!roleAccount) return;
    writeContract({
      address: vaultAddress,
      abi,
      functionName: grantRevoke ? "grantRole" : "revokeRole",
      args: [selectedRole, roleAccount],
    });
  };
  if (!hasAdmin && !hasPriceSetter) {
    return (
      <div className="bg-[#0B101C]/80 backdrop-blur-sm border border-[#0847F7]/30 rounded-2xl p-8">
        <p className="text-[#F8FAFF] text-center">
          You do not have admin privileges.
        </p>
      </div>
    );
  }
  return (
    <div className="bg-[#0B101C]/80 backdrop-blur-sm border border-[#0847F7]/30 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0847F7]/20 to-[#8AA6F9]/10 px-8 py-6 border-b border-[#0847F7]/30">
        <h2 className="text-2xl font-bold text-[#F8FAFF] flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0847F7]/20 rounded-xl flex items-center justify-center">
            🔒
          </div>
          Admin Portal
        </h2>
        <p className="text-[#F2EBE0] mt-1">
          Manage configurations, security, fulfillments, and roles
        </p>
      </div>
      <div className="p-8">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8 bg-[#0B101C]/60 p-1.5 rounded-xl border border-[#0847F7]/30">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as any)}
              className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-lg font-medium transition-all ${activeSection === item.id ? "bg-[#0847F7] text-[#F8FAFF] shadow-lg" : "text-[#8AA6F9] hover:text-[#F8FAFF] hover:bg-[#0847F7]/30"}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
        {/* Config Section */}
        {activeSection === "config" && (
          <div className="space-y-6">
            <div className="bg-[#0B101C]/60 border border-[#4A21C2]/30 rounded-xl p-6">
              <h3 className="text-xl font-bold text-[#4A21C2] mb-6">
                Configuration
              </h3>
              {hasPriceSetter && (
                <div className="space-y-4 mb-6">
                  <div className="text-right text-sm text-[#8AA6F9]">
                    Current Price:{" "}
                    {currentPrice ? currentPrice.toString() : "Loading"}
                  </div>
                  <label className="flex items-center gap-1 text-sm font-medium text-[#8AA6F9] mb-2">
                    Set New Price
                    <div className="group relative">
                      <HelpCircle className="w-4 h-4 text-[#F7B808]/70" />
                      <div className="absolute hidden group-hover:block bg-[#0B101C] p-2 rounded shadow-lg text-xs text-[#F2EBE0] w-48 -top-2 left-6">
                        Update the NAV price (role-restricted).
                      </div>
                    </div>
                  </label>
                  <input
                    type="text"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] placeholder-[#8AA6F9]/50 focus:border-[#0847F7] focus:outline-none text-lg"
                    placeholder="0"
                  />
                  <button
                    onClick={handleSetPrice}
                    disabled={!newPrice || isPending}
                    className="w-full bg-gradient-to-r from-[#217B71] to-[#4A21C2] text-[#F8FAFF] font-bold py-5 rounded-xl hover:from-[#217B71]/80 hover:to-[#4A21C2]/80 transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
                  >
                    {isPending ? "Confirming..." : "Set Price"}
                    {!isPending && <CheckCircle2 className="w-6 h-6" />}
                  </button>
                </div>
              )}
              {hasAdmin && (
                <div className="space-y-4">
                  <div className="text-right text-sm text-[#8AA6F9]">
                    Current Fee:{" "}
                    {currentFee ? currentFee.toString() : "Loading"} bps
                  </div>
                  <label className="flex items-center gap-1 text-sm font-medium text-[#8AA6F9] mb-2">
                    Set Fee (0-1000 basis points)
                    <div className="group relative">
                      <HelpCircle className="w-4 h-4 text-[#F7B808]/70" />
                      <div className="absolute hidden group-hover:block bg-[#0B101C] p-2 rounded shadow-lg text-xs text-[#F2EBE0] w-48 -top-2 left-6">
                        Update in basis points (0-100%).
                      </div>
                    </div>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    value={newFee}
                    onChange={(e) => setNewFee(e.target.value)}
                    className="w-full h-2 bg-[#0847F7]/30 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #217B71 ${(Number(newFee) / 1000) * 100}%, #0847F7/30 ${(Number(newFee) / 1000) * 100}%)`,
                    }}
                  />
                  <p className="text-[#F8FAFF] text-center">
                    New Fee: {newFee} bps
                  </p>
                  <button
                    onClick={handleSetFee}
                    disabled={!newFee || isPending}
                    className="w-full bg-gradient-to-r from-[#217B71] to-[#4A21C2] text-[#F8FAFF] font-bold py-5 rounded-xl hover:from-[#217B71]/80 hover:to-[#4A21C2]/80 transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
                  >
                    {isPending ? "Confirming..." : "Set Fee"}
                    {!isPending && <CheckCircle2 className="w-6 h-6" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Security Section */}
        {activeSection === "security" && hasAdmin && (
          <div className="space-y-6">
            <div className="bg-[#0B101C]/60 border border-[#E54918]/30 rounded-xl p-6">
              <h3 className="text-xl font-bold text-[#E54918] mb-6">
                Security Controls
              </h3>
              <div className="space-y-4 mb-6">
                <button
                  onClick={handleTogglePause}
                  disabled={isPending}
                  className={`w-full flex items-center justify-center gap-3 text-lg font-bold py-5 rounded-xl transition-all disabled:opacity-50 ${
                    isPaused
                      ? "bg-gradient-to-r from-[#217B71] to-[#4A21C2] text-[#F8FAFF] hover:from-[#217B71]/80 hover:to-[#4A21C2]/80"
                      : "bg-gradient-to-r from-[#E54918] to-[#F7B808]/50 text-[#F8FAFF] hover:from-[#E54918]/80 hover:to-[#F7B808]/30"
                  }`}
                >
                  {isPending
                    ? "Confirming..."
                    : isPaused
                      ? "Unpause Contract"
                      : "Pause Contract"}
                  {!isPending &&
                    (isPaused ? (
                      <PlayCircle className="w-6 h-6" />
                    ) : (
                      <PauseCircle className="w-6 h-6" />
                    ))}
                </button>
              </div>
              <div className="space-y-4 mb-6">
                <label className="flex items-center gap-1 text-sm font-medium text-[#8AA6F9] mb-2">
                  Freeze Account
                  <div className="group relative">
                    <HelpCircle className="w-4 h-4 text-[#F7B808]/70" />
                    <div className="absolute hidden group-hover:block bg-[#0B101C] p-2 rounded shadow-lg text-xs text-[#F2EBE0] w-48 -top-2 left-6">
                      Block transfers for a specific account.
                    </div>
                  </div>
                </label>
                <input
                  type="text"
                  value={freezeAddr}
                  onChange={(e) => setFreezeAddr(e.target.value)}
                  className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] placeholder-[#8AA6F9]/50 focus:border-[#0847F7] focus:outline-none text-lg"
                  placeholder="0x..."
                />
                <button
                  onClick={handleFreeze}
                  disabled={!freezeAddr || isPending}
                  className="w-full bg-gradient-to-r from-[#217B71] to-[#4A21C2] text-[#F8FAFF] font-bold py-5 rounded-xl hover:from-[#217B71]/80 hover:to-[#4A21C2]/80 transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
                >
                  {isPending ? "Confirming..." : "Freeze Account"}
                  {!isPending && (
                    <ShieldOff className="w-6 h-6 text-[#E54918]" />
                  )}
                </button>
              </div>
              <div className="space-y-4">
                <label className="flex items-center gap-1 text-sm font-medium text-[#8AA6F9] mb-2">
                  Unfreeze Account
                  <div className="group relative">
                    <HelpCircle className="w-4 h-4 text-[#F7B808]/70" />
                    <div className="absolute hidden group-hover:block bg-[#0B101C] p-2 rounded shadow-lg text-xs text-[#F2EBE0] w-48 -top-2 left-6">
                      Restore transfers for a frozen account.
                    </div>
                  </div>
                </label>
                <input
                  type="text"
                  value={unfreezeAddr}
                  onChange={(e) => setUnfreezeAddr(e.target.value)}
                  className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] placeholder-[#8AA6F9]/50 focus:border-[#0847F7] focus:outline-none text-lg"
                  placeholder="0x..."
                />
                <button
                  onClick={handleUnfreeze}
                  disabled={!unfreezeAddr || isPending}
                  className="w-full bg-gradient-to-r from-[#217B71] to-[#4A21C2] text-[#F8FAFF] font-bold py-5 rounded-xl hover:from-[#217B71]/80 hover:to-[#4A21C2]/80 transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
                >
                  {isPending ? "Confirming..." : "Unfreeze Account"}
                  {!isPending && <Shield className="w-6 h-6 text-[#217B71]" />}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Fulfill Section */}
        {activeSection === "fulfill" && (
          <div className="space-y-6">
            <div className="bg-[#0B101C]/60 border border-[#217B71]/30 rounded-xl p-6">
              <h3 className="text-xl font-bold text-[#217B71] mb-6">
                Fulfillment Controls
              </h3>
              {/* Deposit Fulfill */}
              <div className="space-y-4 mb-8">
                <h4 className="text-lg font-semibold text-[#F8FAFF]">
                  Deposit Fulfill
                </h4>
                <input
                  type="text"
                  value={depositAssets}
                  onChange={(e) => setDepositAssets(e.target.value)}
                  className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] placeholder-[#8AA6F9]/50 focus:border-[#0847F7] focus:outline-none text-lg"
                  placeholder="Assets amount"
                />
                <input
                  type="text"
                  value={depositReceiver}
                  onChange={(e) => setDepositReceiver(e.target.value)}
                  className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] placeholder-[#8AA6F9]/50 focus:border-[#0847F7] focus:outline-none text-lg"
                  placeholder="Receiver address"
                />
                <input
                  type="text"
                  value={depositDelegate}
                  onChange={(e) => setDepositDelegate(e.target.value)}
                  className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] placeholder-[#8AA6F9]/50 focus:border-[#0847F7] focus:outline-none text-lg"
                  placeholder="Delegate address"
                />
                <button
                  onClick={handleDepositFulfill}
                  disabled={
                    !depositAssets ||
                    !depositReceiver ||
                    !depositDelegate ||
                    isPending
                  }
                  className="w-full bg-gradient-to-r from-[#217B71] to-[#4A21C2] text-[#F8FAFF] font-bold py-5 rounded-xl hover:from-[#217B71]/80 hover:to-[#4A21C2]/80 transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
                >
                  {isPending ? "Confirming..." : "Fulfill Deposit"}
                  {!isPending && <CheckCircle2 className="w-6 h-6" />}
                </button>
              </div>

              {/* Mint Fulfill */}
              <div className="space-y-4 mb-8">
                <h4 className="text-lg font-semibold text-[#F8FAFF]">
                  Mint Fulfill
                </h4>
                <input
                  type="text"
                  value={mintShares}
                  onChange={(e) => setMintShares(e.target.value)}
                  className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] placeholder-[#8AA6F9]/50 focus:border-[#0847F7] focus:outline-none text-lg"
                  placeholder="Shares amount"
                />
                <input
                  type="text"
                  value={mintReceiver}
                  onChange={(e) => setMintReceiver(e.target.value)}
                  className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] placeholder-[#8AA6F9]/50 focus:border-[#0847F7] focus:outline-none text-lg"
                  placeholder="Receiver address"
                />
                <input
                  type="text"
                  value={mintDelegate}
                  onChange={(e) => setMintDelegate(e.target.value)}
                  className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] placeholder-[#8AA6F9]/50 focus:border-[#0847F7] focus:outline-none text-lg"
                  placeholder="Delegate address"
                />
                <button
                  onClick={handleMintFulfill}
                  disabled={
                    !mintShares || !mintReceiver || !mintDelegate || isPending
                  }
                  className="w-full bg-gradient-to-r from-[#217B71] to-[#4A21C2] text-[#F8FAFF] font-bold py-5 rounded-xl hover:from-[#217B71]/80 hover:to-[#4A21C2]/80 transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
                >
                  {isPending ? "Confirming..." : "Fulfill Mint"}
                  {!isPending && <CheckCircle2 className="w-6 h-6" />}
                </button>
              </div>

              {/* Withdraw Fulfill */}
              <div className="space-y-4 mb-8">
                <h4 className="text-lg font-semibold text-[#F8FAFF]">
                  Withdraw Fulfill
                </h4>
                <input
                  type="text"
                  value={withdrawAssets}
                  onChange={(e) => setWithdrawAssets(e.target.value)}
                  className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] placeholder-[#8AA6F9]/50 focus:border-[#0847F7] focus:outline-none text-lg"
                  placeholder="Assets amount"
                />
                <input
                  type="text"
                  value={withdrawReceiver}
                  onChange={(e) => setWithdrawReceiver(e.target.value)}
                  className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] placeholder-[#8AA6F9]/50 focus:border-[#0847F7] focus:outline-none text-lg"
                  placeholder="Receiver address"
                />
                <input
                  type="text"
                  value={withdrawDelegate}
                  onChange={(e) => setWithdrawDelegate(e.target.value)}
                  className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] placeholder-[#8AA6F9]/50 focus:border-[#0847F7] focus:outline-none text-lg"
                  placeholder="Delegate address"
                />
                <button
                  onClick={handleWithdrawFulfill}
                  disabled={
                    !withdrawAssets ||
                    !withdrawReceiver ||
                    !withdrawDelegate ||
                    isPending
                  }
                  className="w-full bg-gradient-to-r from-[#217B71] to-[#4A21C2] text-[#F8FAFF] font-bold py-5 rounded-xl hover:from-[#217B71]/80 hover:to-[#4A21C2]/80 transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
                >
                  {isPending ? "Confirming..." : "Fulfill Withdraw"}
                  {!isPending && <CheckCircle2 className="w-6 h-6" />}
                </button>
              </div>

              {/* Redeem Fulfill */}
              <div className="space-y-4 mb-8">
                <h4 className="text-lg font-semibold text-[#F8FAFF]">
                  Redeem Fulfill
                </h4>
                <input
                  type="text"
                  value={redeemShares}
                  onChange={(e) => setRedeemShares(e.target.value)}
                  className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] placeholder-[#8AA6F9]/50 focus:border-[#0847F7] focus:outline-none text-lg"
                  placeholder="Shares amount"
                />
                <input
                  type="text"
                  value={redeemReceiver}
                  onChange={(e) => setRedeemReceiver(e.target.value)}
                  className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] placeholder-[#8AA6F9]/50 focus:border-[#0847F7] focus:outline-none text-lg"
                  placeholder="Receiver address"
                />
                <input
                  type="text"
                  value={redeemDelegate}
                  onChange={(e) => setRedeemDelegate(e.target.value)}
                  className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] placeholder-[#8AA6F9]/50 focus:border-[#0847F7] focus:outline-none text-lg"
                  placeholder="Delegate address"
                />
                <button
                  onClick={handleRedeemFulfill}
                  disabled={
                    !redeemShares ||
                    !redeemReceiver ||
                    !redeemDelegate ||
                    isPending
                  }
                  className="w-full bg-gradient-to-r from-[#217B71] to-[#4A21C2] text-[#F8FAFF] font-bold py-5 rounded-xl hover:from-[#217B71]/80 hover:to-[#4A21C2]/80 transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
                >
                  {isPending ? "Confirming..." : "Fulfill Redeem"}
                  {!isPending && <CheckCircle2 className="w-6 h-6" />}
                </button>
              </div>

              {/* Make Deposit Claimable */}
              <div className="space-y-4 mb-8">
                <h4 className="text-lg font-semibold text-[#F8FAFF]">
                  Make Deposit Claimable
                </h4>
                <input
                  type="text"
                  value={claimDepositDelegate}
                  onChange={(e) => setClaimDepositDelegate(e.target.value)}
                  className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] placeholder-[#8AA6F9]/50 focus:border-[#0847F7] focus:outline-none text-lg"
                  placeholder="Delegate address"
                />
                <button
                  onClick={handleMakeDepositClaimable}
                  disabled={!claimDepositDelegate || isPending}
                  className="w-full bg-gradient-to-r from-[#217B71] to-[#4A21C2] text-[#F8FAFF] font-bold py-5 rounded-xl hover:from-[#217B71]/80 hover:to-[#4A21C2]/80 transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
                >
                  {isPending ? "Confirming..." : "Make Claimable"}
                  {!isPending && <CheckCircle2 className="w-6 h-6" />}
                </button>
              </div>

              {/* Make Redeem Claimable */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-[#F8FAFF]">
                  Make Redeem Claimable
                </h4>
                <input
                  type="text"
                  value={claimRedeemDelegate}
                  onChange={(e) => setClaimRedeemDelegate(e.target.value)}
                  className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] placeholder-[#8AA6F9]/50 focus:border-[#0847F7] focus:outline-none text-lg"
                  placeholder="Delegate address"
                />
                <button
                  onClick={handleMakeRedeemClaimable}
                  disabled={!claimRedeemDelegate || isPending}
                  className="w-full bg-gradient-to-r from-[#217B71] to-[#4A21C2] text-[#F8FAFF] font-bold py-5 rounded-xl hover:from-[#217B71]/80 hover:to-[#4A21C2]/80 transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
                >
                  {isPending ? "Confirming..." : "Make Claimable"}
                  {!isPending && <CheckCircle2 className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Roles Section */}
        {activeSection === "roles" && (
          <div className="space-y-6">
            <div className="bg-[#0B101C]/60 border border-[#0847F7]/30 rounded-xl p-6">
              <h3 className="text-xl font-bold text-[#0847F7] mb-6">
                Role Management
              </h3>
              <div className="space-y-4">
                <label className="flex items-center gap-1 text-sm font-medium text-[#8AA6F9] mb-2">
                  Select Role
                  <div className="group relative">
                    <HelpCircle className="w-4 h-4 text-[#F7B808]/70" />
                    <div className="absolute hidden group-hover:block bg-[#0B101C] p-2 rounded shadow-lg text-xs text-[#F2EBE0] w-48 -top-2 left-6">
                      Choose the role to grant or revoke.
                    </div>
                  </div>
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] focus:border-[#0847F7] focus:outline-none text-lg"
                >
                  <option value={PRICE_SETTER_ROLE}>Price Setter Role</option>
                  <option value={DEFAULT_ADMIN_ROLE}>Default Admin Role</option>
                </select>

                <label className="flex items-center gap-1 text-sm font-medium text-[#8AA6F9] mb-2">
                  Account Address
                  <div className="group relative">
                    <HelpCircle className="w-4 h-4 text-[#F7B808]/70" />
                    <div className="absolute hidden group-hover:block bg-[#0B101C] p-2 rounded shadow-lg text-xs text-[#F2EBE0] w-48 -top-2 left-6">
                      Address to grant/revoke the role for.
                    </div>
                  </div>
                </label>
                <input
                  type="text"
                  value={roleAccount}
                  onChange={(e) => setRoleAccount(e.target.value)}
                  className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] placeholder-[#8AA6F9]/50 focus:border-[#0847F7] focus:outline-none text-lg"
                  placeholder="0x..."
                />

                <label className="flex items-center gap-1 text-sm font-medium text-[#8AA6F9] mb-2">
                  Action
                  <div className="group relative">
                    <HelpCircle className="w-4 h-4 text-[#F7B808]/70" />
                    <div className="absolute hidden group-hover:block bg-[#0B101C] p-2 rounded shadow-lg text-xs text-[#F2EBE0] w-48 -top-2 left-6">
                      Choose to grant or revoke the selected role.
                    </div>
                  </div>
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setGrantRevoke(true)}
                    className={`flex-1 py-3 rounded-xl font-medium text-lg ${
                      grantRevoke
                        ? "bg-[#0847F7] text-[#F8FAFF]"
                        : "bg-[#0B101C]/40 text-[#8AA6F9] border border-[#0847F7]/50"
                    }`}
                  >
                    Grant
                  </button>
                  <button
                    onClick={() => setGrantRevoke(false)}
                    className={`flex-1 py-3 rounded-xl font-medium text-lg ${
                      !grantRevoke
                        ? "bg-[#0847F7] text-[#F8FAFF]"
                        : "bg-[#0B101C]/40 text-[#8AA6F9] border border-[#0847F7]/50"
                    }`}
                  >
                    Revoke
                  </button>
                </div>

                <button
                  onClick={handleRoleAction}
                  disabled={!roleAccount || isPending}
                  className="w-full bg-gradient-to-r from-[#217B71] to-[#4A21C2] text-[#F8FAFF] font-bold py-5 rounded-xl hover:from-[#217B71]/80 hover:to-[#4A21C2]/80 transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
                >
                  {isPending
                    ? "Confirming..."
                    : `${grantRevoke ? "Grant" : "Revoke"} Role`}
                  {!isPending && <CheckCircle2 className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
