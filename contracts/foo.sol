//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface Bet {
    function mintLotteryTicket(uint256 _awayOrHome) external payable;
}

contract Foo {
    function mintLotteryTicket(address _addr) public payable {
        Bet bet = Bet(_addr);
        bet.mintLotteryTicket(0);
    }
}
