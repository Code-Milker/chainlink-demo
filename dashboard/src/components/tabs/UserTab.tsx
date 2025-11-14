import { useState } from "react";
import { useReadContract, useWriteContract, useAccount } from "wagmi";
import TokenVaultArtifact from "../../assets/abis/TokenVault.json";
const abi = TokenVaultArtifact.abi;
export default function UserTab({
  vaultAddress,
}: {
  vaultAddress: `0x${string}`;
}) {
  const { address: userAddress } = useAccount();
  const { writeContract } = useWriteContract();
  // States for inputs
  const [assetsToDeposit, setAssetsToDeposit] = useState("");
  const [depositController, setDepositController] = useState(userAddress || "");
  const [depositOwner, setDepositOwner] = useState(userAddress || "");
  const [sharesToRedeem, setSharesToRedeem] = useState("");
  const [redeemController, setRedeemController] = useState(userAddress || "");
  const [redeemOwner, setRedeemOwner] = useState(userAddress || "");
  const [operatorAddr, setOperatorAddr] = useState("");
  const [operatorApproved, setOperatorApproved] = useState(false);
  const [cancelDepositController, setCancelDepositController] = useState("");
  const [cancelRedeemController, setCancelRedeemController] = useState("");
  // Example read: Get current price (NAV)
  const { data: price, isLoading: priceLoading } = useReadContract({
    abi,
    address: vaultAddress,
    functionName: "getPrice",
  });
  const handleRequestDeposit = () => {
    if (!assetsToDeposit || !depositController || !depositOwner) return;
    writeContract({
      abi,
      address: vaultAddress,
      functionName: "requestDeposit",
      args: [BigInt(assetsToDeposit), depositController, depositOwner],
    });
  };
  const handleRequestRedeem = () => {
    if (!sharesToRedeem || !redeemController || !redeemOwner) return;
    writeContract({
      abi,
      address: vaultAddress,
      functionName: "requestRedeem",
      args: [BigInt(sharesToRedeem), redeemController, redeemOwner],
    });
  };
  const handleSetOperator = () => {
    if (!operatorAddr) return;
    writeContract({
      abi,
      address: vaultAddress,
      functionName: "setOperator",
      args: [operatorAddr, operatorApproved],
    });
  };
  const handleCancelDeposit = () => {
    if (!cancelDepositController) return;
    writeContract({
      abi,
      address: vaultAddress,
      functionName: "cancelDeposit",
      args: [cancelDepositController],
    });
  };
  const handleCancelRedeem = () => {
    if (!cancelRedeemController) return;
    writeContract({
      abi,
      address: vaultAddress,
      functionName: "cancelRedeem",
      args: [cancelRedeemController],
    });
  };
  return (
    <div className="bg-chainlink-dark border border-chainlink-light-blue rounded mt-4 space-y-6">
      <h2 className="text-xl font-bold mb-4 text-chainlink-light-blue px-4 pt-4">
        User Operations
      </h2>

      <div className="border-t border-chainlink-light-blue pt-4 px-4">
        <h4 className="text-md font-bold mb-2">Request Deposit</h4>
        <label className="block text-base font-bold mb-2">
          Assets to Deposit
        </label>
        <input
          type="number"
          value={assetsToDeposit}
          onChange={(e) => setAssetsToDeposit(e.target.value)}
          className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded mb-3"
          placeholder="100"
        />
        <label className="block text-base font-bold mb-2">
          Controller Address
        </label>
        <input
          type="text"
          value={depositController}
          onChange={(e) => setDepositController(e.target.value)}
          className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded mb-3"
          placeholder="0x..."
        />
        <label className="block text-base font-bold mb-2">Owner Address</label>
        <input
          type="text"
          value={depositOwner}
          onChange={(e) => setDepositOwner(e.target.value)}
          className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded mb-3"
          placeholder="0x..."
        />
        <button
          onClick={handleRequestDeposit}
          className="bg-chainlink-blue text-chainlink-light py-2 px-4 rounded hover:bg-chainlink-light-blue self-start"
        >
          Request Deposit
        </button>
      </div>
      <div className="border-t border-chainlink-light-blue pt-4 px-4">
        <h4 className="text-md font-bold mb-2">Request Redeem</h4>
        <label className="block text-base font-bold mb-2">
          Shares to Redeem
        </label>
        <input
          type="number"
          value={sharesToRedeem}
          onChange={(e) => setSharesToRedeem(e.target.value)}
          className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded mb-3"
          placeholder="100"
        />
        <label className="block text-base font-bold mb-2">
          Controller Address
        </label>
        <input
          type="text"
          value={redeemController}
          onChange={(e) => setRedeemController(e.target.value)}
          className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded mb-3"
          placeholder="0x..."
        />
        <label className="block text-base font-bold mb-2">Owner Address</label>
        <input
          type="text"
          value={redeemOwner}
          onChange={(e) => setRedeemOwner(e.target.value)}
          className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded mb-3"
          placeholder="0x..."
        />
        <button
          onClick={handleRequestRedeem}
          className="bg-chainlink-blue text-chainlink-light py-2 px-4 rounded hover:bg-chainlink-light-blue self-start"
        >
          Request Redeem
        </button>
      </div>
      <div className="border-t border-chainlink-light-blue pt-4 px-4">
        <h4 className="text-md font-bold mb-2">Set Operator</h4>
        <label className="block text-base font-bold mb-2">
          Operator Address
        </label>
        <input
          type="text"
          value={operatorAddr}
          onChange={(e) => setOperatorAddr(e.target.value)}
          className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded mb-3"
          placeholder="0x..."
        />
        <label className="block text-base font-bold mb-2">Approved</label>
        <select
          value={operatorApproved ? "true" : "false"}
          onChange={(e) => setOperatorApproved(e.target.value === "true")}
          className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded mb-3"
        >
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
        <button
          onClick={handleSetOperator}
          className="bg-chainlink-blue text-chainlink-light py-2 px-4 rounded hover:bg-chainlink-light-blue self-start"
        >
          Set Operator
        </button>
      </div>
      <div className="border-t border-chainlink-light-blue pt-4 px-4">
        <h4 className="text-md font-bold mb-2">Cancel Deposit</h4>
        <label className="block text-base font-bold mb-2">
          Controller Address
        </label>
        <input
          type="text"
          value={cancelDepositController}
          onChange={(e) => setCancelDepositController(e.target.value)}
          className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded mb-3"
          placeholder="0x..."
        />
        <button
          onClick={handleCancelDeposit}
          className="bg-chainlink-blue text-chainlink-light py-2 px-4 rounded hover:bg-chainlink-light-blue self-start"
        >
          Cancel Deposit
        </button>
      </div>
      <div className="border-t border-chainlink-light-blue pt-4 px-4">
        <h4 className="text-md font-bold mb-2">Cancel Redeem</h4>
        <label className="block text-base font-bold mb-2">
          Controller Address
        </label>
        <input
          type="text"
          value={cancelRedeemController}
          onChange={(e) => setCancelRedeemController(e.target.value)}
          className="w-full px-3 py-2 bg-chainlink-dark border border-chainlink-light-blue rounded mb-3"
          placeholder="0x..."
        />
        <button
          onClick={handleCancelRedeem}
          className="bg-chainlink-blue text-chainlink-light py-2 px-4 rounded hover:bg-chainlink-light-blue self-start"
        >
          Cancel Redeem
        </button>
      </div>
    </div>
  );
}
