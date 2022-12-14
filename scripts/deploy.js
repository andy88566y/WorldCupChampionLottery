// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers } = require("hardhat");
const hre = require("hardhat");

const year = 2022;
const startTime = ethers.BigNumber.from("1669852800");
const endTime = ethers.BigNumber.from("1671375600");
const finalTime = ethers.BigNumber.from("1671393600");

async function main() {
	const [dealer] = await ethers.getSigners();
	const Bet = await hre.ethers.getContractFactory("WorldCupChampionBet");
	const bet = await Bet.deploy();

	await bet.connect(dealer).deployed();

	console.log(`WorldCupChampionBet deployed. address: ${bet.address}`);

	await bet.connect(dealer).initLottery(year, startTime, endTime, finalTime);
	console.log(
		`Triggered: WorldCupChampionBet.initLottery(${year}, ${startTime}, ${endTime}, ${finalTime})`
	);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
