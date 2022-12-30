const prompt = require('prompt');
const hre = require("hardhat");
const { type2Transaction } = require('./utils.js');
const deployments = require('../deployments.json');

async function main() {
  console.log("Update the fee to swap a pair of tokens on UniV3");
  console.log("Specify token0, token1 and the fee:");
  prompt.start();
  const addresses = require("../test/test-config.js");
  const dexAddr = deployments.Dexes.uniV3.address
  const DexContract = artifacts.require('UniV3Dex');

  const {token0, token1, fee} = await prompt.get(['token0', 'token1', 'fee']);

  console.log("Old fee:    ", await dexContract.pairFee(token0, token1));

  const dexContract = await DexContract.at(dexAddr);
  await type2Transaction(
    dexContract.setFee,
    token0,
    token1,
    fee
  );

  console.log("Set new fee:", await dexContract.pairFee(token0, token1));
  console.log("Now fee set!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
