// Utilities
const Utils = require("./utilities/Utils.js");
const addresses = require("./test-config.js");
const { impersonates } = require("./utilities/hh-utils.js");

const BigNumber = require("bignumber.js");
const IERC20 = artifacts.require("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20");

const OneInchDex = artifacts.require("OneInchDex");
const UniversalLiquidator = artifacts.require("UniversalLiquidator");
const IUniversalLiquidatorRegistry = artifacts.require("IUniversalLiquidatorRegistry");
const WETH = artifacts.require("WETH9");

//This test was developed at blockNumber 13032025

// Vanilla Mocha test. Increased compatibility with tools that integrate Mocha.
describe("OneInch Dex", function() {
  let accounts;
  let farmerBalance;

  // external setup
  let ulAddr = "0x875680A120597732F92Bf649cacfEb308e54dbA4";
  let ulRegistryAddr = "0x7882172921E99d590E097cD600554339fBDBc480";
  let oneInchAddr = "0x111111111117dC0aa78b770fA6A738034120C302";
  let swiseAddr = "0x48C3399719B582dD63eB5AADf12A40B4C3f52FA2";
  let swiseWhale = "0x4DB49F084605ed97b30CF9Ae82702D8AAE9A989f";
  let referral = "0xd00FCE4966821Da1EdD1221a02aF0AFc876365e4";
  let oneInchDexHex = "0xd9bf0c0ec020d1a26ba6698a24db3a538215d8fbf30588bddde694887c4cb55e";
  let universalLiquidator;
  let registry;
  let oneInch;
  let swise;

  // parties in the protocol
  let governance;
  let farmer1;

  async function setupExternalContracts() {
    console.log("Setting up external contracts");
    universalLiquidator = await UniversalLiquidator.at(ulAddr);
    registry = await IUniversalLiquidatorRegistry.at(ulRegistryAddr);
    oneInch = await IERC20.at(oneInchAddr)
    swise = await IERC20.at(swiseAddr);
  }

  async function setupBalance(){
    let etherGiver = accounts[9];
    // Give whale some ether to make sure the following actions are good
    await web3.eth.sendTransaction({ from: etherGiver, to: swiseWhale, value: 5e18});
    farmerBalance = new BigNumber(await swise.balanceOf(swiseWhale));
    console.log("Farmer balance:", farmerBalance.toFixed());
    await swise.transfer(farmer1, farmerBalance, { from: swiseWhale });
    farmerBalance = new BigNumber(await swise.balanceOf(farmer1));
    console.log("Farmer balance:", farmerBalance.toFixed());
  }

  before(async function () {
    console.log("here1");
    governance = "0xf00dD244228F51547f0563e60bCa65a30FBF5f7f";
    console.log('here2');
    accounts = await web3.eth.getAccounts();
    console.log('here3');

    farmer1 = accounts[1];
    console.log('here4');

    // impersonate accounts
    await impersonates([governance, swiseWhale]);
    console.log('here5');

    await setupExternalContracts();
    console.log('here6');
    await setupBalance();
    console.log('here7');
  });

  describe("Happy path", function() {
    it("Swapping SWISE for OneInch through OneInch", async function() {
      console.log("Deploying Dex");
      dex = await OneInchDex.new(referral, {from: governance});
      console.log("Dex deployed at:", dex.address);

      console.log("Adding Dex to UL");
      await universalLiquidator.addDex(oneInchDexHex, dex.address, {from: governance});
      console.log("Added Dex with name:", oneInchDexHex);
      assert.equal(await universalLiquidator.getDex(oneInchDexHex), dex.address);

      console.log("Setting path");
      await registry.setPath(
        oneInchDexHex,
        swiseAddr,
        oneInchAddr,
        [swiseAddr, oneInchAddr],
        {from: governance}
      );

      console.log("Making swap on new Dex");
      await swise.approve(ulAddr, farmerBalance, {from: farmer1});
      await universalLiquidator.swapTokenOnDEX(farmerBalance, 1, farmer1, oneInchDexHex, [swiseAddr, oneInchAddr], {from: farmer1});
      let farmerSwiseBalance = new BigNumber(await swise.balanceOf(farmer1));
      let farmer1inchBalance = new BigNumber(await oneInch.balanceOf(farmer1));
      console.log("Swapped", (farmerBalance.minus(farmerSwiseBalance)).toFixed(),"Swise for", farmer1inchBalance.toFixed(), "1INCH");
    });
  });
});
