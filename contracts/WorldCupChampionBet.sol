//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

// load other contracts
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
// for debugging
import "hardhat/console.sol";

contract WorldCupChampionBet is Ownable {
    using Math for uint256;
    uint256 public constant commissionNumerator = 1;
    uint256 public constant commissionDenominator = 100;
    uint256 public constant betPrice = 0.001 ether;
    uint256 public constant home = 0;
    uint256 public constant away = 1;
    uint256 private constant scale = 1000000000;

    // State Variables
    struct ChampionLotteryStruct {
        uint256 startTime; // mint start
        uint256 endTime; // mint end
        uint256 finalTime; // 抓一個比賽一定會結束的時間 dealer 才輸入 champion
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
    error Lottery__FinalNotEnded();

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
            console.log(ChampionLottery.startTime);
            console.log(block.timestamp);
            console.log(ChampionLottery.endTime);

            revert Lottery__MintingPeriodClosed();
        }
        _;
    }

    /* @dev check that betting period is Ended
       so dealer can set champion
     */
    modifier isFinalEnded() {
        if (block.timestamp < ChampionLottery.finalTime) {
            revert Lottery__FinalNotEnded();
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

    modifier checkTime(
        uint256 _startTime,
        uint256 _endTime,
        uint256 _finalTime
    ) {
        require(_startTime < _endTime, "time params not good");
        require(_startTime < _finalTime, "time params not good");
        require(_endTime < _finalTime, "time params not good");
        _;
    }

    // functions

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
        uint256 _endTime,
        uint256 _finalTime
    ) external onlyOwner checkTime(_startTime, _endTime, _finalTime) {
        ChampionLottery = ChampionLotteryStruct({
            startTime: _startTime,
            endTime: _endTime,
            finalTime: _finalTime,
            year: _year,
            champion: 2,
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
        returns (uint256, uint256)
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

        uint256 homeOrAwayTicketId;
        if (_awayOrHome == home) {
            homeTickets.push(ticket);
            homeOrAwayTicketId = homeTickets.length - 1;
        } else {
            awayTickets.push(ticket);
            homeOrAwayTicketId = awayTickets.length - 1;
        }
        allTickets.push(ticket);

        emit LogTicketMinted(msg.sender, numBets);
        uint256 ticketId = allTickets.length - 1;
        return (ticketId, homeOrAwayTicketId);
    }

    /*
     * @title triggerLottery
     * @dev a function for owner to trigger lottery by setting championship of the WorldCup
     */
    function settleLottery(uint256 _champion)
        external
        isFinalEnded
        onlyOwner
        checkAwayOrHomeParam(_champion)
    {
        console.log("1");
        // ChampionLotteryStruct storage lottery = ChampionLottery;
        console.log("1");
        ChampionLottery.champion = _champion;
        console.log("2");
        uint256 winningBetsCount = 0;
        uint256 loseBetsCount = 0;
        uint256 totalBetsCount = 0;
        console.log("3");
        console.log("4");
        uint256 totalTicketsCount = allTickets.length;

        console.log(_champion);
        console.log(totalTicketsCount);
        for (uint256 i = 0; i < totalTicketsCount; i++) {
            totalBetsCount += allTickets[i].betCount;
            console.log("allTickets[i].awayOrHome");
            console.log(allTickets[i].awayOrHome);
            if (allTickets[i].awayOrHome == _champion) {
                winningBetsCount += allTickets[i].betCount;
            } else {
                loseBetsCount += allTickets[i].betCount;
            }
        }
        require(
            totalBetsCount == winningBetsCount + loseBetsCount,
            "Bad Contract"
        );

        uint256 commission;
        uint256 potSizeAfterCommission;
        uint256 pricePerWinningBet;

        if (winningBetsCount == 0) {
            pricePerWinningBet = 0;
            commission = address(this).balance;
            console.log("winningBetsCount == 0");
            console.log("commission: ");
            console.log(commission);
        } else {
            commission =
                (totalBetsCount * commissionNumerator * betPrice) /
                commissionDenominator;
            potSizeAfterCommission = totalBetsCount * betPrice - commission;
            pricePerWinningBet = potSizeAfterCommission / winningBetsCount;

            console.log("winningBetsCount > 0");
            console.log("totalBetsCount");
            console.log(totalBetsCount);
            console.log("betPrice");
            console.log(betPrice);
            console.log("commission: ");
            console.log(commission);
            console.log("potSizeAfterCommission");
            console.log(potSizeAfterCommission);
            console.log("winningBetsCount");
            console.log(winningBetsCount);
            console.log("pricePerWinningBet");
            console.log(pricePerWinningBet);
        }

        ChampionLottery.commission = commission;
        ChampionLottery.pricePerWinningBet = pricePerWinningBet;
        ChampionLottery.isSettled = true;
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
            ticket.withdrawed = true;
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

    function dealer() public view returns (address) {
        return owner();
    }

    /*
     * @title getLottery
     * @dev getter function for tickets bc its a struct
     */
    function getLottery()
        public
        view
        returns (
            uint256 startTime,
            uint256 endTime,
            uint256 year,
            uint256 champion,
            uint256 commission,
            uint256 pricePerWinningBet,
            bool isSettled,
            bool isCompleted
        )
    {
        startTime = ChampionLottery.startTime;
        endTime = ChampionLottery.endTime;
        year = ChampionLottery.year;
        champion = ChampionLottery.champion;
        commission = ChampionLottery.commission;
        pricePerWinningBet = ChampionLottery.pricePerWinningBet;
        isSettled = ChampionLottery.isSettled;
        isCompleted = ChampionLottery.isCompleted;
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
        Ticket memory ticket = allTickets[_ticketId];
        playerAddress = ticket.playerAddress;
        betCount = ticket.betCount;
        awayOrHome = ticket.awayOrHome;
        withdrawed = ticket.withdrawed;
    }

    function getHomeTicket(uint256 _ticketId)
        public
        view
        returns (
            address playerAddress,
            uint256 betCount, // scaled
            uint256 awayOrHome,
            bool withdrawed // 提錢與否
        )
    {
        Ticket memory ticket = homeTickets[_ticketId];
        playerAddress = ticket.playerAddress;
        betCount = ticket.betCount;
        awayOrHome = ticket.awayOrHome;
        withdrawed = ticket.withdrawed;
    }

    function getAwayTicket(uint256 _ticketId)
        public
        view
        returns (
            address playerAddress,
            uint256 betCount, // scaled
            uint256 awayOrHome,
            bool withdrawed // 提錢與否
        )
    {
        Ticket memory ticket = awayTickets[_ticketId];
        playerAddress = ticket.playerAddress;
        betCount = ticket.betCount;
        awayOrHome = ticket.awayOrHome;
        withdrawed = ticket.withdrawed;
    }

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
}
