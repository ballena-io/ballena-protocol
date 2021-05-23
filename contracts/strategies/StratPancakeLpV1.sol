// contracts/strategies/StratPancakeLpV1.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IPancakeswapFarm.sol";
import "../interfaces/IPancakeRouter01.sol";

/**
 * @dev Implementation of the PancakeSwap LP Strategy.
 * This contract will compound LP tokens.
 * The owner of the contract is the BalleMaster contract.
 */
contract StratPancakeLpV1 is Ownable {
    using SafeERC20 for IERC20;

    // PancakeSwap's MasterChef address.
    address public immutable masterChef;
    // MasterChef's pid of pool.
    uint256 public immutable pid;
    // Deposit token (LP) address.
    address public immutable depositToken;
    // First token of LP address.
    address public immutable token0;
    // Second token of LP address.
    address public immutable token1;
    // Earned token (CAKE) address.
    address public immutable earnedtoken;
    // PancakeSwap router address.
    address public immutable router;

    // Address to send controller fee.
    address public rewards;
    // Address to send treasury fee.
    address public treasury;

    // Governance Gnosis Safe multisig.
    address public governance;
    // Operations Gnosis Safe multisig.
    address public operations;
    // Harvest addresses
    mapping(address => bool) public harvesters;

    uint256 public depositTotal = 0;
    uint256 public sharesTotal = 0;

    // 0.1% entrance fee. Goes to pool, prevents front-running.
    uint256 public entranceFee = 9990;
    // Factor to calculate fee 100 = 1%.
    uint256 public constant ENTRANCE_FEE_MAX = 10000;
    // 0.5% max settable entrance fee, LL = lowerlimit.
    uint256 public constant ENTRANCE_FEE_LL = 9950;

    // 4% performance fee.
    uint256 public performanceFee = 400;
    // 8% max settable performance fee, UL = upperlimit.
    uint256 public constant PERFORMANCE_FEE_UL = 800;
    // Factor to calculate fee 100 = 1%.
    uint256 public constant PERFORMANCE_FEE_MAX = 10000;
    // 3% goes to BALLE holders.
    uint256 public rewardsFeeFactor = 750;
    // 1% goes to treasury.
    uint256 public treasuryFeeFactor = 250;
    // Factor for fee distribution.
    uint256 public constant FEE_FACTOR_MAX = 1000;

    // 5% default slippage tolerance.
    uint256 public slippage = 950;
    // 10% max settable slippage tolerance, UL = upperlimit.
    uint256 public constant SLIPPAGE_UL = 990;

    // Minimum earned amount to reinvest. Default 10 CAKE.
    uint256 public minEarnedToReinvest = 10000000000000000000;
    // 1 CAKE min settable minimum to reinvest, LL = lowerlimit.
    uint256 public constant MIN_EARNED_TO_REINVEST_LL = 1000000000000000000;
    // 20 CAKE max settable minimum to reinvest, UL = upperlimit.
    uint256 public constant MIN_EARNED_TO_REINVEST_UL = 20000000000000000000;

    // Swap routes
    address[] public earnedtokenToBallePath;
    address[] public earnedtokenToToken0Path;
    address[] public earnedtokenToToken1Path;

    // Paused state activated
    bool public paused = false;

    event SetSettings(
        uint256 entranceFee,
        uint256 performanceFee,
        uint256 rewardsFeeFactor,
        uint256 treasuryFeeFactor,
        uint256 slippage,
        uint256 minEarnedToReinvest
    );
    event Harvest(uint256 amount);
    event DistributeFees(uint256 rewardsAmount, uint256 treasuryAmount);
    event SetGovernance(address indexed addr);

    /**
     * @dev Implementation of PancakeSwap LP autocompounding strategy.
     */
    constructor(
        address[] memory _addresses,
        uint256 _pid,
        address[] memory _earnedtokenToBallePath,
        address[] memory _earnedtokenToToken0Path,
        address[] memory _earnedtokenToToken1Path
    ) {
        require(_pid > 0, "!pid");

        depositToken = _addresses[0];
        token0 = _addresses[1];
        token1 = _addresses[2];
        earnedtoken = _addresses[3];
        router = _addresses[4];
        masterChef = _addresses[5];
        pid = _pid;

        governance = msg.sender;
        harvesters[_addresses[7]] = true;
        rewards = _addresses[8];
        treasury = _addresses[9];

        earnedtokenToBallePath = _earnedtokenToBallePath;
        earnedtokenToToken0Path = _earnedtokenToToken0Path;
        earnedtokenToToken1Path = _earnedtokenToToken1Path;

        // The owner of the strategy contract is the BalleMaster contract
        transferOwnership(_addresses[6]);
    }

    /**
     * @dev Modifier to check the caller is the Governance Gnosis Safe multisig.
     */
    modifier onlyGovernance() {
        require(msg.sender == governance, "!governance");
        _;
    }

    /**
     * @dev Modifier to check the caller is the Governance or Operations Gnosis Safe multisig.
     */
    modifier onlyOperations() {
        require(msg.sender == operations || msg.sender == governance, "!operations");
        _;
    }

    /**
     * @dev Modifier to check the caller is the Governance or Operations Gnosis Safe multisig or an authorized harvester.
     */
    modifier onlyHarvester() {
        require(harvesters[msg.sender] || msg.sender == operations || msg.sender == governance, "!harvester");
        _;
    }

    /**
     * @dev Modifier to check that the strategy is not paused.
     */
    modifier whenNotPaused() {
        require(!paused, "paused");
        _;
    }

    /**
     * @dev Modifier to check that the strategy is paused.
     */
    modifier whenPaused() {
        require(paused, "!paused");
        _;
    }

    /**
     * @dev View function to see pending CAKEs on farm.
     */
    function pendingEarnedToken() external view returns (uint256) {
        return IPancakeswapFarm(masterChef).pendingCake(pid, address(this));
    }

    /**
     * @dev Function to transfer tokens BalleMaster -> strategy and put it to work.
     */
    function deposit(address _user, uint256 _amount) public onlyOwner whenNotPaused returns (uint256) {
        require(_user != address(0), "!user");
        IERC20(depositToken).safeTransferFrom(msg.sender, address(this), _amount);

        uint256 sharesAdded = _amount;
        if (depositTotal > 0 && sharesTotal > 0) {
            sharesAdded = ((_amount * sharesTotal * entranceFee) / depositTotal) / ENTRANCE_FEE_MAX;
        }
        sharesTotal = sharesTotal + sharesAdded;

        farm();

        return sharesAdded;
    }

    /**
     * @dev Function to send depositToken to farm.
     */
    function farm() internal {
        if (depositTotal == 0) {
            // On first farming, set allowances
            setAllowances();
        }
        uint256 amount = IERC20(depositToken).balanceOf(address(this));
        depositTotal = depositTotal + amount;

        IPancakeswapFarm(masterChef).deposit(pid, amount);
    }

    /**
     * @dev Function to transfer tokens strategy -> BalleMaster.
     */
    function withdraw(address _user, uint256 _amount) public onlyOwner returns (uint256, uint256) {
        require(_user != address(0), "!user");
        require(_amount > 0, "!amount");

        uint256 sharesRemoved = (_amount * sharesTotal) / depositTotal;
        if (sharesRemoved > sharesTotal) {
            sharesRemoved = sharesTotal;
        }
        sharesTotal = sharesTotal - sharesRemoved;

        // If paused, tokens are already here
        if (!paused) {
            IPancakeswapFarm(masterChef).withdraw(pid, _amount);
        }

        uint256 balance = IERC20(depositToken).balanceOf(address(this));
        if (_amount > balance) {
            _amount = balance;
        }

        if (depositTotal < _amount) {
            _amount = depositTotal;
        }

        depositTotal = depositTotal - _amount;

        IERC20(depositToken).safeTransfer(msg.sender, _amount);

        return (sharesRemoved, _amount);
    }

    /**
     * @dev Function to harvest earnings and reinvest.
     */
    function harvest() public onlyHarvester whenNotPaused {
        _harvest(0);
    }

    /**
     * @dev Internal function to harvest earnings and reinvest.
     * If called with _amount > 0 will withdraw the LP indicated with the earned CAKE and not reinvest.
     */
    function _harvest(uint256 _amount) internal {
        // Harvest farm tokens
        IPancakeswapFarm(masterChef).withdraw(pid, _amount);
        uint256 earnedAmt = IERC20(earnedtoken).balanceOf(address(this));
        if (earnedAmt < minEarnedToReinvest) {
            return;
        }

        emit Harvest(earnedAmt);

        // Distribute the fees
        earnedAmt = distributeFees(earnedAmt);

        // Converts farm tokens into want tokens
        if (earnedtoken != token0) {
            // Swap half earned to token0
            safeSwap(
                router,
                earnedAmt / 2,
                slippage,
                earnedtokenToToken0Path,
                address(this),
                // solhint-disable-next-line not-rely-on-time
                block.timestamp + 600
            );
        }

        if (earnedtoken != token1) {
            // Swap half earned to token1
            safeSwap(
                router,
                earnedAmt / 2,
                slippage,
                earnedtokenToToken1Path,
                address(this),
                // solhint-disable-next-line not-rely-on-time
                block.timestamp + 600
            );
        }

        // Add liquidity
        uint256 token0Amt = IERC20(token0).balanceOf(address(this));
        uint256 token1Amt = IERC20(token1).balanceOf(address(this));
        if (token0Amt > 0 && token1Amt > 0) {
            IPancakeRouter01(router).addLiquidity(
                token0,
                token1,
                token0Amt,
                token1Amt,
                0,
                0,
                address(this),
                // solhint-disable-next-line not-rely-on-time
                block.timestamp + 600
            );
        }

        if (_amount == 0) {
            farm();
        }
    }

    /**
     * @dev Function to calculate and distribute the fees.
     */
    function distributeFees(uint256 _earnedAmt) internal returns (uint256) {
        if (_earnedAmt > 0) {
            // Performance fee
            if (performanceFee > 0) {
                uint256 totalFee = (_earnedAmt * performanceFee) / PERFORMANCE_FEE_MAX;

                uint256 treasuryFee = (totalFee * treasuryFeeFactor) / FEE_FACTOR_MAX;
                // Swap treasuryFee to BALLE and send to treasury.
                safeSwap(
                    router,
                    treasuryFee,
                    slippage,
                    earnedtokenToBallePath,
                    treasury,
                    // solhint-disable-next-line not-rely-on-time
                    block.timestamp + 600
                );
                uint256 rewardsFee = (totalFee * rewardsFeeFactor) / FEE_FACTOR_MAX;
                // Swap rewardsFee to BALLE and send to rewards contract.
                safeSwap(
                    router,
                    rewardsFee,
                    slippage,
                    earnedtokenToBallePath,
                    rewards,
                    // solhint-disable-next-line not-rely-on-time
                    block.timestamp + 600
                );

                _earnedAmt = _earnedAmt - totalFee;

                emit DistributeFees(rewardsFee, treasuryFee);
            }
        }

        return _earnedAmt;
    }

    /**
     * @dev Function to change strategy settings.
     */
    function setSettings(
        uint256 _entranceFee,
        uint256 _performanceFee,
        uint256 _rewardsFeeFactor,
        uint256 _treasuryFeeFactor,
        uint256 _slippage,
        uint256 _minEarnedToReinvest
    ) public onlyOperations {
        require(_entranceFee >= ENTRANCE_FEE_LL, "!entranceFeeLL");
        require(_entranceFee <= ENTRANCE_FEE_MAX, "!entranceFeeMax");
        entranceFee = _entranceFee;

        require(_performanceFee <= PERFORMANCE_FEE_UL, "!performanceFeeUL");
        performanceFee = _performanceFee;

        require(_rewardsFeeFactor + _treasuryFeeFactor == FEE_FACTOR_MAX, "!feeFactor");
        rewardsFeeFactor = _rewardsFeeFactor;
        treasuryFeeFactor = _treasuryFeeFactor;

        require(_slippage <= SLIPPAGE_UL, "!slippageUL");
        slippage = _slippage;

        require(_minEarnedToReinvest <= MIN_EARNED_TO_REINVEST_UL, "!minEarnedToReinvestUL");
        require(_minEarnedToReinvest >= MIN_EARNED_TO_REINVEST_LL, "!minEarnedToReinvestLL");
        minEarnedToReinvest = _minEarnedToReinvest;

        emit SetSettings(
            _entranceFee,
            _performanceFee,
            _rewardsFeeFactor,
            _treasuryFeeFactor,
            _slippage,
            _minEarnedToReinvest
        );
    }

    /**
     * @dev Function to change the Governance Gnosis Safe multisig.
     */
    function setGovernance(address _governance) public onlyGovernance {
        require(_governance != address(0), "zero address");
        governance = _governance;
        emit SetGovernance(_governance);
    }

    /**
     * @dev Function to change the Operations Gnosis Safe multisig.
     */
    function setOperations(address _operations) public onlyGovernance {
        require(_operations != address(0), "zero address");
        operations = _operations;
    }

    /**
     * @dev Function to change the rewards address.
     */
    function setRewards(address _rewards) public onlyGovernance {
        require(_rewards != address(0), "zero address");
        rewards = _rewards;
    }

    /**
     * @dev Function to change the treasury address.
     */
    function setTreasury(address _treasury) public onlyGovernance {
        require(_treasury != address(0), "zero address");
        treasury = _treasury;
    }

    /**
     * @dev Add a harvester address.
     */
    function addHarvester(address _harvester) external onlyOperations {
        require(_harvester != address(0), "zero address");
        harvesters[_harvester] = true;
    }

    /**
     * @dev Remove a harvester address.
     */
    function removeHarvester(address _harvester) external onlyOperations {
        require(_harvester != address(0), "zero address");
        harvesters[_harvester] = false;
    }

    /**
     * @dev Utility function for setting allowances with third party contracts.
     */
    function setAllowances() internal {
        // Clear first, just in case they were set before (safeApprove will not allow to set from no zero)
        clearAllowances();
        // Approve token transfers
        IERC20(depositToken).safeApprove(masterChef, type(uint256).max);
        IERC20(earnedtoken).safeApprove(router, type(uint256).max);
        IERC20(token0).safeApprove(router, type(uint256).max);
        IERC20(token1).safeApprove(router, type(uint256).max);
    }

    /**
     * @dev Utility function for clearing allowances with third party contracts.
     */
    function clearAllowances() internal {
        // Disapprove token transfers
        IERC20(depositToken).safeApprove(masterChef, 0);
        IERC20(earnedtoken).safeApprove(router, 0);
        IERC20(token0).safeApprove(router, 0);
        IERC20(token1).safeApprove(router, 0);
    }

    /**
     * @dev Utility function for safely swap tokens.
     */
    function safeSwap(
        address _router,
        uint256 _amountIn,
        uint256 _slippage,
        address[] memory _path,
        address _to,
        uint256 _deadline
    ) internal {
        uint256[] memory amounts = IPancakeRouter01(_router).getAmountsOut(_amountIn, _path);
        uint256 amountOut = amounts[amounts.length - 1];

        IPancakeRouter01(_router).swapExactTokensForTokens(
            _amountIn,
            (amountOut * _slippage) / 1000,
            _path,
            _to,
            _deadline
        );
    }

    /**
     * @dev Stop the vault.
     */
    function pause() external onlyOwner whenNotPaused {
        _pause();
    }

    /**
     * @dev Internal function for stopping the vault.
     */
    function _pause() internal {
        if (!paused) {
            // Harvest with withdrawall.
            if (depositTotal > 0) {
                _harvest(depositTotal);
            }

            // Clear allowances of third party contracts.
            clearAllowances();

            paused = true;
        }
    }

    /**
     * @dev Restart the vault.
     */
    function unpause() external onlyOwner whenPaused {
        depositTotal = 0; // It will be set back on farm().
        farm();
        paused = false;
    }

    /**
     * @dev Stop the vault with emergencyWithdraw from farm.
     */
    function panic() external onlyOwner whenNotPaused {
        // Emergency withdraw.
        IPancakeswapFarm(masterChef).emergencyWithdraw(pid);

        // Clear allowances of third party contracts.
        clearAllowances();

        paused = true;
    }

    /**
     * @dev Retire the vault.
     */
    function retire() external onlyOwner {
        // Stop vault
        _pause();

        // Send remaining earningTokens to treasury (if not converted on last harvest because not reach minimun).
        uint256 earnedAmt = IERC20(earnedtoken).balanceOf(address(this));
        if (earnedAmt > 0) {
            IERC20(earnedtoken).safeTransfer(treasury, earnedAmt);
        }
    }

    /**
     * @dev Function to use from Governance Gnosis Safe multisig only in case tokens get stuck.
     * This is to be used if someone, for example, sends tokens to the contract by mistake.
     * There is no guarantee governance will vote to return these.
     */
    function inCaseTokensGetStuck(
        address _token,
        uint256 _amount,
        address _to
    ) public onlyGovernance {
        require(_to != address(0), "zero address");
        require(_token != earnedtoken, "!safe");
        require(_token != depositToken, "!safe");

        IERC20(_token).safeTransfer(_to, _amount);
    }
}
