const prompt = require('prompt');
const hre = require("hardhat");
const { type2Transaction } = require('./utils.js');

async function main() {
  console.log("Deploy dex contract and transfer ownership to Harvest Governance");
  console.log("Specify the dex contract name and constructor arguments (put 0 if no arguments):");
  prompt.start();
  const addresses = require("../test/test-config.js");

  const {dexName, constructorArguments} = await prompt.get(['dexName', 'constructorArguments']);

  const DexContract = artifacts.require(dexName);

  let dex;
  if (constructorArguments == 0){
    dex = await type2Transaction(DexContract.new);
  } else {
    dex = await type2Transaction(DexContract.new, constructorArguments);
  }

  console.log("Dex deployed at:", dex.creates);

  const dexContract = await DexContract.at(dex.creates);
  // await type2Transaction(dexContract.transferOwnership, addresses.Governance);

  console.log("Dex owner:", await dexContract.owner());
  console.log("Deployment complete. Please verify the contract source code and contact core team to have dex added to UL.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
