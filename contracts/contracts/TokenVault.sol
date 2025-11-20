// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/interfaces/IERC165.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol"; // For safe transfers
import "@chainlink/contracts/src/v0.8/automation/interfaces/ILogAutomation.sol";
/**
 * @title IERC7540 Interface
 * @dev Interface for asynchronous deposit and redemption requests as per EIP-7540.
 * This defines the required functions for request-based vaults.
 */
interface IERC7540 is IERC165, IERC4626 {
    /**
     * @dev Initiates a deposit request for assets.
     * @param assets Amount of assets to deposit.
     * @param controller Address managing the request.
     * @param owner Owner of the request.
     * @return requestId Unique ID for the request.
     */
    function requestDeposit(uint256 assets, address controller, address owner) external returns (uint256 requestId);
    /**
     * @dev Initiates a redemption request for shares.
     * @param shares Amount of shares to redeem.
     * @param controller Address managing the request.
     * @param owner Owner of the request.
     * @return requestId Unique ID for the request.
     */
    function requestRedeem(uint256 shares, address controller, address owner) external returns (uint256 requestId);
    /**
     * @dev Returns pending assets for a deposit request.
     * @param requestId ID of the request.
     * @param controller Controller of the request.
     * @return assets Pending assets.
     */
    function pendingDepositRequest(uint256 requestId, address controller) external view returns (uint256 assets);
    /**
     * @dev Returns claimable assets for a deposit request.
     * @param requestId ID of the request.
     * @param controller Controller of the request.
     * @return assets Claimable assets.
     */
    function claimableDepositRequest(uint256 requestId, address controller) external view returns (uint256 assets);
    /**
     * @dev Returns pending shares for a redemption request.
     * @param requestId ID of the request.
     * @param controller Controller of the request.
     * @return shares Pending shares.
     */
    function pendingRedeemRequest(uint256 requestId, address controller) external view returns (uint256 shares);
    /**
     * @dev Returns claimable shares for a redemption request.
     * @param requestId ID of the request.
     * @param controller Controller of the request.
     * @return shares Claimable shares.
     */
    function claimableRedeemRequest(uint256 requestId, address controller) external view returns (uint256 shares);
    /**
     * @dev Checks if an address is an operator for a controller.
     * @param controller Controller address.
     * @param operator Operator address.
     * @return status True if approved.
     */
    function isOperator(address controller, address operator) external view returns (bool status);
    /**
     * @dev Sets operator approval for the caller's controller.
     * @param operator Operator address.
     * @param approved Approval status.
     * @return success True if successful.
     */
    function setOperator(address operator, bool approved) external returns (bool success);
    /**
     * @dev Emitted when a deposit request is initiated.
     */
    event DepositRequest(address indexed controller, address indexed owner, uint256 indexed requestId, address sender, uint256 assets);
    /**
     * @dev Emitted when a redeem request is initiated.
     */
    event RedeemRequest(address indexed controller, address indexed owner, uint256 indexed requestId, address sender, uint256 shares);
    /**
     * @dev Emitted when operator approval is set.
     */
    event OperatorSet(address indexed controller, address indexed operator, bool approved);
}
/**
 * @dev Enum for request statuses.
 */
enum RECORD_STATUS {
    UNKNOWN, // 0: No request
    PENDING, // 1: Requested, awaiting fulfillment
    CLAIMABLE, // 2: Ready for claim (optional stage)
    COMPLETE, // 3: Fulfilled
    CANCELED // 4: Canceled
}
/**
 * @dev Struct for deposit/redeem requests.
 */
struct Request {
    address owner; // Owner of the request
    address receiver; // Receiver of shares/assets
    uint256 amount; // Assets for deposit, shares for redeem
    RECORD_STATUS status; // Current status
}
/**
 * @title TokenVault
 * @author Tyler Fischer
 * @dev Asynchronous tokenized vault implementing EIP-7540 standards.
 * Extends ERC4626 for vault basics, with async overrides.
 * Supports controllers, operators, fees, dynamic pricing, pausing, and freezing.
 */
