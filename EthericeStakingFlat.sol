// Sources flattened with hardhat v2.11.1 https://hardhat.org

// File @openzeppelin/contracts/security/ReentrancyGuard.sol@v4.7.3

// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts v4.4.1 (security/ReentrancyGuard.sol)

pragma solidity ^0.8.0;

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 */
abstract contract ReentrancyGuard {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        // On the first call to nonReentrant, _notEntered will be true
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");

        // Any calls to nonReentrant after this point will fail
        _status = _ENTERED;

        _;

        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = _NOT_ENTERED;
    }
}


// File @openzeppelin/contracts/utils/Context.sol@v4.7.3

// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts v4.4.1 (utils/Context.sol)

pragma solidity ^0.8.0;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}


// File @openzeppelin/contracts/access/Ownable.sol@v4.7.3

// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.7.0) (access/Ownable.sol)

pragma solidity ^0.8.0;

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * By default, the owner account will be the one that deploys the contract. This
 * can later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    constructor() {
        _transferOwnership(_msgSender());
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions anymore. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby removing any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}


// File contracts/EthericeStaking.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


interface TokenContractInterface {
    function calcDay() external view returns (uint256);

    function lobbyEntry(uint256 _day) external view returns (uint256);

    function balanceOf(address _owner) external view returns (uint256 balance);

    function transfer(address _to, uint256 _value)
        external
        returns (bool success);
    function allowance(address owner, address spender) external view returns (uint256);
    function transferFrom(
        address _from,
        address _to,
        uint256 _value
    ) external returns (bool success);

    function dev_addr() external view returns (address);
}

