const {
	time,
	loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("WorldCupChampionBet", function () {
	async function deployFixture() {
		const [dealer, playerA, playerB, playerC, playerD, playerE] =
			await ethers.getSigners();
		const year = 2022;

		const startTime = ethers.BigNumber.from("1670886000"); // 2022/12/13 00:00:00 UTC
		const endTime = ethers.BigNumber.from("1670940000"); // 2022/12/18 15:00:00 UTC WorkdCup 冠軍賽開踢前

		const Contract = await ethers.getContractFactory("WorldCupChampionBet");
		const contract = await Contract.deploy();
		await contract.connect(dealer).initLottery(year, startTime, endTime);

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
			const { contract, startTime, endTime, year } = await loadFixture(
				deployFixture
			);

			const [
				_startTime,
				_endTime,
				_year,
				_champion,
				_commission,
				_pricePerWinningBet,
				_isSettled,
				_isCompleted,
			] = await contract.getLottery();

			expect(ethers.BigNumber.from(_startTime)).to.equal(startTime);
			expect(ethers.BigNumber.from(_endTime)).to.equal(endTime);
			expect(_year).to.equal(year);
			expect(_champion).to.equal(2);
			expect(_commission).to.equal(0);
			expect(_pricePerWinningBet).to.equal(0);
			expect(_isSettled).to.equal(false);
			expect(_isCompleted).to.equal(false);
		});

		it.only("Should set the right dealer", async function () {
			const { dealer, contract } = await loadFixture(deployFixture);

			expect(await contract.owner()).to.equal(dealer.address);
			expect(await contract.dealer()).to.equal(dealer.address);
		});

		it.only("Should fail unless startTime < endTime", async function () {
			// We don't use the fixture here because we want a different deployment
			const [dealer] = await ethers.getSigners();
			const Contract = await ethers.getContractFactory("WorldCupChampionBet");
			const contract = await Contract.deploy();
			const startTimeBad = ethers.BigNumber.from("1670940000");
			const endTimeBad = ethers.BigNumber.from("1670886000");
			await expect(
				contract.connect(dealer).initLottery(2022, startTimeBad, endTimeBad)
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
