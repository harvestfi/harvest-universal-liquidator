const prompt = require('prompt');
const hre = require("hardhat");
const { type2Transaction } = require('./utils.js');
const deployments = require('../deployments.json');

async function main() {
  console.log("Update the poolId to swap a pair of tokens on Balancer");
  console.log("Specify token0, token1 and the poolId:");
  prompt.start();
  const addresses = require("../test/test-config.js");
  const balancerDexAddr = deployments.Dexes.balancer.address
  const BalDexContract = artifacts.require('BalancerDex');

  const {token0, token1, poolId} = await prompt.get(['token0', 'token1', 'poolId']);

  const balDexContract = await BalDexContract.at(balancerDexAddr);
  await type2Transaction(
    balDexContract.changePoolId,
    token0,
    token1,
    poolId
  );

  console.log("Set poolId:", await balDexContract.poolIds(token0, token1));
  console.log("New poolId set!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
