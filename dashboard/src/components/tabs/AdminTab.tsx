import { useState } from "react";
import { useWriteContract, useReadContract, useAccount } from "wagmi";
import { keccak256, toHex } from "viem";
import TokenVaultArtifact from "../../assets/abis/TokenVault.json";
const abi = TokenVaultArtifact.abi;
const PRICE_SETTER_ROLE = keccak256(toHex("PRICE_SETTER_ROLE"));
const DEFAULT_ADMIN_ROLE = keccak256(toHex("DEFAULT_ADMIN_ROLE"));
export default function AdminTab({
  vaultAddress,
}: {
  vaultAddress: `0x${string}`;
}) {
  const { address } = useAccount();
  const { writeContract } = useWriteContract();
  // States for inputs
  const [newPrice, setNewPrice] = useState("");
  const [newFee, setNewFee] = useState("");
  const [freezeAccountAddr, setFreezeAccountAddr] = useState("");
  const [unfreezeAccountAddr, setUnfreezeAccountAddr] = useState("");
  const [depositAssets, setDepositAssets] = useState("");
  const [depositReceiver, setDepositReceiver] = useState("");
  const [depositController, setDepositController] = useState("");
  const [mintShares, setMintShares] = useState("");
  const [mintReceiver, setMintReceiver] = useState("");
  const [mintController, setMintController] = useState("");
  const [withdrawAssets, setWithdrawAssets] = useState("");
  const [withdrawReceiver, setWithdrawReceiver] = useState("");
  const [withdrawController, setWithdrawController] = useState("");
  const [redeemShares, setRedeemShares] = useState("");
  const [redeemReceiver, setRedeemReceiver] = useState("");
  const [redeemController, setRedeemController] = useState("");
  const [claimableDepositController, setClaimableDepositController] =
    useState("");
  const [claimableRedeemController, setClaimableRedeemController] =
    useState("");
  // Check roles
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
  console.log({ hasAdmin });
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
  const handlePause = () => {
    writeContract({
      address: vaultAddress,
      abi,
      functionName: "pause",
    });
  };
  const handleUnpause = () => {
    writeContract({
      address: vaultAddress,
      abi,
      functionName: "unpause",
    });
  };
  const handleFreezeAccount = () => {
    if (!freezeAccountAddr) return;
    writeContract({
      address: vaultAddress,
      abi,
      functionName: "freezeAccount",
      args: [freezeAccountAddr],
    });
  };
  const handleUnfreezeAccount = () => {
    if (!unfreezeAccountAddr) return;
    writeContract({
      address: vaultAddress,
      abi,
      functionName: "unfreezeAccount",
      args: [unfreezeAccountAddr],
    });
  };
  const handleDeposit = () => {
    if (!depositAssets || !depositReceiver || !depositController) return;
    writeContract({
      address: vaultAddress,
      abi,
      functionName: "deposit",
      args: [BigInt(depositAssets), depositReceiver, depositController],
    });
  };
  const handleMint = () => {
    if (!mintShares || !mintReceiver || !mintController) return;
    writeContract({
      address: vaultAddress,
      abi,
      functionName: "mint",
      args: [BigInt(mintShares), mintReceiver, mintController],
    });
  };
  const handleWithdraw = () => {
    if (!withdrawAssets || !withdrawReceiver || !withdrawController) return;
    writeContract({
      address: vaultAddress,
      abi,
      functionName: "withdraw",
      args: [BigInt(withdrawAssets), withdrawReceiver, withdrawController],
    });
  };
  const handleRedeem = () => {
    if (!redeemShares || !redeemReceiver || !redeemController) return;
    writeContract({
      address: vaultAddress,
      abi,
      functionName: "redeem",
      args: [BigInt(redeemShares), redeemReceiver, redeemController],
    });
  };
  const handleMakeDepositClaimable = () => {
    if (!claimableDepositController) return;
    writeContract({
      address: vaultAddress,
      abi,
      functionName: "makeDepositClaimable",
      args: [claimableDepositController],
    });
  };
  const handleMakeRedeemClaimable = () => {
    if (!claimableRedeemController) return;
    writeContract({
      address: vaultAddress,
      abi,
      functionName: "makeRedeemClaimable",
      args: [claimableRedeemController],
    });
  };
  return (
    <div className="p-4 bg-chainlink-dark border border-chainlink-light-blue rounded mt-4">
      <h3 className="text-lg font-bold mb-2">Admin Operations</h3>
      {!hasAdmin && !hasPriceSetter && <p>You do not have admin privileges.</p>}
      {hasPriceSetter && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Set New Price
          </label>
          <input
            type="number"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded mb-2"
          />
          <button
            onClick={handleSetPrice}
            className="bg-chainlink-blue text-chainlink-light py-2 px-4 rounded hover:bg-chainlink-light-blue"
          >
            Set Price
          </button>
        </div>
      )}
      {hasAdmin && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Set Fee (0-1000)
            </label>
            <input
              type="number"
              value={newFee}
              onChange={(e) => setNewFee(e.target.value)}
              className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded mb-2"
            />
            <button
              onClick={handleSetFee}
              className="bg-chainlink-blue text-chainlink-light py-2 px-4 rounded hover:bg-chainlink-light-blue"
            >
              Set Fee
            </button>
          </div>
          <div className="mb-4 flex space-x-2">
            <button
              onClick={handlePause}
              className="bg-chainlink-blue text-chainlink-light py-2 px-4 rounded hover:bg-chainlink-light-blue"
            >
              Pause Contract
            </button>
            <button
              onClick={handleUnpause}
              className="bg-chainlink-blue text-chainlink-light py-2 px-4 rounded hover:bg-chainlink-light-blue"
            >
              Unpause Contract
            </button>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Freeze Account
            </label>
            <input
              type="text"
              value={freezeAccountAddr}
              onChange={(e) => setFreezeAccountAddr(e.target.value)}
              className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded mb-2"
              placeholder="0x..."
            />
            <button
              onClick={handleFreezeAccount}
              className="bg-chainlink-blue text-chainlink-light py-2 px-4 rounded hover:bg-chainlink-light-blue"
            >
              Freeze
            </button>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Unfreeze Account
            </label>
            <input
              type="text"
              value={unfreezeAccountAddr}
              onChange={(e) => setUnfreezeAccountAddr(e.target.value)}
              className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded mb-2"
              placeholder="0x..."
            />
            <button
              onClick={handleUnfreezeAccount}
              className="bg-chainlink-blue text-chainlink-light py-2 px-4 rounded hover:bg-chainlink-light-blue"
            >
              Unfreeze
            </button>
          </div>
          <div className="mb-4">
            <h4 className="text-md font-bold mb-2">
              Fulfill Deposit (Exact Assets)
            </h4>
            <input
              type="number"
              value={depositAssets}
              onChange={(e) => setDepositAssets(e.target.value)}
              className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded mb-2"
              placeholder="Assets"
            />
            <input
              type="text"
              value={depositReceiver}
              onChange={(e) => setDepositReceiver(e.target.value)}
              className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded mb-2"
              placeholder="Receiver (0x...)"
            />
            <input
              type="text"
              value={depositController}
              onChange={(e) => setDepositController(e.target.value)}
              className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded mb-2"
              placeholder="Controller (0x...)"
            />
            <button
              onClick={handleDeposit}
              className="bg-chainlink-blue text-chainlink-light py-2 px-4 rounded hover:bg-chainlink-light-blue"
            >
              Deposit
            </button>
          </div>
          <div className="mb-4">
            <h4 className="text-md font-bold mb-2">
              Fulfill Mint (Exact Shares)
            </h4>
            <input
              type="number"
              value={mintShares}
              onChange={(e) => setMintShares(e.target.value)}
              className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded mb-2"
              placeholder="Shares"
            />
            <input
              type="text"
              value={mintReceiver}
              onChange={(e) => setMintReceiver(e.target.value)}
              className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded mb-2"
              placeholder="Receiver (0x...)"
            />
            <input
              type="text"
              value={mintController}
              onChange={(e) => setMintController(e.target.value)}
              className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded mb-2"
              placeholder="Controller (0x...)"
            />
            <button
              onClick={handleMint}
              className="bg-chainlink-blue text-chainlink-light py-2 px-4 rounded hover:bg-chainlink-light-blue"
            >
              Mint
            </button>
          </div>
          <div className="mb-4">
            <h4 className="text-md font-bold mb-2">
              Fulfill Withdraw (Exact Assets)
            </h4>
            <input
              type="number"
              value={withdrawAssets}
              onChange={(e) => setWithdrawAssets(e.target.value)}
              className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded mb-2"
              placeholder="Assets"
            />
            <input
              type="text"
              value={withdrawReceiver}
              onChange={(e) => setWithdrawReceiver(e.target.value)}
              className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded mb-2"
              placeholder="Receiver (0x...)"
            />
            <input
              type="text"
              value={withdrawController}
              onChange={(e) => setWithdrawController(e.target.value)}
              className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded mb-2"
              placeholder="Controller (0x...)"
            />
            <button
              onClick={handleWithdraw}
              className="bg-chainlink-blue text-chainlink-light py-2 px-4 rounded hover:bg-chainlink-light-blue"
            >
              Withdraw
            </button>
          </div>
          <div className="mb-4">
            <h4 className="text-md font-bold mb-2">
              Fulfill Redeem (Exact Shares)
            </h4>
            <input
              type="number"
              value={redeemShares}
              onChange={(e) => setRedeemShares(e.target.value)}
              className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded mb-2"
              placeholder="Shares"
            />
            <input
              type="text"
              value={redeemReceiver}
              onChange={(e) => setRedeemReceiver(e.target.value)}
              className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded mb-2"
              placeholder="Receiver (0x...)"
            />
            <input
              type="text"
              value={redeemController}
              onChange={(e) => setRedeemController(e.target.value)}
              className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded mb-2"
              placeholder="Controller (0x...)"
            />
            <button
              onClick={handleRedeem}
              className="bg-chainlink-blue text-chainlink-light py-2 px-4 rounded hover:bg-chainlink-light-blue"
            >
              Redeem
            </button>
          </div>
          <div className="mb-4">
            <h4 className="text-md font-bold mb-2">Make Deposit Claimable</h4>
            <input
              type="text"
              value={claimableDepositController}
              onChange={(e) => setClaimableDepositController(e.target.value)}
              className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded mb-2"
              placeholder="Controller (0x...)"
            />
            <button
              onClick={handleMakeDepositClaimable}
              className="bg-chainlink-blue text-chainlink-light py-2 px-4 rounded hover:bg-chainlink-light-blue"
            >
              Make Claimable
            </button>
          </div>
          <div className="mb-4">
            <h4 className="text-md font-bold mb-2">Make Redeem Claimable</h4>
            <input
              type="text"
              value={claimableRedeemController}
              onChange={(e) => setClaimableRedeemController(e.target.value)}
              className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded mb-2"
              placeholder="Controller (0x...)"
            />
            <button
              onClick={handleMakeRedeemClaimable}
              className="bg-chainlink-blue text-chainlink-light py-2 px-4 rounded hover:bg-chainlink-light-blue"
            >
              Make Claimable
            </button>
          </div>
        </>
      )}
    </div>
  );
}
