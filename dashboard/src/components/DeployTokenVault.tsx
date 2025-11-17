import { useState, useEffect, Fragment } from "react";
import {
  useWalletClient,
  usePublicClient,
  useAccount,
  useChainId,
  useReadContract,
} from "wagmi";
import { isAddress } from "viem";
import MyERC20Artifact from "../assets/abis/ERC20.json";
import TokenVaultArtifact from "../assets/abis/TokenVault.json";
import { useAppStore } from "../store/appStore";
import {
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Loader2,
} from "lucide-react";
const erc20Abi = MyERC20Artifact.abi;
const erc20Bytecode = MyERC20Artifact.bytecode as `0x${string}`;
const vaultAbi = TokenVaultArtifact.abi;
const vaultBytecode = TokenVaultArtifact.bytecode as `0x${string}`;
export default function DeployTokenVault() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const chainId = useChainId();
  const { addERC20, addVault } = useAppStore();
  const [mode, setMode] = useState<"new" | "existing">("new");
  // Token: new
  const [tokenName, setTokenName] = useState("My Token");
  const [tokenSymbol, setTokenSymbol] = useState("MTK");
  const [initialSupply, setInitialSupply] = useState("1000000000000000000000"); // 1,000 tokens
  // Token: existing
  const [existingAsset, setExistingAsset] = useState("");
  // Shared asset
  const [asset, setAsset] = useState<`0x${string}` | null>(null);
  // Vault
  const [vaultName, setVaultName] = useState("My Vault");
  const [vaultSymbol, setVaultSymbol] = useState("MVT");
  const [defaultAdmin, setDefaultAdmin] = useState(address ?? "");
  const [priceSetter, setPriceSetter] = useState(address ?? "");
  // UI states
  const [deployingToken, setDeployingToken] = useState(false);
  const [deployingVault, setDeployingVault] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [vaultCopied, setVaultCopied] = useState(false);
  const [vaultAddress, setVaultAddress] = useState<string | null>(null);
  // Verify asset is ERC20
  const { data: readSymbol, error: symbolError } = useReadContract({
    abi: erc20Abi,
    address: asset ?? "0x0",
    functionName: "symbol",
    query: { enabled: !!asset },
  });
  const assetSymbol = readSymbol as string | undefined;
  const assetValid = !!asset && !!assetSymbol && !symbolError;
  useEffect(() => {
    if (address && !defaultAdmin) setDefaultAdmin(address);
    if (address && !priceSetter) setPriceSetter(address);
  }, [address, defaultAdmin, priceSetter]);
  const explorerUrls: Record<number, string> = {
    1: "https://etherscan.io",
    11155111: "https://sepolia.etherscan.io",
    42161: "https://arbiscan.io",
    421614: "https://sepolia.arbiscan.io",
  };
  const explorerUrl = explorerUrls[chainId] ?? "";
  const handleDeployToken = async () => {
    if (!walletClient || !publicClient) return alert("Wallet not connected");
    setDeployingToken(true);
    try {
      const hash = await walletClient.deployContract({
        abi: erc20Abi,
        bytecode: erc20Bytecode,
        args: [tokenName, tokenSymbol, BigInt(initialSupply)],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const addr = receipt.contractAddress!;
      setAsset(addr as `0x${string}`);
      if (address) addERC20(address, addr, chainId);
    } catch (err) {
      console.error(err);
      alert("Token deployment failed");
    } finally {
      setDeployingToken(false);
    }
  };
  const handleConfirmExisting = () => {
    if (!existingAsset || !isAddress(existingAsset)) {
      alert("Invalid address format");
      return;
    }
    setAsset(existingAsset as `0x${string}`);
  };
  const handleDeployVault = async () => {
    if (!walletClient || !publicClient || !assetValid) return;
    if (!isAddress(defaultAdmin) || !isAddress(priceSetter)) {
      alert("Invalid admin or price setter address");
      return;
    }
    setDeployingVault(true);
    try {
      const hash = await walletClient.deployContract({
        abi: vaultAbi,
        bytecode: vaultBytecode,
        args: [
          asset,
          vaultName,
          vaultSymbol,
          defaultAdmin as `0x${string}`,
          priceSetter as `0x${string}`,
        ],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const addr = receipt.contractAddress!;
      setVaultAddress(addr);
      if (address) addVault(address, addr, chainId);
    } catch (err) {
      console.error(err);
      alert("Vault deployment failed");
    } finally {
      setDeployingVault(false);
    }
  };
  const copyText = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };
  const resetAsset = () => {
    setAsset(null);
    setExistingAsset("");
  };
  const steps = [
    { id: 1, name: "Deposit Token" },
    { id: 2, name: "Vault Configuration" },
  ];
  const currentStep = vaultAddress ? 3 : assetValid ? 2 : 1;
  return (
    <div className="bg-[#0B101C]/80 backdrop-blur-sm border border-[#0847F7]/30 rounded-2xl overflow-hidden shadow-2xl">
      <div className="bg-gradient-to-r from-[#0847F7]/20 to-[#8AA6F9]/10 px-8 py-6 border-b border-[#0847F7]/30">
        <h2 className="text-2xl font-bold text-[#F8FAFF] flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0847F7]/20 rounded-xl flex items-center justify-center">
            🏗️
          </div>
          Deployment Controls
        </h2>
        <p className="text-[#F2EBE0] mt-1">
          Create a new ERC20 deposit token or use an existing one, then deploy
          your asynchronous Token Vault.
        </p>
      </div>
      <div className="p-8 space-y-8">
        {/* Stepper */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, index) => (
            <Fragment key={step.id}>
              <div
                className={`flex items-center gap-3 ${
                  step.id < currentStep
                    ? "text-[#217B71]"
                    : step.id === currentStep
                      ? "text-[#0847F7]"
                      : "text-[#8AA6F9]/50"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                    step.id < currentStep
                      ? "bg-[#217B71] border-[#217B71] text-white"
                      : step.id === currentStep
                        ? "bg-[#0847F7] border-[#0847F7] text-white"
                        : "border-[#8AA6F9]/50 text-[#8AA6F9]/50"
                  }`}
                >
                  {step.id}
                </div>
                <span className="font-medium">{step.name}</span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-4 ${
                    currentStep > step.id ? "bg-[#217B71]" : "bg-[#8AA6F9]/50"
                  }`}
                ></div>
              )}
            </Fragment>
          ))}
        </div>
        {!assetValid && (
          <>
            {/* Token Mode Tabs */}
            <div className="flex gap-2 bg-[#0B101C]/60 p-1.5 rounded-xl border border-[#0847F7]/30">
              <button
                onClick={() => {
                  setMode("new");
                  resetAsset();
                }}
                className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-lg font-medium transition-all ${
                  mode === "new"
                    ? "bg-[#0847F7] text-[#F8FAFF] shadow-lg"
                    : "text-[#8AA6F9] hover:text-[#F8FAFF] hover:bg-[#0847F7]/30"
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-[#217B71]/20 border border-[#217B71]" />
                New ERC20
              </button>
              <button
                onClick={() => {
                  setMode("existing");
                  resetAsset();
                }}
                className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-lg font-medium transition-all ${
                  mode === "existing"
                    ? "bg-[#0847F7] text-[#F8FAFF] shadow-lg"
                    : "text-[#8AA6F9] hover:text-[#F8FAFF] hover:bg-[#0847F7]/30"
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-[#0847F7]/20 border border-[#0847F7]" />
                Existing ERC20
              </button>
            </div>
            {/* Token Configuration */}
            <div className="bg-[#0B101C]/60 border border-[#217B71]/30 rounded-xl p-6">
              <h3 className="text-xl font-bold text-[#217B71] mb-6">
                {mode === "new"
                  ? "Create New Deposit Token"
                  : "Select Existing Deposit Token"}
              </h3>
              {mode === "new" ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#8AA6F9] mb-2">
                      Token Name
                    </label>
                    <input
                      type="text"
                      value={tokenName}
                      onChange={(e) => setTokenName(e.target.value)}
                      className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] placeholder-[#8AA6F9]/50 focus:border-[#0847F7] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#8AA6F9] mb-2">
                      Token Symbol
                    </label>
                    <input
                      type="text"
                      value={tokenSymbol}
                      onChange={(e) => setTokenSymbol(e.target.value)}
                      className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] placeholder-[#8AA6F9]/50 focus:border-[#0847F7] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#8AA6F9] mb-2">
                      Initial Supply (18 decimals)
                    </label>
                    <input
                      type="text"
                      value={initialSupply}
                      onChange={(e) => setInitialSupply(e.target.value)}
                      placeholder="1000000000000000000000 // 1,000 tokens"
                      className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] placeholder-[#8AA6F9]/50 focus:border-[#0847F7] focus:outline-none"
                    />
                    <p className="text-xs text-[#8AA6F9]/70 mt-1">
                      Supply is minted to your wallet (in wei).
                    </p>
                  </div>
                  <button
                    onClick={handleDeployToken}
                    disabled={
                      deployingToken ||
                      !tokenName ||
                      !tokenSymbol ||
                      !initialSupply
                    }
                    className="w-full mt-4 bg-gradient-to-r from-[#217B71] to-[#4A21C2] text-[#F8FAFF] font-bold py-5 rounded-xl hover:from-[#217B71]/80 hover:to-[#4A21C2]/80 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {deployingToken ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Deploying Token...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-6 h-6" />
                        Deploy ERC20 Token
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#8AA6F9] mb-2">
                      ERC20 Contract Address
                    </label>
                    <input
                      type="text"
                      value={existingAsset}
                      onChange={(e) => setExistingAsset(e.target.value)}
                      placeholder="0x..."
                      className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] placeholder-[#8AA6F9]/50 focus:border-[#0847F7] focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleConfirmExisting}
                    disabled={!existingAsset || !isAddress(existingAsset)}
                    className="w-full bg-[#0847F7] text-[#F8FAFF] font-bold py-4 rounded-xl hover:bg-[#0847F7]/80 transition-all disabled:opacity-50"
                  >
                    Confirm Asset
                  </button>
                </div>
              )}
              {asset && !assetValid && (
                <div className="mt-6 p-4 bg-[#E54918]/10 border border-[#E54918]/50 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-[#E54918] mt-0.5" />
                  <div>
                    <p className="font-medium text-[#E54918]">Invalid ERC20</p>
                    <p className="text-sm text-[#F2EBE0]">
                      Could not read token symbol. Verify the address.
                    </p>
                    <button
                      onClick={resetAsset}
                      className="mt-3 px-4 py-2 bg-[#E54918]/30 text-[#F8FAFF] rounded-lg hover:bg-[#E54918]/50"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
        {/* Asset Status */}
        {assetValid && (
          <div className="mt-6 p-4 bg-[#217B71]/10 border border-[#217B71]/50 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-[#217B71] mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-[#217B71]">Deposit Token Ready</p>
              <p className="text-sm text-[#F2EBE0]">
                Address: <span className="font-mono">{asset}</span>
              </p>
              <p className="text-sm text-[#F2EBE0]">Symbol: {assetSymbol}</p>
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => copyText(asset, setTokenCopied)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#217B71]/30 text-[#F8FAFF] rounded-lg hover:bg-[#217B71]/50 transition-all"
                >
                  <Copy className="w-4 h-4" />
                  {tokenCopied ? "Copied!" : "Copy"}
                </button>
                {explorerUrl && (
                  <a
                    href={`${explorerUrl}/address/${asset}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-[#217B71]/30 text-[#F8FAFF] rounded-lg hover:bg-[#217B71]/50 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Explorer
                  </a>
                )}
                <button
                  onClick={resetAsset}
                  className="px-4 py-2 bg-[#0B101C]/60 text-[#8AA6F9] rounded-lg hover:bg-[#0B101C]/80"
                >
                  Change
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Vault Deployment */}
        {!vaultAddress && assetValid && (
          <div className="bg-[#0B101C]/60 border border-[#0847F7]/30 rounded-xl p-6">
            <h3 className="text-xl font-bold text-[#0847F7] mb-6">
              Deploy Token Vault
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#8AA6F9] mb-2">
                    Vault Name
                  </label>
                  <input
                    type="text"
                    value={vaultName}
                    onChange={(e) => setVaultName(e.target.value)}
                    className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] placeholder-[#8AA6F9]/50 focus:border-[#0847F7] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#8AA6F9] mb-2">
                    Vault Symbol
                  </label>
                  <input
                    type="text"
                    value={vaultSymbol}
                    onChange={(e) => setVaultSymbol(e.target.value)}
                    className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] placeholder-[#8AA6F9]/50 focus:border-[#0847F7] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#8AA6F9] mb-2">
                  Deposit Token (ERC20)
                </label>
                <input
                  type="text"
                  disabled
                  value={asset!}
                  className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#8AA6F9] cursor-not-allowed"
                />
                <p className="text-xs text-[#8AA6F9]/70 mt-1">
                  Symbol: {assetSymbol}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#8AA6F9] mb-2">
                    Default Admin
                  </label>
                  <input
                    type="text"
                    value={defaultAdmin}
                    onChange={(e) => setDefaultAdmin(e.target.value)}
                    placeholder={address ?? "0x..."}
                    className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] placeholder-[#8AA6F9]/50 focus:border-[#0847F7] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#8AA6F9] mb-2">
                    Price Setter
                  </label>
                  <input
                    type="text"
                    value={priceSetter}
                    onChange={(e) => setPriceSetter(e.target.value)}
                    placeholder={address ?? "0x..."}
                    className="w-full px-5 py-4 bg-[#0B101C]/40 border border-[#0847F7]/50 rounded-xl text-[#F8FAFF] placeholder-[#8AA6F9]/50 focus:border-[#0847F7] focus:outline-none"
                  />
                </div>
              </div>
              <button
                onClick={handleDeployVault}
                disabled={deployingVault || !vaultName || !vaultSymbol}
                className="w-full bg-gradient-to-r from-[#217B71] to-[#4A21C2] text-[#F8FAFF] font-bold py-5 rounded-xl hover:from-[#217B71]/80 hover:to-[#4A21C2]/80 transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
              >
                {deployingVault ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Deploying Vault...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-6 h-6" />
                    Deploy Token Vault
                  </>
                )}
              </button>
            </div>
          </div>
        )}
        {vaultAddress && (
          <div className="mt-6 p-4 bg-[#0847F7]/10 border border-[#0847F7]/50 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-[#0847F7] mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-[#0847F7]">
                Vault Deployed Successfully!
              </p>
              <p className="text-sm text-[#F2EBE0]">
                Address: <span className="font-mono">{vaultAddress}</span>
              </p>
              <p className="text-sm text-[#F2EBE0] mt-2">
                Your new vault is ready. It will appear in the selector above.
              </p>
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => copyText(vaultAddress, setVaultCopied)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0847F7]/30 text-[#F8FAFF] rounded-lg hover:bg-[#0847F7]/50 transition-all"
                >
                  <Copy className="w-4 h-4" />
                  {vaultCopied ? "Copied!" : "Copy"}
                </button>
                {explorerUrl && (
                  <a
                    href={`${explorerUrl}/address/${vaultAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-[#0847F7]/30 text-[#F8FAFF] rounded-lg hover:bg-[#0847F7]/50 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Explorer
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
