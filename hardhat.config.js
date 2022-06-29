require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-truffle5");

const keys = require('./dev-keys.json');
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      accounts: {
        mnemonic: keys.mnemonic,
      },
      allowUnlimitedContractSize: true,
      forking: {
        //url: "https://mainnet.infura.io/v3/" + keys.infuraKey,
        url: 'https://eth-mainnet.alchemyapi.io/v2/' + keys.alchemyKeyMainnet,
        // blockNumber: 15040516, // <-- edit here
      },
    },
    mainnet: {
      url: 'https://eth-mainnet.alchemyapi.io/v2/' + keys.alchemyKeyMainnet,
      accounts: {
        mnemonic: keys.mnemonic,
      },
    },
  },
  solidity: {
    compilers: [
      {
        version: '0.6.12',
        settings: {
          optimizer: {
            enabled: true,
            runs: 150,
          },
        },
      },
    ],
  },
  mocha: {
    timeout: 2000000,
  },
};