contract EthericeStaking is Ownable, ReentrancyGuard {
    event NewStake(
        address indexed addr,
        uint256 timestamp,
        uint256 indexed stakeId,
        uint256 stakeAmount,
        uint256 stakeDuration
    );
    event StakeCollected(
        address indexed addr,
        uint256 timestamp,
        uint256 indexed stakeId,
        uint256 stakeAmount,
        uint256 divsReceived
    );
    event SellStakeRequest(
        address indexed addr,
        uint256 timestamp,
        uint256 indexed stakeId,
        uint256 price
    );
    event CancelStakeSellRequest(
        address indexed addr,
        uint256 timestamp,
        uint256 indexed stakeId
    );
    event StakeSold(
        address indexed from,
        address indexed to,
        uint256 timestamp,
        uint256 price,
        uint256 indexed stakeId
    );
    event NewLoanRequest(
        address indexed addr,
        uint256 timestamp,
        uint256 loanAmount,
        uint256 interestAmount,
        uint256 duration,
        uint256 indexed stakeId
    );
    event LoanRequestFilled(
        address indexed filledBy,
        uint256 timestamp,
        address indexed receivedBy,
        uint256 loanamount,
        uint256 indexed stakeId
    );
    event LoanRepaid(
        address indexed paidTo,
        uint256 timestamp,
        uint256 interestAmount,
        uint256 loanamount,
        uint256 indexed stakeId
    );
    event CancelLoanRequest(
        address indexed addr,
        uint256 timestamp,
        uint256 indexed stakeId
    );

    struct stake {
        address owner;
        uint256 tokensStaked;
        uint256 startDay;
        uint256 endDay;
        uint256 forSalePrice;
        uint256 loanRepayments; // loan repayments made on this stake (deduct from divs on withdrawal)
        bool hasCollected;
    }

    /* A map for each  stakeId => struct stake */
    mapping(uint256 => stake) public mapStakes;
    uint256 public lastStakeIndex;
    /* Address => stakeId for a users stakes */
    mapping(address => uint256[]) internal _userStakes;

    struct loan {
        address requestedBy;
        address filledBy;
        uint256 loanAmount;
        uint256 loanInterest;
        uint256 loanDuration;
        uint256 startDay;
        uint256 endDay;
    }
    /* A map for each loan loanId => struct loan */
    mapping(uint256 => loan) public mapLoans;
    /* Address => stakeId for a users loans (address is the person filling the loan not receiving it) */
    mapping(address => uint256[]) internal _userLends;

    /** Hold amount of eth owed to dev fees */
    uint256 public devFees;

    /** Total ETH in the dividend pool for each day */
    mapping(uint256 => uint256) public dayDivendPool;

    /** Total tokens that have been staked each day */
    mapping(uint256 => uint256) public tokensInActiveStake;

    /** TokenContract object  */
    TokenContractInterface public _tokenContract;

    /** Ensures that token contract can't be changed for securiy */
    bool public tokenContractAddressSet = false;

    /** The amount of days each days divs would be spread over */
    uint256 public maxDividendRewardDays = 30;

    /** The max amount of days user can stake */
    uint256 public maxStakeDays = 60;

    constructor() {}

    receive() external payable {}

    /**
        @dev Set the contract address, must be run before any eth is posted
        to the contract
        @param _address the token contract address
    */
    function setTokenContractAddress(address _address) public onlyOwner {
        require(tokenContractAddressSet == false);
        tokenContractAddressSet = true;
        _tokenContract = TokenContractInterface(_address);
    }

    /**
        @dev runs when and eth is sent to the divs contract and distros
        it out across the total div days
    */
    function receiveDivs() external payable {
        // calcDay will return 2 when we're processesing the divs from day 1
        uint256 _day =  _tokenContract.calcDay();
        require(_day > 1);
        // We process divs for previous day;
        _day--;

        require(msg.sender == address(_tokenContract));
        uint256 _daysToSplitRewardsOver = _day < maxDividendRewardDays
            ? _day
            : maxDividendRewardDays;

        if(_day == 1) {
            _daysToSplitRewardsOver = 2 ;
        }
        
        uint256 _totalDivsPerDay = msg.value / _daysToSplitRewardsOver ;
        
        for (uint256 i = 1; i <= _daysToSplitRewardsOver; ) {
            dayDivendPool[_day + i] += _totalDivsPerDay;
            unchecked {
                i++;
            }
        }
    }

    /**
        @dev update the max days dividends are spread over
        @param _val the max days
    */
    function updateMaxDividendRewardDays(uint256 _val) external onlyOwner {
        require((_val <= 60 && _val >= 10));
        maxDividendRewardDays = _val;
    }

    /**
     * @dev set the max staking days
     * @param _amount the number of days
     */
    function updateMaxStakeDays(uint256 _amount) external onlyOwner {
        require((_amount <= 300 && _amount > 30));
        maxStakeDays = _amount;
    }

    /**
     * @dev User creates a new stake 
     * @param _amount total tokens to stake
     * @param _days must be less than max stake days. 
     * the more days the higher the gas fee
     */
    function newStake(uint256 _amount, uint256 _days) external {
        require(_days > 1, "Staking: Staking days < 1");
        require(
            _days <= maxStakeDays,
            "Staking: Staking days > max_stake_days"
        );

        uint256 _currentDay = _tokenContract.calcDay();
        require(_currentDay > 0, "Staking not enabled");

        // TODO confirm best point in this function todo the transfer
        bool success = _tokenContract.transferFrom(msg.sender, address(this), _amount);
        require(success, "Transfer failed");


        uint256 _stakeId = getNextStakeId();

        uint256 _endDay =_currentDay + 1 + _days;
        uint256 _startDay = _currentDay + 1;
        mapStakes[_stakeId] = stake({
            owner: msg.sender,
            tokensStaked: _amount,
            startDay: _startDay,
            endDay: _endDay,
            forSalePrice: 0,
            hasCollected: false,
            loanRepayments: 0
        });

        // todo loop potential to optimize?
        for (uint256 i = _startDay; i < _endDay ;) {
            tokensInActiveStake[i] += _amount;

            unchecked{ i++; }
        }

        _userStakes[msg.sender].push(_stakeId);

        emit NewStake(msg.sender, block.timestamp, _stakeId, _amount, _days);
    }

    /** 
     * @dev Get the next stake id index 
     */
    function getNextStakeId() internal returns (uint256) {
        lastStakeIndex++;
        return lastStakeIndex;
    }

    /**
     * @dev called by user to collect an outstading stake
     */
    function collectStake(uint256 _stakeId) external nonReentrant {
        stake memory _stake = mapStakes[_stakeId];
        uint256 currentDay = _tokenContract.calcDay();
        
        require(_stake.owner == msg.sender, "Unauthorised");
        require(_stake.hasCollected == false, "Already Collected");
        require( currentDay > _stake.endDay , "Stake hasn't ended");

        // Check for outstanding loans
        loan memory _loan = mapLoans[_stakeId];
        if(_loan.filledBy != address(0)){
            // Outstanding loan has not been paid off 
            // so do that now
            repayLoan(_stakeId);
        } else if (_loan.requestedBy != address(0)) {
            clearLoan(_stakeId);   
        }

         // Get the loan from storage agaign 
         // and check its cleard before we move on
        require(_loan.filledBy == address(0), "Stake has unpaid loan");
        require(_loan.requestedBy == address(0), "Stake has outstanding loan request");
            
        uint256 profit = calcStakeCollecting(_stakeId);
        mapStakes[_stakeId].hasCollected = true;

        // Send user the stake back
        bool success = _tokenContract.transfer(
            msg.sender,
            _stake.tokensStaked
        );
        require(success, "Transfer failed");

        // Send the user divs
        payable(_stake.owner).transfer(profit);

        emit StakeCollected(
            _stake.owner,
            block.timestamp,
            _stakeId,
            _stake.tokensStaked,
            profit
        );
    }

    /** 
     * Added an auth wrapper to the cancel loan request
     * so it cant be canceled by just anyone externally
     */
    function cancelLoanRequest(uint256 _stakeId) external {
        stake memory _stake = mapStakes[_stakeId];
        require(msg.sender == _stake.owner, "Unauthorised");
        _cancelLoanRequest(_stakeId);
    }

    function _cancelLoanRequest(uint256 _stakeId) internal {
        mapLoans[_stakeId] = loan({
            requestedBy: address(0),
            filledBy: address(0),
            loanAmount: 0,
            loanInterest: 0,
            loanDuration: 0,
            startDay: 0,
            endDay: 0
        });

        emit CancelLoanRequest(
            msg.sender,
            block.timestamp,
            _stakeId
        );
    }

    function clearLoan(uint256 _stakeId) internal {
        loan memory _loan = mapLoans[_stakeId];
         if(_loan.filledBy == address(0)) {
                // Just an unfilled loan request so we can cancel it off
                _cancelLoanRequest(_stakeId);
            } else  {
                // Loan was filled so if its not been claimed yet we need to 
                // send the repayment back to the loaner
                repayLoan(_stakeId);
            }
    }

    /**
     * @dev Calculating a stakes ETH divs payout value by looping through each day of it
     * @param _stakeId Id of the target stake
     */
    function calcStakeCollecting(uint256 _stakeId)
        public
        view
        returns (uint256)
    {
        uint256 currentDay = _tokenContract.calcDay();
        uint256 userDivs;
        stake memory _stake = mapStakes[_stakeId];
        // @loop can we optimize?
        for (
            uint256 _day = _stake.startDay;
            _day < _stake.endDay && _day < currentDay;
        ) {
            userDivs +=
                (dayDivendPool[_day] * _stake.tokensStaked) /
                tokensInActiveStake[_day];

                unchecked {
                    _day++;
                }
        }

        delete currentDay;
        delete _stake;

        // remove any loans returned amount from the total
        return (userDivs - _stake.loanRepayments);
    }

    function listStakeForSale(uint256 _stakeId, uint256 _price) external {
        stake memory _stake = mapStakes[_stakeId];
        require(_stake.owner == msg.sender, "Unauthorised");
        require(_stake.hasCollected == false, "Already Collected");

        uint256 _currentDay = _tokenContract.calcDay();
        require(_stake.endDay >= _currentDay, "Stake has ended");

         // can't list a stake for sale whilst we have an outstanding loan against it
        loan memory _loan = mapLoans[_stakeId];
        require(_loan.requestedBy == address(0), "Stake has an outstanding loan request");

        mapStakes[_stakeId].forSalePrice = _price;

        emit SellStakeRequest(msg.sender, block.timestamp, _stakeId, _price);

        delete _currentDay;
        delete _stake;
    }

    function cancelStakeSellRequest(uint256 _stakeId) external {
        require(mapStakes[_stakeId].owner == msg.sender, "Unauthorised");
        mapStakes[_stakeId].forSalePrice = 0;

        emit CancelStakeSellRequest(
            msg.sender,
            block.timestamp,
            _stakeId
        );
    }

    function buyStake(uint256 _stakeId) external payable nonReentrant {
        stake memory _stake = mapStakes[_stakeId];
        require(_stake.forSalePrice > 0, "Stake not for sale");
        require(_stake.owner != msg.sender, "Can't buy own stakes");

        loan memory _loan = mapLoans[_stakeId];
        require(_loan.filledBy == address(0), "Can't buy stake with unpaid loan");

        uint256 _currentDay = _tokenContract.calcDay();
        require(
            _stake.endDay > _currentDay,
            "stake can't be brought after it has ended"
        );
        require(_stake.hasCollected == false, "Stake already collected");
        require(msg.value >= _stake.forSalePrice, "msg.value is < stake price");

        uint256 _sellAmount = (_stake.forSalePrice * 90) / 100;
        uint256 _devShare = msg.value - _sellAmount;
        dayDivendPool[_currentDay] += _devShare / 2;
        devFees += _devShare / 2;

        _userStakes[msg.sender].push(_stakeId);

        mapStakes[_stakeId].owner = msg.sender;
        mapStakes[_stakeId].forSalePrice = 0;

        payable(_stake.owner).transfer(_sellAmount);

        emit StakeSold(
            _stake.owner,
            msg.sender,
            block.timestamp,
            _sellAmount,
            _stakeId
        );

        delete _stake;
    }

    /**
     * @dev send the devFees to the dev wallet
     */
    function flushDevTaxes() external nonReentrant{
        address _devWallet = _tokenContract.dev_addr();
        uint256 _devFees = devFees;
        devFees = 0;
        payable(_devWallet).transfer(_devFees);
    }

    function requestLoanOnStake(
        uint256 _stakeId,
        uint256 _loanAmount,
        uint256 _interestAmount,
        uint256 _duration
    ) external {

        stake memory _stake = mapStakes[_stakeId];
        require(_stake.owner == msg.sender, "Unauthorised");
        require(_stake.hasCollected == false, "Already Collected");

        uint256 _currentDay = _tokenContract.calcDay();
        require(_stake.endDay > (_currentDay + _duration), "Loan must expire before stake end day");

        loan memory _loan = mapLoans[_stakeId];
        require(_loan.filledBy == address(0), "Stake already has outstanding loan");

        uint256 userDivs = calcStakeCollecting(_stakeId);
        require(userDivs > ( _stake.loanRepayments + _loanAmount + _interestAmount), "Loan amount is > divs earned so far");


        mapLoans[_stakeId] = loan({
            requestedBy: msg.sender,
            filledBy: address(0),
            loanAmount: _loanAmount,
            loanInterest: _interestAmount,
            loanDuration: _duration,
            startDay: 0,
            endDay: 0
        });

        emit NewLoanRequest(
            msg.sender,
            block.timestamp,
            _loanAmount,
            _interestAmount,
            _duration,
            _stakeId
        );
    }

    function fillLoan(uint256 _stakeId) external payable {
        stake memory _stake = mapStakes[_stakeId];
        loan memory _loan = mapLoans[_stakeId];
        
        require(_loan.requestedBy != address(0), "No active loan on this stake");
        require(_stake.hasCollected == false, "Stake Collected");

        uint256 _currentDay = _tokenContract.calcDay();
        require(_stake.endDay > _currentDay, "Stake ended");

        
        require(_loan.filledBy == address(0), "Already filled");
        require(_loan.loanAmount <= msg.value, "Not enough eth");

        require(msg.sender != _stake.owner, "No lend on own stakes");

        if (_stake.forSalePrice > 0) {
            // Can't sell a stake with an outstanding loan so we remove from sale
            mapStakes[_stakeId].forSalePrice = 0;
        }

        mapLoans[_stakeId] = loan({
            requestedBy: _loan.requestedBy,
            filledBy: msg.sender,
            loanAmount: _loan.loanAmount,
            loanInterest: _loan.loanInterest,
            loanDuration: _loan.loanDuration,
            startDay: _currentDay + 1,
            endDay: _currentDay + 1 + _loan.loanDuration
        });

        // Deduct fees
        uint256 _loanAmount = (_loan.loanAmount * 98) / 100;
        uint256 _devShare = msg.value - _loanAmount;
        dayDivendPool[_currentDay] += _devShare / 2;
        devFees += _devShare / 2;

        // Send the loan to the requester
        payable(_loan.requestedBy).transfer(_loanAmount);

        _userLends[msg.sender].push(_stakeId);

        emit LoanRequestFilled(
            msg.sender,
            block.timestamp,
            _stake.owner,
            _loanAmount,
            _stakeId
        );
    }

    /**
     * This function is public so any can call and it
     * will repay the loan to the loaner. Stakes can only
     * have 1 active loan at a time so if the staker wants
     * to take out a new loan they will have to call the 
     * repayLoan function first to pay the outstanding 
     * loan.
     * This avoids us having to use an array and loop
     * through loans to see which ones need paying back
     * @param _stakeId the stake to repay the loan from 
     */
    function repayLoan(uint256 _stakeId) public {
        loan memory _loan = mapLoans[_stakeId];
        require(_loan.requestedBy != address(0), "No loan on stake");
        require(_loan.filledBy != address(0), "Loan not filled");

        uint256 _currentDay = _tokenContract.calcDay();
        require(_loan.endDay <= _currentDay, "Loan duration not met");

        // Save the payment here so its deducted from the divs 
        // on withdrawal
        mapStakes[_stakeId].loanRepayments += (  _loan.loanAmount + _loan.loanInterest );

        _cancelLoanRequest(_stakeId);
        
        payable(_loan.filledBy).transfer(_loan.loanAmount + _loan.loanInterest);

        // address indexed paidTo,
        // uint256 timestamp,
        // address interestAmount,
        // uint256 loanamount,
        // uint256 stakeId
        emit LoanRepaid(
            _loan.filledBy,
            block.timestamp,
            _loan.loanInterest,
            _loan.loanAmount,
            _stakeId
        );
    }

    function totalDivendPool() external view returns (uint256) {
        uint256 _day = _tokenContract.calcDay();
        // Prevent start day going to -1 on day 0
        if(_day <= 0) {
            return 0;
        }
        uint256 _startDay = (_day - 1);
        uint256 _total;
        for (uint256 i = 1; i <= (_startDay +  maxDividendRewardDays) ; ) {
            _total += dayDivendPool[_startDay + i];
            unchecked {
                 i++;
            }
        }
    
        return _total;
    }

    function userStakes(address _address) external view returns(uint256[] memory){
        return _userStakes[_address];
    }

    function userLends(address _address) external view returns (uint256[] memory) {
        return _userLends[_address];
    }
}
