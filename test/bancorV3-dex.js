// Utilities
const Utils = require("./utilities/Utils.js");
const addresses = require("./test-config.js");
const { impersonates } = require("./utilities/hh-utils.js");

const BigNumber = require("bignumber.js");
const { artifacts } = require("hardhat");
const IERC20 = artifacts.require("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20");

const BancorV3Dex = artifacts.require("BancorV3Dex");
const UniversalLiquidator = artifacts.require("UniversalLiquidator");
const IUniversalLiquidatorRegistry = artifacts.require("IUniversalLiquidatorRegistry");
const WETH = artifacts.require("WETH9");

//This test was developed at blockNumber 15087700

// Vanilla Mocha test. Increased compatibility with tools that integrate Mocha.
describe("BancorV3 Dex", function() {
  let accounts;
  let farmerBalance;

  // external setup
  let ulAddr = "0x875680A120597732F92Bf649cacfEb308e54dbA4";
  let ulRegistryAddr = "0x7882172921E99d590E097cD600554339fBDBc480";
  let vBntAddr = '0x48Fb253446873234F2fEBbF9BdeAA72d9d387f94';
  let daiAddr = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
  let bancorDexHex =
    '0xc14ae57ed4308b6730c1edd1b4fb42ab2b4b7b04c3380dd69ddf4a05f7b7757d';
  let vBntWhale = '0xc32e1289b5765b2c4d8a6aa925cbd2a29d35cc22';
  let bancorNetworkAddr = '0xeEF417e1D5CC832e619ae18D2F140De2999dD4fB';
  let universalLiquidator;
  let registry;
  let vBnt;
  let dai;
  let wethAddr = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  let usdcAddr = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  let weth;
  let farm;
  let wethWhale = "0x06920C9fC643De77B99cB7670A944AD31eaAA260";

  // parties in the protocol
  let governance;
  let farmer1;

  async function setupExternalContracts() {
    console.log("Setting up external contracts");
    universalLiquidator = await UniversalLiquidator.at(ulAddr);
    registry = await IUniversalLiquidatorRegistry.at(ulRegistryAddr);
    vBnt = await IERC20.at(vBntAddr);
    dai = await IERC20.at(daiAddr);
    weth = await IERC20.at(wethAddr);
    usdc = await IERC20.at(usdcAddr);
  }

  async function setupBalance(){
    let etherGiver = accounts[9];
    // Give whale some ether to make sure the following actions are good
    await web3.eth.sendTransaction({ from: etherGiver, to: vBntWhale, value: 5e18});
    await web3.eth.sendTransaction({ from: etherGiver, to: wethWhale, value: 5e18});
    farmerBalance = new BigNumber("5000000000000000000");
    await vBnt.transfer(farmer1, farmerBalance, { from: vBntWhale });
    await weth.transfer(farmer1, farmerBalance, {from: wethWhale});
    farmerBalance = new BigNumber(await vBnt.balanceOf(farmer1));
    console.log("Farmer balance:", farmerBalance.toFixed());
  }

  before(async function () {
    governance = "0xf00dD244228F51547f0563e60bCa65a30FBF5f7f";
    accounts = await web3.eth.getAccounts();

    farmer1 = accounts[1];

    // impersonate accounts
    await impersonates([governance, vBntWhale, wethWhale]);

    await setupExternalContracts();
    await setupBalance();
  });

  describe("Happy path", function() {
    it("Swapping VBnt for DAI through Bancor", async function() {
      console.log("Deploying Dex");
      dex = await BancorV3Dex.new(bancorNetworkAddr, {from: governance});
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
      await registry.setPath(
        bancorDexHex,
        wethAddr,
        usdcAddr,
        [wethAddr, usdcAddr],
        { from: governance }
      );

      console.log("Making swap on new Dex");
      await vBnt.approve(ulAddr, farmerBalance, { from: farmer1 });
      await universalLiquidator.swapTokenOnDEX(farmerBalance, 1, farmer1, bancorDexHex, [vBntAddr, daiAddr], {from: farmer1});
      let farmerVBntBalance = new BigNumber(await vBnt.balanceOf(farmer1));
      let farmerDaiBalance = new BigNumber(await dai.balanceOf(farmer1));
      console.log(
        'Swapped',
        farmerBalance.minus(farmerVBntBalance).toFixed(),
        'VBNT for',
        farmerDaiBalance.toFixed(),
        'DAI'
      );

      await weth.approve(ulAddr, farmerBalance, { from: farmer1 });
      await universalLiquidator.swapTokenOnDEX(farmerBalance, 1, farmer1, bancorDexHex, [wethAddr, usdcAddr], {from: farmer1});
      let farmerWETHBalance = new BigNumber(await weth.balanceOf(farmer1));
      let farmerUSDCBalance = new BigNumber(await usdc.balanceOf(farmer1));
      console.log(
        'Swapped',
        farmerBalance.minus(farmerWETHBalance).toFixed(),
        'WETH for',
        farmerUSDCBalance.toFixed(),
        'USDC'
      );
    });
  });
});
