import { useState } from "react";
import {
  useReadContract,
  useWriteContract,
  useAccount,
  useBalance,
} from "wagmi";
import { formatEther, parseEther } from "viem";
import {
  HelpCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  UserCheck,
  XCircle,
} from "lucide-react";
import TokenVaultArtifact from "../../assets/abis/TokenVault.json";
import ERC20Artifact from "../../assets/abis/ERC20.json"; // Assuming you have a standard ERC20 ABI

const abi = TokenVaultArtifact.abi;
const erc20Abi = ERC20Artifact.abi; // For fetching symbol

export default function UserTab({
  vaultAddress,
}: {
  vaultAddress: `0x${string}`;
}) {
  const { address: userAddress } = useAccount();
  const { writeContract, isPending } = useWriteContract();

  const [activeSection, setActiveSection] = useState<
    "deposit" | "redeem" | "delegate"
  >("deposit");

  // Shared delegates (avoiding "controller")
  const [delegate, setDelegate] = useState(userAddress || "");
  const [beneficiary, setBeneficiary] = useState(userAddress || "");

  // Form states
  const [depositAmount, setDepositAmount] = useState("");
  const [redeemAmount, setRedeemAmount] = useState("");
  const [delegateAddr, setDelegateAddr] = useState("");
  const [isApproved, setIsApproved] = useState(true);

  // Reads
  const { data: price } = useReadContract({
    abi,
    address: vaultAddress,
    functionName: "getPrice",
  });

  const { data: assetAddress } = useReadContract({
    abi,
    address: vaultAddress,
    functionName: "asset",
  });

  const { data: assetSymbol } = useReadContract({
    abi: erc20Abi,
    address: assetAddress,
    functionName: "symbol",
  });

  const { data: userAssetBalance } = useBalance({
    address: userAddress,
    token: assetAddress,
  });

  const { data: userShares } = useReadContract({
    abi,
    address: vaultAddress,
    functionName: "balanceOf",
    args: [userAddress!],
  });

  const { data: pendingDeposit } = useReadContract({
    abi,
    address: vaultAddress,
    functionName: "pendingDepositRequest",
    args: [0n, userAddress!],
  });

  const { data: pendingRedeem } = useReadContract({
    abi,
    address: vaultAddress,
    functionName: "pendingRedeemRequest",
    args: [0n, userAddress!],
  });

  const navItems = [
    {
      id: "deposit",
      label: "Deposit",
      icon: (
        <div className="w-5 h-5 rounded-full bg-[#217B71]/20 border border-[#217B71]" />
      ),
    }, // Green secondary
    {
      id: "redeem",
      label: "Redeem",
      icon: (
        <div className="w-5 h-5 rounded-full bg-[#0847F7]/20 border border-[#0847F7]" />
      ),
    }, // Blue secondary
    {
      id: "delegate",
      label: "Delegate",
      icon: <UserCheck className="w-5 h-5 text-[#4A21C2]" />,
    }, // Purple secondary
  ];

  const handleDeposit = () => {
    writeContract({
      abi,
      address: vaultAddress,
      functionName: "requestDeposit",
      args: [
        parseEther(depositAmount),
        delegate || userAddress!,
        beneficiary || userAddress!,
      ],
    });
    setDepositAmount("");
  };

  const handleRedeem = () => {
    writeContract({
      abi,
      address: vaultAddress,
      functionName: "requestRedeem",
      args: [
        parseEther(redeemAmount),
        delegate || userAddress!,
        beneficiary || userAddress!,
      ],
    });
    setRedeemAmount("");
  };

  const handleSetDelegate = () => {
    writeContract({
      abi,
      address: vaultAddress,
      functionName: "setOperator",
      args: [delegateAddr as `0x${string}`, isApproved],
    });
    setDelegateAddr("");
  };

  const handleCancelDeposit = () => {
    writeContract({
      abi,
      address: vaultAddress,
      functionName: "cancelDeposit",
      args: [userAddress!], // Assuming user is controller; adjust if needed
    });
  };

  const handleCancelRedeem = () => {
    writeContract({
      abi,
      address: vaultAddress,
      functionName: "cancelRedeem",
      args: [userAddress!],
    });
  };

  const hasPendingDeposit = pendingDeposit?.gt(0);
  const hasPendingRedeem = pendingRedeem?.gt(0);

  return (
    <div className="bg-[#0B101C]/80 backdrop-blur-sm border border-[#0847F7]/30 rounded-2xl overflow-hidden shadow-2xl">
      {" "}
      {/* Dark primary */}
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0847F7]/20 to-[#8AA6F9]/10 px-8 py-6 border-b border-[#0847F7]/30">
        {" "}
        {/* Blue to Light Blue */}
        <h2 className="text-2xl font-bold text-[#F8FAFF] flex items-center gap-3">
          {" "}
          {/* Light */}
          <div className="w-10 h-10 bg-[#0847F7]/20 rounded-xl flex items-center justify-center">
            {" "}
            {/* Chainlink Blue */}
            👤
          </div>
          User Portal
        </h2>
        <p className="text-[#F2EBE0] mt-1">
          Request deposits, redeem shares, or delegate management
        </p>{" "}
        {/* Sand secondary */}
      </div>
      {/* Pending Request Alert */}
      {(hasPendingDeposit || hasPendingRedeem) && (
        <div className="mx-8 mt-6 p-4 bg-[#F7B808]/10 border border-[#F7B808]/50 rounded-xl flex items-center justify-between gap-3">
          {" "}
          {/* Yellow secondary */}
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-[#F7B808]" />
            <div>
              <p className="text-[#F7B808] font-medium">Pending Request</p>
              <p className="text-sm text-[#F2EBE0]/80">
                {" "}
                {/* Sand */}
                {hasPendingDeposit &&
                  `${formatEther(pendingDeposit)} assets pending deposit`}
                {hasPendingDeposit && hasPendingRedeem && " • "}
                {hasPendingRedeem &&
                  `${formatEther(pendingRedeem)} shares pending redeem`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {hasPendingDeposit && (
              <button
                onClick={handleCancelDeposit}
                className="flex items-center gap-2 px-4 py-2 bg-[#E54918]/80 text-[#F8FAFF] rounded-lg hover:bg-[#E54918]"
              >
                Cancel Deposit <XCircle className="w-4 h-4" />
              </button>
            )}
            {hasPendingRedeem && (
              <button
                onClick={handleCancelRedeem}
                className="flex items-center gap-2 px-4 py-2 bg-[#E54918]/80 text-[#F8FAFF] rounded-lg hover:bg-[#E54918]"
              >
                Cancel Redeem <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
      <div className="p-8">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8 bg-[#0B101C]/60 p-1.5 rounded-xl border border-[#0847F7]/30">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as any)}
              className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-lg font-medium transition-all ${
                activeSection === item.id
                  ? "bg-[#0847F7] text-[#F8FAFF] shadow-lg"
                  : "text-[#8AA6F9] hover:text-[#F8FAFF] hover:bg-[#0847F7]/30"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {/* Deposit Section */}
        {activeSection === "deposit" && (
          <div className="space-y-6">
            <div className="bg-[#0B101C]/60 border border-[#217B71]/30 rounded-xl p-6">
              {" "}
              {/* Green border */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-[#217B71]">
                  Request Deposit
                </h3>{" "}
                {/* Green */}
                <div className="text-right text-sm">
                  <p className="text-[#8AA6F9]">Wallet Balance</p>{" "}
                  {/* Light Blue */}
                  <p className="text-xl font-bold text-[#F8FAFF]">
                    {userAssetBalance
                      ? parseFloat(formatEther(userAssetBalance.value)).toFixed(
                          4,
                        )
                      : "0.00"}{" "}
                    {assetSymbol || ""}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#8AA6F9] mb-2">
                    Amount to Deposit
                  </label>
                  <input
                    type="text"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] placeholder-[#8AA6F9]/50 focus:border-[#0847F7] focus:outline-none text-lg"
                    placeholder="0.00"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-1 text-sm font-medium text-[#8AA6F9] mb-2">
                      Delegate Address
                      <div className="group relative">
                        <HelpCircle className="w-4 h-4 text-[#F7B808]/70" />
                        <div className="absolute hidden group-hover:block bg-[#0B101C] p-2 rounded shadow-lg text-xs text-[#F2EBE0] w-48 -top-2 left-6">
                          The address that manages this request (defaults to
                          your wallet).
                        </div>
                      </div>
                    </label>
                    <input
                      type="text"
                      value={delegate}
                      onChange={(e) => setDelegate(e.target.value)}
                      className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] text-sm"
                      placeholder={userAddress || "0x..."}
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-sm font-medium text-[#8AA6F9] mb-2">
                      Beneficiary Address
                      <div className="group relative">
                        <HelpCircle className="w-4 h-4 text-[#F7B808]/70" />
                        <div className="absolute hidden group-hover:block bg-[#0B101C] p-2 rounded shadow-lg text-xs text-[#F2EBE0] w-48 -top-2 left-6">
                          The address that will receive the shares (defaults to
                          your wallet).
                        </div>
                      </div>
                    </label>
                    <input
                      type="text"
                      value={beneficiary}
                      onChange={(e) => setBeneficiary(e.target.value)}
                      className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] text-sm"
                      placeholder={userAddress || "0x..."}
                    />
                  </div>
                </div>

                <button
                  onClick={handleDeposit}
                  disabled={!depositAmount || isPending}
                  className="w-full mt-6 bg-gradient-to-r from-[#217B71] to-[#4A21C2] text-[#F8FAFF] font-bold py-5 rounded-xl hover:from-[#217B71]/80 hover:to-[#4A21C2]/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
                >
                  {isPending ? "Confirming..." : "Request Deposit"}
                  {!isPending && <CheckCircle2 className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Redeem Section */}
        {activeSection === "redeem" && (
          <div className="space-y-6">
            <div className="bg-[#0B101C]/60 border border-[#0847F7]/30 rounded-xl p-6">
              {" "}
              {/* Blue border */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-[#0847F7]">
                  Request Redeem
                </h3>{" "}
                {/* Blue */}
                <div className="text-right text-sm">
                  <p className="text-[#8AA6F9]">Your Shares</p>
                  <p className="text-xl font-bold text-[#F8FAFF]">
                    {userShares
                      ? parseFloat(formatEther(userShares)).toFixed(4)
                      : "0.00"}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#8AA6F9] mb-2">
                    Shares to Redeem
                  </label>
                  <input
                    type="text"
                    value={redeemAmount}
                    onChange={(e) => setRedeemAmount(e.target.value)}
                    className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] placeholder-[#8AA6F9]/50 focus:border-[#0847F7] focus:outline-none text-lg"
                    placeholder="0.00"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-1 text-sm font-medium text-[#8AA6F9] mb-2">
                      Delegate Address
                      <div className="group relative">
                        <HelpCircle className="w-4 h-4 text-[#F7B808]/70" />
                        <div className="absolute hidden group-hover:block bg-[#0B101C] p-2 rounded shadow-lg text-xs text-[#F2EBE0] w-48 -top-2 left-6">
                          The address that manages this request (defaults to
                          your wallet).
                        </div>
                      </div>
                    </label>
                    <input
                      type="text"
                      value={delegate}
                      onChange={(e) => setDelegate(e.target.value)}
                      className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] text-sm"
                      placeholder={userAddress || "0x..."}
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-sm font-medium text-[#8AA6F9] mb-2">
                      Beneficiary Address
                      <div className="group relative">
                        <HelpCircle className="w-4 h-4 text-[#F7B808]/70" />
                        <div className="absolute hidden group-hover:block bg-[#0B101C] p-2 rounded shadow-lg text-xs text-[#F2EBE0] w-48 -top-2 left-6">
                          The address that will receive the assets (defaults to
                          your wallet).
                        </div>
                      </div>
                    </label>
                    <input
                      type="text"
                      value={beneficiary}
                      onChange={(e) => setBeneficiary(e.target.value)}
                      className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] text-sm"
                      placeholder={userAddress || "0x..."}
                    />
                  </div>
                </div>

                <button
                  onClick={handleRedeem}
                  disabled={!redeemAmount || isPending}
                  className="w-full mt-6 bg-gradient-to-r from-[#217B71] to-[#4A21C2] text-[#F8FAFF] font-bold py-5 rounded-xl hover:from-[#217B71]/80 hover:to-[#4A21C2]/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
                >
                  {isPending ? "Confirming..." : "Request Redeem"}
                  {!isPending && <AlertCircle className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delegate Section */}
        {activeSection === "delegate" && (
          <div className="bg-[#0B101C]/60 border border-[#4A21C2]/30 rounded-xl p-6">
            {" "}
            {/* Purple border */}
            <h3 className="text-xl font-bold text-[#4A21C2] mb-6">
              Set Delegate
            </h3>{" "}
            {/* Purple */}
            <p className="text-[#8AA6F9] mb-6">
              Allow another address to manage your requests on your behalf.
            </p>
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-1 text-sm font-medium text-[#8AA6F9] mb-2">
                  Delegate Address
                  <div className="group relative">
                    <HelpCircle className="w-4 h-4 text-[#F7B808]/70" />
                    <div className="absolute hidden group-hover:block bg-[#0B101C] p-2 rounded shadow-lg text-xs text-[#F2EBE0] w-48 -top-2 left-6">
                      The address you're approving or revoking as a delegate for
                      your requests.
                    </div>
                  </div>
                </label>
                <input
                  type="text"
                  value={delegateAddr}
                  onChange={(e) => setDelegateAddr(e.target.value)}
                  className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF]"
                  placeholder="0x..."
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={isApproved}
                    onChange={() => setIsApproved(true)}
                    className="w-5 h-5 text-[#217B71]"
                  />
                  <span className="text-[#217B71] font-medium">Approve</span>{" "}
                  {/* Green */}
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={!isApproved}
                    onChange={() => setIsApproved(false)}
                    className="w-5 h-5 text-[#E54918]"
                  />
                  <span className="text-[#E54918] font-medium">Revoke</span>{" "}
                  {/* Orange */}
                </label>
              </div>

              <button
                onClick={handleSetDelegate}
                disabled={!delegateAddr || isPending}
                className="w-full mt-4 bg-gradient-to-r from-[#217B71] to-[#4A21C2] text-[#F8FAFF] font-bold py-5 rounded-xl hover:from-[#217B71]/80 hover:to-[#4A21C2]/80 transition-all disabled:opacity-50"
              >
                {isApproved ? "Approve Delegate" : "Revoke Delegate"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
