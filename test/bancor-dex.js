// Utilities
const Utils = require("./utilities/Utils.js");
const addresses = require("./test-config.js");
const { impersonates } = require("./utilities/hh-utils.js");

const BigNumber = require("bignumber.js");
const { artifacts } = require("hardhat");
const IERC20 = artifacts.require("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20");

const BancorDex = artifacts.require("BancorDex");
const UniversalLiquidator = artifacts.require("UniversalLiquidator");
const IUniversalLiquidatorRegistry = artifacts.require("IUniversalLiquidatorRegistry");
const WETH = artifacts.require("WETH9");

//This test was developed at blockNumber 15040516

// Vanilla Mocha test. Increased compatibility with tools that integrate Mocha.
describe("Bancor Dex", function() {
  let accounts;
  let farmerBalance;

  // external setup
  let ulAddr = "0x875680A120597732F92Bf649cacfEb308e54dbA4";
  let ulRegistryAddr = "0x7882172921E99d590E097cD600554339fBDBc480";
  let vBntAddr = '0x48Fb253446873234F2fEBbF9BdeAA72d9d387f94';
  let daiAddr = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
  let bancorDexHex =
    '0xa9bf0c0ec020d1a26ba6698a24db3a538215d8fbf30588bddde694887c4cb55e';
  let vBntWhale = '0xc32e1289b5765b2c4d8a6aa925cbd2a29d35cc22';
  let bancorNetworkAddr = '0xeEF417e1D5CC832e619ae18D2F140De2999dD4fB';
  let universalLiquidator;
  let registry;
  let vBnt;
  let dai;

  // parties in the protocol
  let governance;
  let farmer1;

  async function setupExternalContracts() {
    console.log("Setting up external contracts");
    universalLiquidator = await UniversalLiquidator.at(ulAddr);
    registry = await IUniversalLiquidatorRegistry.at(ulRegistryAddr);
    vBnt = await IERC20.at(vBntAddr);
    dai = await IERC20.at(daiAddr);
  }

  async function setupBalance(){
    let etherGiver = accounts[9];
    // Give whale some ether to make sure the following actions are good
    await web3.eth.sendTransaction({ from: etherGiver, to: vBntWhale, value: 5e18});
    farmerBalance = new BigNumber("50000000000000000000");
    console.log("Farmer balance:", farmerBalance.toFixed());
    await vBnt.transfer(farmer1, farmerBalance, { from: vBntWhale });
    farmerBalance = new BigNumber(await vBnt.balanceOf(farmer1));
    console.log("Farmer balance:", farmerBalance.toFixed());
  }

  before(async function () {
    governance = "0xf00dD244228F51547f0563e60bCa65a30FBF5f7f";
    accounts = await web3.eth.getAccounts();

    farmer1 = accounts[1];

    // impersonate accounts
    await impersonates([governance, vBntWhale]);

    await setupExternalContracts();
    await setupBalance();
  });

  describe("Happy path", function() {
    it("Swapping VBnt for DAI through Bancor", async function() {
      console.log("Deploying Dex");
      dex = await BancorDex.new(bancorNetworkAddr, {from: governance});
      console.log("Dex deployed at:", dex.address);

      console.log("Adding Dex to UL");
      await universalLiquidator.addDex(bancorDexHex, dex.address, {from: governance});
      console.log('Added Dex with name:', bancorDexHex);
      assert.equal(await universalLiquidator.getDex(bancorDexHex), dex.address);

      console.log("Setting path");
      await registry.setPath(
        bancorDexHex,
        vBntAddr,
        daiAddr,
        [vBntAddr, daiAddr],
        { from: governance }
      );

      console.log("Making swap on new Dex");
      await vBnt.approve(ulAddr, farmerBalance, { from: farmer1 });
      await universalLiquidator.swapTokenOnDEX(farmerBalance, 1, farmer1, bancorDexHex, [vBntAddr, daiAddr], {from: farmer1});
      let farmerVBntBalance = new BigNumber(await vBnt.balanceOf(farmer1));
      let farmerFarmBalance = new BigNumber(await dai.balanceOf(farmer1));
      console.log(
        'Swapped',
        farmerBalance.minus(farmerVBntBalance).toFixed(),
        'VBNT for',
        farmerFarmBalance.toFixed(),
        'DAI'
      );
    });
  });
});
