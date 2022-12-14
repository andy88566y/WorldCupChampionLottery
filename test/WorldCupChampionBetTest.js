const {
	time,
	loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const BigNumber = require("bignumber.js");
const { ethers } = require("hardhat");

describe("WorldCupChampionBet", function () {
	async function deployFixture() {
		const [dealer, playerA, playerB, playerC, playerD, playerE] =
			await ethers.getSigners();
		const year = 2022;
		console.log("123");

		const startTime = ethers.BigNumber.from("1670886000"); // 2022/12/13 00:00:00 UTC
		const endTime = ethers.BigNumber.from("1670940000"); // 2022/12/18 15:00:00 UTC WorkdCup 冠軍賽開踢前

		console.log("456");
		const Contract = await ethers.getContractFactory("WorldCupChampionBet");
		console.log("789");
		const contract = await Contract.deploy();
		console.log("10");
		console.log(await contract.owner());
		await contract.connect(dealer).initLottery(year, startTime, endTime);
		console.log("11");

		return {
			contract,
			startTime,
			endTime,
			year,
			dealer,
			playerA,
			playerB,
			playerC,
			playerD,
			playerE,
		};
	}

	describe("Deployment", function () {
		it.only("Should set the right public variable ChampionLottery", async function () {
			console.log("asdf");
			const { contract, startTime, endTime, year } = await loadFixture(
				deployFixture
			);

			console.log("jkl");
			// console.log(contract.ChampionLottery().startTime());

			// expect(
			// 	BigNumber(await contract.ChampionLottery().startTime().toString())
			// ).to.equal(startTime);
		});

		it("Should set the right dealer", async function () {
			const { dealer, contract } = await loadFixture(deployFixture);

			expect(await contract.dealer()).to.equal(dealer.address);
		});

		it("Should fail unless startTime < endTime", async function () {
			// We don't use the fixture here because we want a different deployment
			const latestTime = await time.latest();
			const Contract = await ethers.getContractFactory("WorldCupChampionBet");
			await expect(
				Contract.deploy(latestTime, latestTime, 2022)
			).to.be.revertedWith("_startTime >= _endTime");
		});
	});

	describe("Play Mint Ticket", function () {
		describe("Successfully Mint", function () {
			it("Should revert with the right error unless called by human", async function () {});

			describe("playerA bets home 10 bets", function () {
				it("Should set good allTickets homeTickets LogTicketMinted", async function () {});
			});
			describe("playerB bets away 100 bets", function () {
				it("Should set good allTickets homeTickets LogTicketMinted", async function () {});
			});
			describe("playerC bets home 100 bets", function () {
				it("Should set good allTickets homeTickets LogTicketMinted", async function () {});
			});
			describe("playerd bets away 1000 bets", function () {
				it("Should set good allTickets homeTickets LogTicketMinted", async function () {});
			});
			describe("playerE bets home 1000 bets", function () {
				it("Should set good allTickets homeTickets LogTicketMinted", async function () {});
			});
			describe("getTicket()", function () {});
		});
	});

	describe("Dealer settle down Lottery with param _champion = away", function () {
		it("Should revert with the right error if Lottery not ended", async function () {});
		it("Should revert with the right error if param _champion not good", async function () {});
		it("Should set good commission pricePerWinningBet isSettled with Event LogSettleLottery", async function () {});
	});

	describe("Dealer trigger Withdrawal", function () {
		it("Should revert with the right error if Lottery not Completed", async function () {});
		it("Should transfer playerB right amount with LogWinnerFundsTransfered", async function () {});
		it("Should transfer playerD right amount with LogWinnerFundsTransfered", async function () {});
		it("Should transfer right amount of commission with LogCommissionTransfered", async function () {});
	});
});
