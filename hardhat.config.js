require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
const GOERLI_PRIVATE_KEY = process.env.GOERLI_PRIVATE_KEY;
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

module.exports = {
	solidity: {
		compilers: [
			{
				version: "0.8.17",
				settings: {
					optimizer: {
						enabled: true,
						runs: 200,
					},
				},
			},
		],
	},
	etherscan: {
		apiKey: ETHERSCAN_API_KEY,
	},
	networks: {
		hardhat: {
			allowUnlimitedContractSize: true,
		},
		goerli: {
			url: `https://eth-goerli.alchemyapi.io/v2/${ALCHEMY_API_KEY}`,
			accounts: [GOERLI_PRIVATE_KEY],
		},
		mainnet: {
			url: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
			accounts: [],
		},
	},
};
