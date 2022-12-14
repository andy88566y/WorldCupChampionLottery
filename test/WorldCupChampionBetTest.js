const {
	time,
	loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const home = 0;
const away = 1;

describe("WorldCupChampionBet", function () {
	async function deployFixture() {
		const [dealer, playerA, playerB, playerC, playerD, playerE] =
			await ethers.getSigners();
		const year = 2022;

		const startTime = ethers.BigNumber.from("1669852800"); // 2022/12/1 00:00:00 UTC
		const endTime = ethers.BigNumber.from("1671375600"); // 2022/12/18 15:00:00 UTC WorkdCup 冠軍賽開踢前
		const finalTime = ethers.BigNumber.from("1671451200"); // 2022/12/19 12:00:00

		const Contract = await ethers.getContractFactory("WorldCupChampionBet");
		const contract = await Contract.deploy();
		await contract
			.connect(dealer)
			.initLottery(year, startTime, endTime, finalTime);

		return {
			contract,
			startTime,
			endTime,
			finalTime,
			year,
			dealer,
			playerA,
			playerB,
			playerC,
			playerD,
			playerE,
		};
	}
	async function deployPlayerMintTicketFixture() {
		const {
			contract,
			startTime,
			endTime,
			finalTime,
			year,
			dealer,
			playerA,
			playerB,
			playerC,
			playerD,
			playerE,
		} = await loadFixture(deployFixture);

		// 用 callStatic 來模擬 return value
		[ATicketId, AHomeOrAwayTicketId] = await contract
			.connect(playerA)
			.callStatic.mintLotteryTicket(home, {
				value: ethers.utils.parseEther("0.01"),
			});

		// 這邊的 return 會是 transaction
		await contract.connect(playerA).mintLotteryTicket(home, {
			value: ethers.utils.parseEther("0.01"),
		});

		[BTicketId, BHomeOrAwayTicketId] = await contract
			.connect(playerB)
			.callStatic.mintLotteryTicket(away, {
				value: ethers.utils.parseEther("0.01"),
			});
		await contract.connect(playerB).mintLotteryTicket(away, {
			value: ethers.utils.parseEther("0.01"),
		});

		[CTicketId, CHomeOrAwayTicketId] = await contract
			.connect(playerC)
			.callStatic.mintLotteryTicket(home, {
				value: ethers.utils.parseEther("0.1"),
			});
		await contract.connect(playerC).mintLotteryTicket(home, {
			value: ethers.utils.parseEther("0.1"),
		});

		[DTicketId, DHomeOrAwayTicketId] = await contract
			.connect(playerD)
			.callStatic.mintLotteryTicket(away, {
				value: ethers.utils.parseEther("0.1"),
			});
		await contract.connect(playerD).mintLotteryTicket(away, {
			value: ethers.utils.parseEther("0.1"),
		});

		[ETicketId, EHomeOrAwayTicketId] = await contract
			.connect(playerE)
			.callStatic.mintLotteryTicket(home, {
				value: ethers.utils.parseEther("1"),
			});
		await contract.connect(playerE).mintLotteryTicket(home, {
			value: ethers.utils.parseEther("1"),
		});

		return {
			contract,
			startTime,
			endTime,
			finalTime,
			year,
			dealer,
			playerA,
			playerB,
			playerC,
			playerD,
			playerE,
			ATicketId,
			AHomeOrAwayTicketId,
			BTicketId,
			BHomeOrAwayTicketId,
			CTicketId,
			CHomeOrAwayTicketId,
			DTicketId,
			DHomeOrAwayTicketId,
			ETicketId,
			EHomeOrAwayTicketId,
		};
	}
	async function deployDealerSettledFixture() {
		const {
			contract,
			startTime,
			endTime,
			finalTime,
			year,
			dealer,
			playerA,
			playerB,
			playerC,
			playerD,
			playerE,
		} = await loadFixture(deployPlayerMintTicketFixture);

		await time.increaseTo(finalTime);
		await time.increase(1);
		await contract.connect(dealer).settleLottery(away);

		return {
			contract,
			startTime,
			endTime,
			finalTime,
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
		it("Should set the right public variable ChampionLottery", async function () {
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

		it("Should set the right dealer", async function () {
			const { dealer, contract } = await loadFixture(deployFixture);

			expect(await contract.owner()).to.equal(dealer.address);
			expect(await contract.dealer()).to.equal(dealer.address);
		});

		it("Should fail unless startTime < endTime", async function () {
			// We don't use the fixture here because we want a different deployment
			const [dealer] = await ethers.getSigners();
			const Contract = await ethers.getContractFactory("WorldCupChampionBet");
			const contract = await Contract.deploy();
			const startTimeBad = ethers.BigNumber.from("1670940000");
			const endTimeBad = ethers.BigNumber.from("1670886000");
			const finalTimeBad = ethers.BigNumber.from("1670886001");
			await expect(
				contract
					.connect(dealer)
					.initLottery(2022, startTimeBad, endTimeBad, finalTimeBad)
			).to.be.revertedWith("time params not good");
		});
	});

	describe("Player Mint Ticket", function () {
		describe("Successfully Mint", function () {
			it("Should revert with the right error unless called by human", async function () {
				const { contract, playerA } = await loadFixture(deployFixture);
				const Foo = await ethers.getContractFactory("Foo");
				const otherContract = await Foo.deploy();

				await expect(
					otherContract.connect(playerA).mintLotteryTicket(contract.address)
				).to.be.revertedWith(
					"only humans allowed! (code present at caller address)"
				);
			});

			it("Should revert with the right error if called with wrong ether", async function () {
				const { contract, playerA } = await loadFixture(deployFixture);

				await expect(
					contract.connect(playerA).mintLotteryTicket(home, {
						value: ethers.utils.parseEther("0.0001"),
					})
				).to.be.revertedWith("msg.value has remainder");
				await expect(
					contract.connect(playerA).mintLotteryTicket(home, {
						value: ethers.utils.parseEther("0.0011"),
					})
				).to.be.revertedWith("msg.value has remainder");
			});

			describe("playerA bets home 10 bets", function () {
				it("Should set good allTickets homeTickets LogTicketMinted", async function () {
					const { contract, playerA, ATicketId, AHomeOrAwayTicketId } =
						await loadFixture(deployPlayerMintTicketFixture);

					[playerAddress, betCount, awayOrHome, withdrawed] =
						await contract.getTicket(ATicketId);

					expect(playerAddress).to.eq(playerA.address);
					expect(betCount).to.eq(10);
					expect(awayOrHome).to.eq(home);
					expect(withdrawed).to.eq(false);

					[playerAddress, betCount, awayOrHome, withdrawed] =
						await contract.getHomeTicket(AHomeOrAwayTicketId);

					expect(playerAddress).to.eq(playerA.address);
					expect(betCount).to.eq(10);
					expect(awayOrHome).to.eq(home);
					expect(withdrawed).to.eq(false);
				});
			});
			describe("playerB bets away 10 bets", function () {
				it("Should set good allTickets homeTickets LogTicketMinted", async function () {
					const { contract, playerB, BTicketId, BHomeOrAwayTicketId } =
						await loadFixture(deployPlayerMintTicketFixture);

					[playerAddress, betCount, awayOrHome, withdrawed] =
						await contract.getTicket(BTicketId);

					expect(playerAddress).to.eq(playerB.address);
					expect(betCount).to.eq(10);
					expect(awayOrHome).to.eq(away);
					expect(withdrawed).to.eq(false);

					[playerAddress, betCount, awayOrHome, withdrawed] =
						await contract.getAwayTicket(BHomeOrAwayTicketId);

					expect(playerAddress).to.eq(playerB.address);
					expect(betCount).to.eq(10);
					expect(awayOrHome).to.eq(away);
					expect(withdrawed).to.eq(false);
				});
			});
			describe("playerC bets home 100 bets", function () {
				it("Should set good allTickets homeTickets LogTicketMinted", async function () {
					const { contract, playerC, CTicketId, CHomeOrAwayTicketId } =
						await loadFixture(deployPlayerMintTicketFixture);

					await contract.connect(playerC).mintLotteryTicket(home, {
						value: ethers.utils.parseEther("0.1"),
					});

					[playerAddress, betCount, awayOrHome, withdrawed] =
						await contract.getTicket(CTicketId);

					expect(playerAddress).to.eq(playerC.address);
					expect(betCount).to.eq(100);
					expect(awayOrHome).to.eq(home);
					expect(withdrawed).to.eq(false);

					[playerAddress, betCount, awayOrHome, withdrawed] =
						await contract.getHomeTicket(CHomeOrAwayTicketId);

					expect(playerAddress).to.eq(playerC.address);
					expect(betCount).to.eq(100);
					expect(awayOrHome).to.eq(home);
					expect(withdrawed).to.eq(false);
				});
			});
			describe("playerD bets away 100 bets", function () {
				it("Should set good allTickets homeTickets LogTicketMinted", async function () {
					it("Should set good allTickets homeTickets LogTicketMinted", async function () {
						const { contract, playerD, DTicketId, DHomeOrAwayTicketId } =
							await loadFixture(deployPlayerMintTicketFixture);

						[playerAddress, betCount, awayOrHome, withdrawed] =
							await contract.getTicket(DTicketId);

						expect(playerAddress).to.eq(playerD.address);
						expect(betCount).to.eq(100);
						expect(awayOrHome).to.eq(away);
						expect(withdrawed).to.eq(false);

						[playerAddress, betCount, awayOrHome, withdrawed] =
							await contract.getAwayTicket(DHomeOrAwayTicketId);

						expect(playerAddress).to.eq(playerD.address);
						expect(betCount).to.eq(100);
						expect(awayOrHome).to.eq(away);
						expect(withdrawed).to.eq(false);
					});
				});
			});
			describe("playerE bets home 1000 bets", function () {
				it("Should set good allTickets homeTickets LogTicketMinted", async function () {
					const { contract, playerE, ETicketId, EHomeOrAwayTicketId } =
						await loadFixture(deployPlayerMintTicketFixture);

					[playerAddress, betCount, awayOrHome, withdrawed] =
						await contract.getTicket(ETicketId);

					expect(playerAddress).to.eq(playerE.address);
					expect(betCount).to.eq(1000);
					expect(awayOrHome).to.eq(home);
					expect(withdrawed).to.eq(false);

					[playerAddress, betCount, awayOrHome, withdrawed] =
						await contract.getHomeTicket(EHomeOrAwayTicketId);

					expect(playerAddress).to.eq(playerE.address);
					expect(betCount).to.eq(1000);
					expect(awayOrHome).to.eq(home);
					expect(withdrawed).to.eq(false);
				});
			});
		});
	});

	describe("Dealer settle down Lottery with param _champion = away", function () {
		it("Should revert with the right error if Lottery not ended", async function () {
			const { contract, dealer } = await loadFixture(
				deployPlayerMintTicketFixture
			);

			await expect(
				contract.connect(dealer).settleLottery(home)
			).to.be.revertedWithCustomError(contract, "Lottery__FinalNotEnded");
			await expect(
				contract.connect(dealer).settleLottery(away)
			).to.be.revertedWithCustomError(contract, "Lottery__FinalNotEnded");
		});
		it("Should revert with the right error if param _champion not good", async function () {
			const { contract, dealer, finalTime } = await loadFixture(
				deployPlayerMintTicketFixture
			);

			await time.increaseTo(finalTime);
			await time.increase(ethers.BigNumber.from("12200000000000000")); // 1.22E16

			await expect(
				contract.connect(dealer).settleLottery(3)
			).to.be.revertedWith("_awayOrHome param no good.");
		});
		it("Should set good commission, pricePerWinningBet, isSettled with Event LogSettleLottery", async function () {
			const { contract, dealer, startTime, endTime, year, finalTime } =
				await loadFixture(deployPlayerMintTicketFixture);
			await time.increaseTo(finalTime);
			await time.increase(1);
			await contract.connect(dealer).settleLottery(away);

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

			expect(_startTime).to.eq(startTime);
			expect(_endTime).to.eq(endTime);
			expect(_year).to.eq(year);
			expect(_champion).to.eq(away);
			expect(_commission).to.eq(ethers.BigNumber.from("12200000000000000"));
			expect(_pricePerWinningBet).to.eq(
				ethers.BigNumber.from("10980000000000000")
			);
			expect(_isSettled).to.eq(true);
			expect(_isCompleted).to.eq(false);
		});
	});

	describe("Dealer trigger Withdrawal", function () {
		it("Should revert with the right error if Lottery not Settled", async function () {
			const { contract, dealer } = await loadFixture(
				deployPlayerMintTicketFixture
			);
			await expect(
				contract.triggerWithdrawal(dealer.address)
			).to.be.revertedWithCustomError(contract, "Lottery__NotSettled");
		});
		it("Should transfer playerB right amount", async function () {
			const { contract, dealer, playerB } = await loadFixture(
				deployDealerSettledFixture
			);

			await expect(() =>
				contract.triggerWithdrawal(dealer.address)
			).to.changeEtherBalance(playerB.address, "109800000000000000");
		});

		it("Should emit event LogWinnerFundsTransfered", async function () {
			const { contract, dealer, playerB } = await loadFixture(
				deployDealerSettledFixture
			);

			await expect(contract.triggerWithdrawal(dealer.address))
				.to.emit(contract, "LogWinnerFundsTransfered")
				.withArgs(playerB.address, ethers.BigNumber.from("109800000000000000"));
		});

		it("Should transfer playerD right amount with LogWinnerFundsTransfered", async function () {
			const { contract, dealer, startTime, endTime, year, finalTime } =
				await loadFixture(deployDealerSettledFixture);
		});

		it("Should not transfer playerA any amount", async function () {
			const { contract, dealer, playerA, playerC, playerE } = await loadFixture(
				deployDealerSettledFixture
			);

			await expect(() =>
				contract.triggerWithdrawal(dealer.address)
			).to.changeEtherBalance(playerA.address, 0);
		});

		it("Should not transfer playerC any amount", async function () {
			const { contract, dealer, playerC } = await loadFixture(
				deployDealerSettledFixture
			);

			await expect(() =>
				contract.triggerWithdrawal(dealer.address)
			).to.changeEtherBalance(playerC.address, 0);
		});

		it("Should not transfer playerE any amount", async function () {
			const { contract, dealer, playerE } = await loadFixture(
				deployDealerSettledFixture
			);

			await expect(() =>
				contract.triggerWithdrawal(dealer.address)
			).to.changeEtherBalance(playerE.address, 0);
		});

		it("Should transfer right amount of commission with LogCommissionTransfered", async function () {
			const { contract, dealer, startTime, endTime, year, finalTime } =
				await loadFixture(deployDealerSettledFixture);
		});
	});

	describe("if no one wins", function () {
		it("dealer takes all", async function () {});
	});

	describe("if every one wins", function () {
		it("dealer takes 1% commission", async function () {});
		it("player takes 99% of original amount", async function () {});
	});
});
