//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

// load other contracts
import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
// for debugging
import "hardhat/console.sol";

contract WorldCupChampionLottery is OwnableUpgradeable {
    using MathUpgradeable for uint256;
    uint256 public constant commissionNumerator = 1;
    uint256 public constant commissionDenominator = 100;
    uint256 public constant betPrice = 0.001 ether;
    uint256 public constant home = 0;
    uint256 public constant away = 1;
    uint256 constant scale = 10**18;

    // State Variables
    struct ChampionLotteryStruct {
        uint256 startTime;
        uint256 endTime;
        uint256 year; // 世足賽舉辦年
        // 莊家輸入的勝利的那邊. 0 代表主場, 1 代表客場.
        uint256 champion;
        // 紀錄 commission 會是一個乘過 scale 後的數字
        uint256 commission;
        // 輸入 champion 後，計算贏錢的人每注賠率
        // 會是一個以 ether 為單位的數字
        uint256 pricePerWinningBet;
        bool isSettled; // 莊家輸入完 champion 後標註為 true。此後贏家才可以領錢。
        bool isCompleted; // 莊家分錢完畢後標註為 true。遊戲結束
    }
    struct Ticket {
        // 記錄玩家地址以及下注量
        address playerAddress;
        uint256 betCount; // scaled
        uint256 awayOrHome;
        bool withdrawed; // 提錢與否
    }

    // mapping(uint256 => ChampionLotteryStruct) public ChampionLotteries; // key is year
    ChampionLotteryStruct public ChampionLottery;
    // mapping(address => Ticket[]) public playerToTickets; // key is player address
    Ticket[] public homeTickets;
    Ticket[] public awayTickets;
    Ticket[] public allTickets;
    // mapping(address => bool) public players; // key is player address

    //== Events ==//

    // emit when lottery created
    event LogNewLottery(address creator, uint256 startTime, uint256 endTime);
    // emit when user purchases tix
    event LogTicketMinted(address player, uint256 numBets);
    // emit when dealer sets Champion
    event LogSettleLottery(
        uint256 champion,
        uint256 totalTicketsCount,
        uint256 totalBetsCount,
        uint256 winningBetsCount,
        uint256 commission,
        uint256 pricePerWinningBet
    );
    // emit when funds transfer by winner
    event LogWinnerFundsTransfered(
        address winnerAddress,
        uint256 withdrawalAmount
    );
    // emit when dealer transfer commission
    event LogCommissionTransfered(
        address commissionDestAddr,
        uint256 withdrawalAmount,
        uint256 contractRemainBalance
    );

    // emit when cancel Lottery lead to return money
    event LogCancelFundsTransfered(
        address playerAddress,
        uint256 transferAmount
    );

    //== Errors ==//
    error Lottery__ActiveLotteryExists();
    error Lottery__MintingPeriodClosed();
    error Lottery__MintingNotEnded();
    error Lottery__NotCompleted();

    // modifiers
    modifier onlyHuman() {
        uint256 size;
        address addr = msg.sender;
        assembly {
            size := extcodesize(addr)
        }
        require(
            size == 0,
            "only humans allowed! (code present at caller address)"
        );
        _;
    }

    /* @dev check that betting period is Active
     */
    modifier isLotteryActive() {
        if (
            block.timestamp > ChampionLottery.endTime ||
            block.timestamp < ChampionLottery.startTime
        ) {
            revert Lottery__MintingPeriodClosed();
        }
        _;
    }

    /* @dev check that betting period is Ended
       so dealer can set champion
     */
    modifier isLotteryMintingEnded() {
        if (block.timestamp < ChampionLottery.endTime) {
            revert Lottery__MintingNotEnded();
        }
        _;
    }

    /* @dev check that Lottery period is Ended
       so dealer can set champion
     */
    modifier isLotteryCompleted() {
        if (ChampionLottery.isCompleted != true) {
            revert Lottery__NotCompleted();
        }
        _;
    }

    modifier checkAwayOrHomeParam(uint256 _awayOrHome) {
        require(
            _awayOrHome == away || _awayOrHome == home,
            "_awayOrHome param no good."
        );
        _;
    }

    // functions

    /*
     * @title cancelLottery
     * @dev 意外發生時，Dealer 能做的最後防線，取消賭盤並退款
     */
    function cancelLottery() external onlyOwner {
        _resetLottery();
    }

    function _resetLottery() private onlyOwner {
        Ticket[] storage tickets = allTickets;
        uint256 length = tickets.length;
        for (uint256 i = 0; i <= length; i++) {
            Ticket storage ticket = tickets[i];
            uint256 transfer = ticket.betCount * betPrice;
            payable(ticket.playerAddress).transfer(transfer);
            emit LogCancelFundsTransfered(ticket.playerAddress, transfer);
        }
    }

    /*
     * @title initLottery
     * @dev A function to initialize a lottery
     * @param uint256 _year: WorldCup year
     * @param uint256 _startTime: start of minting ticket period, unixtime
     * @param uint256 _endTime: end of minting ticket period, unixtime
     */
    function initLottery(
        uint256 _year,
        uint256 _startTime,
        uint256 _endTime
    ) external onlyOwner {
        ChampionLottery = ChampionLotteryStruct({
            startTime: _startTime,
            endTime: _endTime,
            year: _year,
            champion: 3,
            commission: 0,
            pricePerWinningBet: 0,
            isSettled: false,
            isCompleted: false
        });
        emit LogNewLottery(msg.sender, _startTime, _endTime);
    }

    /*
     * @title mintLotteryTicket
     * @dev a function for players to mint lottery tix
     */
    function mintLotteryTicket(uint256 _awayOrHome)
        external
        payable
        onlyHuman
        isLotteryActive
        checkAwayOrHomeParam(_awayOrHome)
        returns (uint256 ticketId)
    {
        uint256 remainder = msg.value % (betPrice);
        require(remainder == 0, "msg.value has remainder");

        uint256 numBets = msg.value / (betPrice);
        require(numBets >= 1);

        Ticket memory ticket = Ticket({
            playerAddress: msg.sender,
            awayOrHome: _awayOrHome,
            betCount: numBets,
            withdrawed: false
        });

        if (_awayOrHome == home) {
            homeTickets.push(ticket);
        } else {
            awayTickets.push(ticket);
        }
        allTickets.push(ticket);

        emit LogTicketMinted(msg.sender, numBets);
        ticketId = allTickets.length;
    }

    /*
     * @title triggerLottery
     * @dev a function for owner to trigger lottery by setting championship of the WorldCup
     */
    function settleLottery(uint256 _champion)
        external
        isLotteryMintingEnded
        onlyOwner
        checkAwayOrHomeParam(_champion)
    {
        ChampionLotteryStruct storage lottery = ChampionLottery;
        lottery.champion = _champion;
        uint256 winningBetsCount = 0;
        uint256 loseBetsCount = 0;
        uint256 totalBetsCount = 0;
        Ticket[] storage tickets = allTickets;
        uint256 totalTicketsCount = allTickets.length;
        for (uint256 i = 0; i < totalTicketsCount; i++) {
            totalBetsCount += tickets[i].betCount;
            if (tickets[i].awayOrHome == _champion) {
                winningBetsCount += tickets[i].betCount;
            } else {
                loseBetsCount += tickets[i].betCount;
            }
        }
        require(
            totalBetsCount == winningBetsCount + loseBetsCount,
            "Bad Contract"
        );

        uint256 commission = (totalBetsCount * commissionNumerator * betPrice) /
            commissionDenominator;
        uint256 potSizeAfterCommission = totalBetsCount * betPrice - commission;
        uint256 pricePerWinningBet = potSizeAfterCommission / winningBetsCount;
        lottery.commission = potSizeAfterCommission;
        lottery.pricePerWinningBet = pricePerWinningBet;
        lottery.isSettled = true;
        emit LogSettleLottery(
            _champion,
            totalTicketsCount,
            totalBetsCount,
            winningBetsCount,
            commission,
            pricePerWinningBet
        );
    }

    /*
     * @title triggerDepositWinnings
     * @dev function to deposit winnings for user withdrawal pattern
     * then reset lottery params for new one to be created
     */
    function triggerWithdrawal(address payable commissionDestAddr)
        external
        isLotteryCompleted
        onlyOwner
    {
        ChampionLottery.isCompleted = true;
        uint256 pricePerWinningBet = ChampionLottery.pricePerWinningBet;
        uint256 length;
        Ticket[] storage tickets;
        if (ChampionLottery.champion == home) {
            length = homeTickets.length;
            tickets = homeTickets;
        } else {
            length = homeTickets.length;
            tickets = homeTickets;
        }
        for (uint256 i = 0; i <= length; i++) {
            Ticket storage ticket = tickets[i];
            uint256 withdrawnAmount = ticket.betCount * pricePerWinningBet;
            ticket.withdrawed = false;
            payable(ticket.playerAddress).transfer(withdrawnAmount);
            emit LogWinnerFundsTransfered(
                ticket.playerAddress,
                withdrawnAmount
            );
        }
        uint256 commission = address(this).balance;
        commissionDestAddr.transfer(commission);
        emit LogCommissionTransfered(
            commissionDestAddr,
            commission,
            address(this).balance
        );
    }

    /*
     * @title getTicket
     * @dev getter function for tickets bc its a struct
     */
    function getTicket(uint256 _ticketId)
        public
        view
        returns (
            address playerAddress,
            uint256 betCount, // scaled
            uint256 awayOrHome,
            bool withdrawed // 提錢與否
        )
    {
        playerAddress = allTickets[_ticketId].playerAddress;
        betCount = allTickets[_ticketId].betCount;
        awayOrHome = allTickets[_ticketId].awayOrHome;
        withdrawed = allTickets[_ticketId].withdrawed;
    }
}
