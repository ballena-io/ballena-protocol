// contracts/vaults/BalleMaster.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.3;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../token/BALLEv2.sol";
import "../interfaces/IStrategy.sol";

/**
 * @dev Implementation of the Master of BALLE.
 * This contract will take care of all rewards calculations and distribution of BALLE tokens in vaults.
 * It's ownable and the owner is the only who can manage the active vaults and it's parameters for rewards distribution.
 * The ownership will be transferred to the Governance GNOSIS Safe.
 */
contract BalleMaster is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Info of each vault
    struct VaultInfo {
        IERC20 depositToken; // Address of deposited token contract.
        IERC20 wantToken; // Address of the token to maximize.
        bool rewardsActive; // BALLE rewards active for this vault.
        uint256 allocPoint; // How many allocation points assigned to this vault. BALLEs to distribute per block.
        uint256 lastRewardBlock; // Last block number that BALLEs distribution occurs.
        uint256 accBallePerShare; // Accumulated BALLEs per share, times 1e12. See below.
        address strat; // Address of the strategy contract that will maximize want tokens.
    }

    // Info of each user
    struct UserInfo {
        uint256 shares; // User shares of the vault.
        uint256 rewardDebt; // Reward debt. See explanation below.
        //
        // We do some fancy math here. Basically, any point in time, the amount of BALLEs
        // entitled to a user but is pending to be distributed is:
        //
        //   pending reward = (user.shares * vault.accBallePerShare) / 1e12 - user.rewardDebt
        //
        // Whenever a user deposits or withdraws LP tokens to a vault. Here's what happens:
        //   1. The vault's `accBallePerShare` and `lastRewardBlock` gets updated.
        //   2. User receives the pending reward sent to his address.
        //   3. User's `shares` gets updated.
        //   4. User's `rewardDebt` gets updated.
    }

    // The BALLE token.
    BALLEv2 public balle;
    // BALLE tokens created per block: 2283105022831050.
    uint256 public ballePerBlock;
    // BALLE tokens to distribute: 24000e18.
    uint256 public balleTotalRewards;
    // The block number when BALLE rewards distribution starts.
    uint256 public startBlock;
    // The block number when BALLE rewards distribution ends.
    uint256 public endBlock;
    // Total allocation points. Must be the sum of all allocation points in all vaults.
    uint256 public totalAllocPoint = 0;
    // BALLE to be minted for rewards.
    uint256 public balleToMint = 0;

    // Info of each vault.
    VaultInfo[] public vaultInfo;
    // Info of each user that stakes LP tokens.
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;

    event ActivateRewards(uint256 indexed vid, uint256 allocPoint);
    event ModifyRewards(uint256 indexed vid, uint256 allocPoint);
    event DeactivateRewards(uint256 indexed vid);
    event Deposit(address indexed user, uint256 indexed vid, uint256 amount, uint256 rewards);
    event Withdraw(address indexed user, uint256 indexed vid, uint256 amount, uint256 rewards);
    event EmergencyWithdraw(address indexed user, uint256 indexed vid, uint256 amount);

    constructor(
        BALLEv2 _balle,
        uint256 _ballePerBlock,
        uint256 _balleTotalRewards
    ) {
        balle = _balle;
        ballePerBlock = _ballePerBlock;
        balleTotalRewards = _balleTotalRewards;
    }

    /**
     * @dev Modifier to check if the vault exists.
     */
    modifier vaultExists(uint256 pid) {
        require(pid < vaultInfo.length, "!vault");
        _;
    }

    /**
     * @dev View function to get the number of vaults configured.
     */
    function vaultLength() external view returns (uint256) {
        return vaultInfo.length;
    }

    /**
     * @dev Function to add a new vault configuration. Can only be called by the owner.
     */
    function addVault(
        address _depositToken,
        address _wantToken,
        address _strat
    ) public onlyOwner {
        require(_strat != address(0), "!strat");
        require(_depositToken == IStrategy(_strat).depositToken(), "!depositToken");
        require(_wantToken == IStrategy(_strat).wantToken(), "!wantToken");
        vaultInfo.push(
            VaultInfo({
                depositToken: IERC20(_depositToken),
                wantToken: IERC20(_wantToken),
                rewardsActive: false,
                allocPoint: 0,
                lastRewardBlock: 0,
                accBallePerShare: 0,
                strat: _strat
            })
        );
    }

    /**
     * @dev Function to activate vault rewards. Can only be called by the owner.
     */
    function activateVaultRewards(uint256 _vid, uint256 _allocPoint) public onlyOwner vaultExists(_vid) {
        require(!vaultInfo[_vid].rewardsActive, "active");
        require(_allocPoint > 0, "!allocpoint");

        massUpdateVaults();

        if (startBlock == 0) {
            startBlock = block.number;
            endBlock = startBlock + (balleTotalRewards / ballePerBlock);
        }
        uint256 lastRewardBlock = block.number;
        totalAllocPoint = totalAllocPoint + _allocPoint;

        vaultInfo[_vid].allocPoint = _allocPoint;
        vaultInfo[_vid].lastRewardBlock = lastRewardBlock;
        vaultInfo[_vid].rewardsActive = true;
        vaultInfo[_vid].accBallePerShare = 0;

        emit ActivateRewards(_vid, _allocPoint);
    }

    /**
     * @dev Function to modify vault rewards. Can only be called by the owner.
     */
    function modifyVaultRewards(uint256 _vid, uint256 _allocPoint) public onlyOwner vaultExists(_vid) {
        require(vaultInfo[_vid].rewardsActive, "!active");
        require(_allocPoint > 0, "!allocpoint");

        massUpdateVaults();

        totalAllocPoint = totalAllocPoint - vaultInfo[_vid].allocPoint + _allocPoint;
        vaultInfo[_vid].allocPoint = _allocPoint;

        emit ModifyRewards(_vid, _allocPoint);
    }

    /**
     * @dev Function to deactivate vault rewards. Can only be called by the owner.
     */
    function deactivateVaultRewards(uint256 _vid) public onlyOwner vaultExists(_vid) {
        require(vaultInfo[_vid].rewardsActive, "!active");

        massUpdateVaults();

        totalAllocPoint = totalAllocPoint - vaultInfo[_vid].allocPoint;
        vaultInfo[_vid].allocPoint = 0;
        vaultInfo[_vid].rewardsActive = false;

        emit DeactivateRewards(_vid);
    }

    /**
     * @dev View function to calculate the reward multiplier over the given _from to _to block.
     */
    function getBlockMultiplier(uint256 _from, uint256 _to) public view returns (uint256) {
        if (_to < _from) {
            return 0;
        }
        if (_to < startBlock) {
            return 0;
        }
        if (_from > endBlock) {
            return 0;
        }
        if (_from < startBlock) {
            _from = startBlock;
        }
        if (_to > endBlock) {
            _to = endBlock;
        }
        return _to - _from;
    }

    /**
     * @dev View function to see pending BALLE on frontend.
     */
    function pendingBalle(uint256 _vid, address _user) external view returns (uint256) {
        VaultInfo storage vault = vaultInfo[_vid];
        UserInfo storage user = userInfo[_vid][_user];
        uint256 accBallePerShare = vault.accBallePerShare;
        uint256 sharesTotal = IStrategy(vault.strat).sharesTotal();
        if (vault.rewardsActive && block.number > vault.lastRewardBlock && sharesTotal != 0) {
            uint256 multiplier = getBlockMultiplier(vault.lastRewardBlock, block.number);
            uint256 balleReward = (multiplier * ballePerBlock * vault.allocPoint) / totalAllocPoint;
            accBallePerShare = accBallePerShare + (balleReward * 1e12) / sharesTotal;
        }
        return (user.shares * accBallePerShare) / 1e12 - user.rewardDebt;
    }

    /**
     * @dev View function to see staked (LP) tokens on frontend.
     */
    function stakedTokens(uint256 _vid, address _user) external view returns (uint256) {
        VaultInfo storage vault = vaultInfo[_vid];
        UserInfo storage user = userInfo[_vid][_user];

        uint256 sharesTotal = IStrategy(vault.strat).sharesTotal();
        uint256 depositTotal = IStrategy(vault.strat).depositTotal();
        if (sharesTotal == 0) {
            return 0;
        }
        return (user.shares * depositTotal) / sharesTotal;
    }

    /**
     * @dev Function to update reward variables for all vaults. Be careful of gas spending!
     */
    function massUpdateVaults() internal {
        uint256 length = vaultInfo.length;
        for (uint256 vid = 0; vid < length; ++vid) {
            updateVault(vid);
        }
    }

    /**
     * @dev Function to update reward variables of the given vault to be up-to-date.
     */
    function updateVault(uint256 _vid) internal {
        VaultInfo storage vault = vaultInfo[_vid];
        if (!vault.rewardsActive) {
            return;
        }
        if (block.number <= vault.lastRewardBlock) {
            return;
        }
        uint256 sharesTotal = IStrategy(vault.strat).sharesTotal();
        if (sharesTotal == 0) {
            vault.lastRewardBlock = block.number;
            return;
        }
        uint256 multiplier = getBlockMultiplier(vault.lastRewardBlock, block.number);
        if (multiplier <= 0) {
            return;
        }
        uint256 balleReward = (multiplier * ballePerBlock * vault.allocPoint) / totalAllocPoint;
        balleToMint = balleToMint + balleReward;

        vault.accBallePerShare = vault.accBallePerShare + (balleReward * 1e12) / sharesTotal;
        vault.lastRewardBlock = block.number;
    }

    /**
     * @dev Function that moves tokens from user -> BalleMaster (BALLE allocation) -> Strat (compounding).
     */
    function _deposit(uint256 _vid, uint256 _amount) internal {
        updateVault(_vid);
        VaultInfo storage vault = vaultInfo[_vid];
        UserInfo storage user = userInfo[_vid][msg.sender];

        uint256 pending;
        if (user.shares > 0) {
            pending = (user.shares * vault.accBallePerShare) / 1e12 - user.rewardDebt;
            if (pending > 0) {
                safeBalleTransfer(msg.sender, pending);
            }
        }
        if (_amount > 0) {
            vault.depositToken.safeTransferFrom(address(msg.sender), address(this), _amount);
            vault.depositToken.safeIncreaseAllowance(vault.strat, _amount);
            uint256 sharesAdded = IStrategy(vaultInfo[_vid].strat).deposit(_amount);
            user.shares = user.shares + sharesAdded;
        }
        user.rewardDebt = (user.shares * vault.accBallePerShare) / 1e12;
        emit Deposit(msg.sender, _vid, _amount, pending);
    }

    /**
     * @dev Function that deposits user tokens.
     */
    function deposit(uint256 _vid, uint256 _amount) public nonReentrant vaultExists(_vid) {
        _deposit(_vid, _amount);
    }

    /**
     * @dev Function that deposits all user tokens balance.
     */
    function depositAll(uint256 _vid) public nonReentrant {
        VaultInfo storage vault = vaultInfo[_vid];
        _deposit(_vid, vault.depositToken.balanceOf(msg.sender));
    }

    /**
     * @dev Function that performs the withdrawal.
     */
    function _withdraw(uint256 _vid, uint256 _amount) internal {
        updateVault(_vid);

        VaultInfo storage vault = vaultInfo[_vid];
        UserInfo storage user = userInfo[_vid][msg.sender];

        uint256 depositTotal = IStrategy(vault.strat).depositTotal();
        uint256 sharesTotal = IStrategy(vault.strat).sharesTotal();

        require(sharesTotal > 0, "!sharesTotal");
        require(user.shares > 0, "!user.shares");

        // Withdraw pending BALLE
        uint256 pending = (user.shares * vault.accBallePerShare) / 1e12 - user.rewardDebt;
        if (pending > 0) {
            safeBalleTransfer(msg.sender, pending);
        }

        // Withdraw tokens
        uint256 amount = (user.shares * depositTotal) / sharesTotal;
        if (_amount > amount) {
            _amount = amount;
        }
        if (_amount > 0) {
            (uint256 sharesRemoved, uint256 depositRemoved, uint256 wantRemoved) =
                IStrategy(vault.strat).withdraw(_amount);

            if (sharesRemoved > user.shares) {
                user.shares = 0;
            } else {
                user.shares = user.shares - sharesRemoved;
            }

            uint256 depositBal = IERC20(vault.depositToken).balanceOf(address(this));
            if (depositBal < depositRemoved) {
                depositRemoved = depositBal;
            }
            vault.depositToken.safeTransfer(address(msg.sender), depositRemoved);

            if (vault.depositToken != vault.wantToken) {
                uint256 wantBal = IERC20(vault.wantToken).balanceOf(address(this));
                if (wantBal < wantRemoved) {
                    wantRemoved = wantBal;
                }
                vault.wantToken.safeTransfer(address(msg.sender), wantRemoved);
            }
        }
        user.rewardDebt = (user.shares * vault.accBallePerShare) / 1e12;
        emit Withdraw(msg.sender, _vid, _amount, pending);
    }

    /**
     * @dev Function that withdraws user tokens.
     */
    function withdraw(uint256 _vid, uint256 _amount) public nonReentrant vaultExists(_vid) {
        _withdraw(_vid, _amount);
    }

    /**
     * @dev Function that withdraws all user tokens balance.
     */
    function withdrawAll(uint256 _vid) public nonReentrant {
        _withdraw(_vid, type(uint256).max);
    }

    /**
     * @dev Function that withdraws without caring about rewards. EMERGENCY ONLY.
     */
    function emergencyWithdraw(uint256 _vid) public nonReentrant vaultExists(_vid) {
        VaultInfo storage vault = vaultInfo[_vid];
        UserInfo storage user = userInfo[_vid][msg.sender];

        uint256 depositTotal = IStrategy(vault.strat).depositTotal();
        uint256 sharesTotal = IStrategy(vault.strat).sharesTotal();
        uint256 amount = (user.shares * depositTotal) / sharesTotal;
        user.shares = 0;
        user.rewardDebt = 0;

        // TODO consider implementing emergencyWithdraw on strategy too.
        IStrategy(vault.strat).withdraw(amount);

        uint256 lpBal = IERC20(vault.depositToken).balanceOf(address(this));
        if (lpBal < amount) {
            amount = lpBal;
        }
        vault.depositToken.safeTransfer(address(msg.sender), amount);

        emit EmergencyWithdraw(msg.sender, _vid, amount);
    }

    /**
     * @dev Function for Safe BALLE transfer.
     * Will mint BALLE when needed and take care if rounding error causes pool to not have enough BALLE.
     */
    function safeBalleTransfer(address _to, uint256 _amount) internal {
        uint256 balleBal = balle.balanceOf(address(this));
        if (_amount > balleBal) {
            if (balleToMint > 0) {
                balle.mint(address(this), balleToMint);
                balleToMint = 0;
                balleBal = balle.balanceOf(address(this));
                if (_amount > balleBal) {
                    balle.transfer(_to, balleBal);
                } else {
                    balle.transfer(_to, _amount);
                }
            } else {
                balle.transfer(_to, balleBal);
            }
        } else {
            balle.transfer(_to, _amount);
        }
    }

    /**
     * @dev Function to use from Governance GNOSIS Safe only in case tokens get stuck. EMERGENCY ONLY.
     */
    function inCaseTokensGetStuck(address _token, uint256 _amount) public onlyOwner {
        require(_token != address(balle), "!safe");
        IERC20(_token).safeTransfer(msg.sender, _amount);
    }
}