contract TokenVault is ERC4626, IERC7540, AccessControl, Pausable, ILogAutomation {
    using SafeERC20 for IERC20;
    using Math for uint256;
    /**
     * @dev Role for setting the vault price (NAV).
     */
    bytes32 public constant PRICE_SETTER_ROLE = keccak256("PRICE_SETTER_ROLE");
    /**
     * @dev Role for Chainlink keepers to perform upkeep.
     */
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    /**
     * @dev Current price (NAV) for conversions, initialized to 1e18 (1:1).
     */
    uint256 private _price = 1e18;
    /**
     * @dev Mapping for pending deposits by controller.
     */
    mapping(address => Request) private _pendingDeposits;
    /**
     * @dev Mapping for pending redeems by controller.
     */
    mapping(address => Request) private _pendingRedeems;
    /**
     * @dev Mapping for operator approvals (controller => operator => bool).
     */
    mapping(address => mapping(address => bool)) private _operators;
    /**
     * @dev Fee in basis points (1 = 0.1%, max 1000 = 100%).
     */
    uint256 public fee = 1;
    /**
     * @dev Mapping for frozen accounts (cannot transfer).
     */
    mapping(address => bool) public frozenAccounts;
    /**
     * @dev Emitted when an account is frozen.
     */
    event AccountFrozen(address indexed account);
    /**
     * @dev Emitted when an account is unfrozen.
     */
    event AccountUnfrozen(address indexed account);
    /**
     * @dev Emitted when a deposit is canceled.
     */
    event DepositCancelled(address controller);
    /**
     * @dev Emitted when a redeem is canceled.
     */
    event RedeemCancelled(address controller);
    /**
     * @dev Interface IDs for EIP-7540 compliance.
     */
    bytes4 internal constant INTERFACE_ID_IERC7540_OPERATORS = 0xe3bc4e65;
    bytes4 internal constant INTERFACE_ID_ERC7575 = 0x2f0a18c5; // If implementing share()
    bytes4 internal constant INTERFACE_ID_ASYNC_DEPOSIT = 0xce3bbe50;
    bytes4 internal constant INTERFACE_ID_ASYNC_REDEEM = 0x620ee8e4;
    /**
     * @dev Constructor to initialize the vault.
     * @param asset_ Underlying ERC-20 asset.
     * @param name_ Vault token name.
     * @param symbol_ Vault token symbol.
     * @param defaultAdmin Initial admin address.
     * @param priceSetter Initial price setter address.
     */
    constructor(
        IERC20 asset_,
        string memory name_,
        string memory symbol_,
        address defaultAdmin,
        address priceSetter
    ) ERC4626(asset_) ERC20(name_, symbol_) {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(PRICE_SETTER_ROLE, priceSetter);
    }
    /**
     * @dev Checks supported interfaces, including EIP-7540 variants.
     * @param interfaceId ID to check.
     * @return True if supported.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControl, IERC165) returns (bool) {
        return
            interfaceId == type(IERC7540).interfaceId ||
            interfaceId == INTERFACE_ID_IERC7540_OPERATORS ||
            interfaceId == INTERFACE_ID_ERC7575 ||
            interfaceId == INTERFACE_ID_ASYNC_DEPOSIT ||
            interfaceId == INTERFACE_ID_ASYNC_REDEEM ||
            super.supportsInterface(interfaceId);
    }
    /**
     * @dev Gets the current price (NAV).
     * @return Current price.
     */
    function getPrice() public view returns (uint256) {
        return _price;
    }
    /**
     * @dev Sets a new price (NAV).
     * @param newPrice New price value.
     */
    function setPrice(uint256 newPrice) external onlyRole(PRICE_SETTER_ROLE) {
        require(newPrice > 0, "Price must be greater than 0");
        _price = newPrice;
    }
    /**
     * @dev Sets the fee percentage.
     * @param _fee New fee (0-1000).
     */
    function setFee(uint256 _fee) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_fee <= 1000, "Fee cannot exceed 100%");
        fee = _fee;
    }
    /**
     * @dev Calculates fee for a value.
     * @param value Amount to calculate fee on.
     * @return Fee amount.
     */
    function getPercentage(uint256 value) public view returns (uint256) {
        return (value * fee) / 1000;
    }
    /**
     * @dev Checks if operator is approved for controller.
     * @param controller Controller.
     * @param operator Operator.
     * @return True if approved.
     */
    function isOperator(address controller, address operator) public view override returns (bool) {
        return _operators[controller][operator];
    }
    /**
     * @dev Returns pending assets for deposit.
     * @param controller Controller.
     * @return assets Pending assets.
     */
    function pendingDepositRequest(uint256 /* requestId */, address controller) external view override returns (uint256 assets) {
        Request memory request = _pendingDeposits[controller];
        if (request.status == RECORD_STATUS.PENDING) {
            return request.amount;
        }
        return 0;
    }
    /**
     * @dev Returns claimable assets for deposit.
     * @param controller Controller.
     * @return assets Claimable assets.
     */
    function claimableDepositRequest(uint256 /* requestId */, address controller) external view override returns (uint256 assets) {
        Request memory request = _pendingDeposits[controller];
        if (request.status == RECORD_STATUS.CLAIMABLE) {
            return request.amount;
        }
        return 0;
    }
    /**
     * @dev Returns pending shares for redeem.
     * @param controller Controller.
     * @return shares Pending shares.
     */
    function pendingRedeemRequest(uint256 /* requestId */, address controller) external view override returns (uint256 shares) {
        Request memory request = _pendingRedeems[controller];
        if (request.status == RECORD_STATUS.PENDING) {
            return request.amount;
        }
        return 0;
    }
    /**
     * @dev Returns claimable shares for redeem.
     * @param controller Controller.
     * @return shares Claimable shares.
     */
    function claimableRedeemRequest(uint256 /* requestId */, address controller) external view override returns (uint256 shares) {
        Request memory request = _pendingRedeems[controller];
        if (request.status == RECORD_STATUS.CLAIMABLE) {
            return request.amount;
        }
        return 0;
    }
    /**
     * @dev Initiates a deposit request (EIP-7540).
     * Transfers assets to vault and records pending request.
     * @param assets Assets to deposit.
     * @param controller Controller address.
     * @param owner Owner address.
     * @return requestId (fixed 0).
     */
    function requestDeposit(uint256 assets, address controller, address owner) external whenNotPaused returns (uint256 requestId) {
        if (owner == address(0)) owner = msg.sender;
        if (controller == address(0)) controller = owner;
        require(msg.sender == owner || isOperator(controller, msg.sender), "Not authorized");
        require(assets > 0, "Assets must be greater than 0");
        require(IERC20(asset()).balanceOf(msg.sender) >= assets, "Insufficient balance");
        IERC20(asset()).safeTransferFrom(msg.sender, address(this), assets);
        // Fixed requestId = 0 (one per controller)
        requestId = 0;
        require(_pendingDeposits[controller].status == RECORD_STATUS.UNKNOWN, "Pending deposit exists");
        _pendingDeposits[controller] = Request({
            owner: owner,
            receiver: controller, // Default receiver; adjustable
            amount: assets,
            status: RECORD_STATUS.PENDING
        });
        emit DepositRequest(controller, owner, requestId, msg.sender, assets);
        return requestId;
    }
    /**
     * @dev Initiates a redeem request (EIP-7540).
     * Transfers shares to vault and records pending request.
     * @param shares Shares to redeem.
     * @param controller Controller address.
     * @param owner Owner address.
     * @return requestId (fixed 0).
     */
    function requestRedeem(uint256 shares, address controller, address owner) external whenNotPaused returns (uint256 requestId) {
        if (owner == address(0)) owner = msg.sender;
        if (controller == address(0)) controller = owner;
        require(msg.sender == owner || isOperator(controller, msg.sender), "Not authorized");
        require(shares > 0, "Shares must be greater than 0");
        require(balanceOf(owner) >= shares, "Insufficient shares");
        _transfer(owner, address(this), shares);
        requestId = 0;
        require(_pendingRedeems[controller].status == RECORD_STATUS.UNKNOWN, "Pending redeem exists");
        _pendingRedeems[controller] = Request({
            owner: owner,
            receiver: controller,
            amount: shares,
            status: RECORD_STATUS.PENDING
        });
        emit RedeemRequest(controller, owner, requestId, msg.sender, shares);
        return requestId;
    }
    /**
     * @dev Internal: Fulfills deposit with exact assets.
     * Mints shares after fee.
     * @param assets Assets to convert.
     * @param receiver Shares receiver.
     * @param controller Controller of request.
     * @return shares Minted shares.
     */
    function _deposit(uint256 assets, address receiver, address controller) internal returns (uint256 shares) {
        Request storage request = _pendingDeposits[controller];
        require(request.status == RECORD_STATUS.PENDING, "No pending deposit");
        require(assets == request.amount, "Mismatched assets amount");
        uint256 effectiveAssets = request.amount - getPercentage(request.amount);
        shares = _convertToShares(effectiveAssets, Math.Rounding.Floor);
        _mint(receiver, shares);
        request.status = RECORD_STATUS.COMPLETE;
        delete _pendingDeposits[controller];
        emit Deposit(msg.sender, receiver, request.amount, shares); // caller, receiver, assets, shares
        return shares;
    }
    /**
     * @dev Fulfills deposit with exact assets (admin only).
     * @param assets Assets to convert.
     * @param receiver Shares receiver.
     * @param controller Controller of request.
     * @return shares Minted shares.
     */
    function deposit(uint256 assets, address receiver, address controller) external onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256 shares) {
        return _deposit(assets, receiver, controller);
    }
    /**
     * @dev Fulfills deposit with exact shares (admin only).
     * Mints shares, refunds excess assets.
     * @param shares Shares to mint.
     * @param receiver Shares receiver.
     * @param controller Controller of request.
     * @return assets Used assets.
     */
    function mint(uint256 shares, address receiver, address controller) external onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256 assets) {
        Request storage request = _pendingDeposits[controller];
        require(request.status == RECORD_STATUS.PENDING, "No pending deposit");
        assets = _convertToAssets(shares, Math.Rounding.Ceil);
        require(assets <= request.amount, "Insufficient pending assets");
        _mint(receiver, shares);
        // Refund excess
        if (request.amount > assets) {
            IERC20(asset()).safeTransfer(request.owner, request.amount - assets);
        }
        request.status = RECORD_STATUS.COMPLETE;
        delete _pendingDeposits[controller];
        emit Deposit(msg.sender, receiver, assets, shares); // caller, receiver, assets, shares
        return assets;
    }
    /**
     * @dev Fulfills redeem with exact assets (admin only).
     * Burns shares, transfers assets, returns excess shares.
     * @param assets Assets to withdraw.
     * @param receiver Assets receiver.
     * @param controller Controller of request.
     * @return shares Burned shares.
     */
    function withdraw(uint256 assets, address receiver, address controller) public onlyRole(DEFAULT_ADMIN_ROLE) override(ERC4626, IERC4626) returns (uint256 shares) {
        Request storage request = _pendingRedeems[controller];
        require(request.status == RECORD_STATUS.PENDING, "No pending redeem");
        shares = _convertToShares(assets, Math.Rounding.Ceil);
        require(shares <= request.amount, "Insufficient pending shares");
        IERC20(asset()).safeTransfer(receiver, assets);
        _burn(address(this), shares);
        // Return excess shares
        if (request.amount > shares) {
            _transfer(address(this), request.owner, request.amount - shares);
        }
        request.status = RECORD_STATUS.COMPLETE;
        delete _pendingRedeems[controller];
        emit Withdraw(msg.sender, receiver, request.owner, assets, shares); // caller, receiver, owner, assets, shares
        return shares;
    }
    /**
     * @dev Fulfills redeem with exact shares (admin only).
     * Burns shares, transfers assets, returns excess shares.
     * @param shares Shares to burn.
     * @param receiver Assets receiver.
     * @param controller Controller of request.
     * @return assets Withdrawn assets.
     */
    function redeem(uint256 shares, address receiver, address controller) public onlyRole(DEFAULT_ADMIN_ROLE) override(ERC4626, IERC4626) returns (uint256 assets) {
        Request storage request = _pendingRedeems[controller];
        require(request.status == RECORD_STATUS.PENDING, "No pending redeem");
        require(shares <= request.amount, "Insufficient pending shares");
        assets = _convertToAssets(shares, Math.Rounding.Floor);
        IERC20(asset()).safeTransfer(receiver, assets);
        _burn(address(this), shares);
        if (request.amount > shares) {
            _transfer(address(this), request.owner, request.amount - shares);
        }
        request.status = RECORD_STATUS.COMPLETE;
        delete _pendingRedeems[controller];
        emit Withdraw(msg.sender, receiver, request.owner, assets, shares); // caller, receiver, owner, assets, shares
        return assets;
    }
    /**
     * @dev Sets operator approval for msg.sender's controller.
     * @param operator Operator.
     * @param approved Status.
     * @return True on success.
     */
    function setOperator(address operator, bool approved) external override returns (bool) {
        _operators[msg.sender][operator] = approved;
        emit OperatorSet(msg.sender, operator, approved);
        return true;
    }
    /**
     * @dev Cancels a pending deposit and refunds assets.
     * @param controller Controller of request.
     */
    function cancelDeposit(address controller) external {
        Request storage request = _pendingDeposits[controller];
        require(msg.sender == request.owner || isOperator(controller, msg.sender), "Not authorized");
        require(request.status == RECORD_STATUS.PENDING, "No pending deposit");
        IERC20(asset()).safeTransfer(request.owner, request.amount);
        request.status = RECORD_STATUS.CANCELED;
        delete _pendingDeposits[controller];
        emit DepositCancelled(controller);
    }
    /**
     * @dev Cancels a pending redeem and returns shares.
     * @param controller Controller of request.
     */
    function cancelRedeem(address controller) external {
        Request storage request = _pendingRedeems[controller];
        require(msg.sender == request.owner || isOperator(controller, msg.sender), "Not authorized");
        require(request.status == RECORD_STATUS.PENDING, "No pending redeem");
        _transfer(address(this), request.owner, request.amount);
        request.status = RECORD_STATUS.CANCELED;
        delete _pendingRedeems[controller];
        emit RedeemCancelled(controller);
    }
    /**
     * @dev Marks a deposit as claimable (admin).
     * @param controller Controller.
     */
    function makeDepositClaimable(address controller) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Request storage request = _pendingDeposits[controller];
        require(request.status == RECORD_STATUS.PENDING, "Not pending");
        request.status = RECORD_STATUS.CLAIMABLE;
    }
    /**
     * @dev Marks a redeem as claimable (admin).
     * @param controller Controller.
     */
    function makeRedeemClaimable(address controller) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Request storage request = _pendingRedeems[controller];
        require(request.status == RECORD_STATUS.PENDING, "Not pending");
        request.status = RECORD_STATUS.CLAIMABLE;
    }
    /**
     * @dev Reverts synchronous previewDeposit (async vault).
     * @param assets Assets.
     * @return shares (reverts).
     */
    function previewDeposit(uint256 assets) public view virtual override(ERC4626, IERC4626) returns (uint256) {
        revert("Async vault: use preview after request");
    }
    /**
     * @dev Reverts synchronous previewMint (async vault).
     * @param shares Shares.
     * @return assets (reverts).
     */
    function previewMint(uint256 shares) public view virtual override(ERC4626, IERC4626) returns (uint256) {
        revert("Async vault: use preview after request");
    }
    /**
     * @dev Reverts synchronous previewWithdraw (async vault).
     * @param assets Assets.
     * @return shares (reverts).
     */
    function previewWithdraw(uint256 assets) public view virtual override(ERC4626, IERC4626) returns (uint256) {
        revert("Async vault: use preview after request");
    }
    /**
     * @dev Reverts synchronous previewRedeem (async vault).
     * @param shares Shares.
     * @return assets (reverts).
     */
    function previewRedeem(uint256 shares) public view virtual override(ERC4626, IERC4626) returns (uint256) {
        revert("Async vault: use preview after request");
    }
    /**
     * @dev Internal: Converts assets to shares using price.
     * @param assets Assets.
     * @param rounding Rounding mode.
     * @return shares Shares.
     */
    function _convertToShares(uint256 assets, Math.Rounding rounding) internal view virtual override returns (uint256) {
        if (rounding == Math.Rounding.Floor) {
            return assets.mulDiv(1e30, _price, Math.Rounding.Floor);
        } else {
            return assets.mulDiv(1e30, _price, Math.Rounding.Ceil);
        }
    }
    /**
     * @dev Internal: Converts shares to assets using price.
     * @param shares Shares.
     * @param rounding Rounding mode.
     * @return assets Assets.
     */
    function _convertToAssets(uint256 shares, Math.Rounding rounding) internal view virtual override returns (uint256) {
        if (rounding == Math.Rounding.Floor) {
            return shares.mulDiv(_price, 1e30, Math.Rounding.Floor);
        } else {
            return shares.mulDiv(_price, 1e30, Math.Rounding.Ceil);
        }
    }
    /**
     * @dev Pauses the contract (admin).
     */
    function pause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    /**
     * @dev Unpauses the contract (admin).
     */
    function unpause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
    /**
     * @dev Freezes an account (admin).
     * @param account Account to freeze.
     */
    function freezeAccount(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        frozenAccounts[account] = true;
        emit AccountFrozen(account);
    }
    /**
     * @dev Unfreezes an account (admin).
     * @param account Account to unfreeze.
     */
    function unfreezeAccount(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        frozenAccounts[account] = false;
        emit AccountUnfrozen(account);
    }
    /**
     * @dev Overrides transfer to block frozen accounts.
     * @param recipient Recipient.
     * @param amount Amount.
     * @return success True if successful.
     */
    function transfer(address recipient, uint256 amount) public virtual override(ERC20, IERC20) returns (bool) {
        require(!frozenAccounts[msg.sender], "Sender frozen");
        require(!frozenAccounts[recipient], "Recipient frozen");
        return super.transfer(recipient, amount);
    }
    /**
     * @dev Overrides transferFrom to block frozen accounts.
     * @param sender Sender.
     * @param recipient Recipient.
     * @param amount Amount.
     * @return success True if successful.
     */
    function transferFrom(address sender, address recipient, uint256 amount) public virtual override(ERC20, IERC20) returns (bool) {
        require(!frozenAccounts[sender], "Sender frozen");
        require(!frozenAccounts[recipient], "Recipient frozen");
        return super.transferFrom(sender, recipient, amount);
    }
    /**
     * @dev Chainlink Automation: Check if upkeep is needed based on log.
     */
    function checkLog(Log calldata log, bytes memory /* checkData */) external pure override returns (bool upkeepNeeded, bytes memory performData) {
        upkeepNeeded = true;
        performData = abi.encode(log);
        return (upkeepNeeded, performData);
    }
    /**
     * @dev Chainlink Automation: Perform the upkeep (fulfill deposit).
     */
    function performUpkeep(bytes calldata performData) external onlyRole(KEEPER_ROLE) override {
        Log memory log = abi.decode(performData, (Log));
        bytes32[] memory topics = log.topics;
        address controller = address(uint160(uint256(topics[1])));
        address owner = address(uint160(uint256(topics[2])));
        uint256 requestId = uint256(topics[3]);
        (address sender, uint256 assets) = abi.decode(log.data, (address, uint256));
        // Optionally validate owner/requestId/sender if needed
        _deposit(assets, controller, controller);
    }
    /**
     * @dev Grant role to Chainlink Automation registry (call after deployment).
     */
    function grantKeeperRole(address keeperRegistry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(KEEPER_ROLE, keeperRegistry);
    }
}
