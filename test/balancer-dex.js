// Utilities
const Utils = require("./utilities/Utils.js");
const addresses = require("./test-config.js");
const { impersonates } = require("./utilities/hh-utils.js");

const BigNumber = require("bignumber.js");
const IERC20 = artifacts.require("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20");

const BalancerDex = artifacts.require("BalancerDex");
const UniversalLiquidator = artifacts.require("UniversalLiquidator");
const IUniversalLiquidatorRegistry = artifacts.require("IUniversalLiquidatorRegistry");
const WETH = artifacts.require("WETH9");

// Vanilla Mocha test. Increased compatibility with tools that integrate Mocha.
describe("Balancer Dex", function() {
  let accounts;
  let farmerBalance;

  // external setup
  let ulAddr = "0x875680A120597732F92Bf649cacfEb308e54dbA4";
  let ulRegistryAddr = "0x7882172921E99d590E097cD600554339fBDBc480";
  let balancerVault = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
  let wethAddr = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  let balAddr = "0xba100000625a3754423978a60c9317c58a424e3D";
  let balDexHex = "0x9e73ce1e99df7d45bc513893badf42bc38069f1564ee511b0c8988f72f127b13";
  let universalLiquidator;
  let weth;
  let wethToken;
  let bal;
  let noteAddr = "0xCFEAead4947f0705A14ec42aC3D44129E1Ef3eD5";
  let note;
  let noteWhale = "0x4A65e76bE1b4e8dd6eF618277Fa55200e3F8F20a";

  // parties in the protocol
  let governance;
  let farmer1;

  async function setupExternalContracts() {
    console.log("Setting up external contracts");
    universalLiquidator = await UniversalLiquidator.at(ulAddr);
    registry = await IUniversalLiquidatorRegistry.at(ulRegistryAddr);
    weth = await WETH.at(wethAddr);
    wethToken = await IERC20.at(wethAddr)
    bal = await IERC20.at(balAddr);
    note = await IERC20.at(noteAddr);
  }

  async function setupBalance(){
    let etherGiver = accounts[9];
    // Give whale some ether to make sure the following actions are good
    await web3.eth.sendTransaction({ from: etherGiver, to: farmer1, value: 5e18});
    await web3.eth.sendTransaction({ from: etherGiver, to: noteWhale, value: 5e18});
    console.log("Depositing ETH to wETH");
    await weth.deposit({value: 2e18, from: farmer1});
    farmerBalance = new BigNumber(await wethToken.balanceOf(farmer1));
    await note.transfer(farmer1, farmerBalance.div(1e10), {from: noteWhale});
    console.log("Farmer balance:", farmerBalance.toFixed());
  }

  before(async function() {
    governance = "0xf00dD244228F51547f0563e60bCa65a30FBF5f7f";
    accounts = await web3.eth.getAccounts();

    farmer1 = accounts[1];

    // impersonate accounts
    await impersonates([governance, noteWhale]);

    await setupExternalContracts();
    await setupBalance();
  });

  describe("Happy path", function() {
    it("Swapping 1 WETH for BAL through Balancer", async function() {
      console.log("Deploying Dex");
      balDex = await BalancerDex.new(balancerVault, {from: governance});
      console.log("Dex deployed at:", balDex.address);

      console.log("Making swap on old Dex");
      await wethToken.approve(universalLiquidator.address, farmerBalance, {from: farmer1});
      await universalLiquidator.swapTokenOnDEX(farmerBalance.div(2), 1, farmer1, balDexHex, [wethAddr, balAddr], {from: farmer1});
      let farmerBalBalance1 = new BigNumber(await bal.balanceOf(farmer1));
      let farmerWethBalance1 = new BigNumber(await wethToken.balanceOf(farmer1));
      console.log("Swapped 1 WETH for", farmerBalBalance1.toFixed(), "BAL");
      console.log("Swap back to WETH");
      await bal.approve(universalLiquidator.address, farmerBalBalance1, {from: farmer1});
      await universalLiquidator.swapTokenOnDEX(farmerBalBalance1, 1, farmer1, balDexHex, [balAddr, wethAddr], {from: farmer1});
      let farmerBalBalance2 = new BigNumber(await bal.balanceOf(farmer1));
      let farmerWethBalance2 = new BigNumber(await wethToken.balanceOf(farmer1));
      console.log("Final WETH:", (farmerWethBalance2.minus(farmerWethBalance1)).toFixed());


      console.log("Changing Dex in UL");
      await universalLiquidator.changeDexAddress(balDexHex, balDex.address, {from: governance});
      console.log("Changed Dex with name:", balDexHex);
      assert.equal(await universalLiquidator.getDex(balDexHex), balDex.address);

      console.log("Making swap on new Dex");
      await universalLiquidator.swapTokenOnDEX(farmerBalance.div(2), 1, farmer1, balDexHex, [wethAddr, balAddr], {from: farmer1});
      let farmerBalBalance3 = new BigNumber(await bal.balanceOf(farmer1));
      let farmerWethBalance3 = new BigNumber(await wethToken.balanceOf(farmer1));
      let received = farmerBalBalance3.minus(farmerBalBalance2);
      console.log("Swapped 1 WETH for", received.toFixed(), "BAL");
      console.log("Swap back to WETH");
      await bal.approve(universalLiquidator.address, received, {from: farmer1});
      await universalLiquidator.swapTokenOnDEX(received, 1, farmer1, balDexHex, [balAddr, wethAddr], {from: farmer1});
      let farmerBalBalance4 = new BigNumber(await bal.balanceOf(farmer1));
      let farmerWethBalance4 = new BigNumber(await wethToken.balanceOf(farmer1));
      console.log("Final WETH:", (farmerWethBalance4.minus(farmerWethBalance3)).toFixed());

      let perf = (farmerWethBalance4.minus(farmerWethBalance3)).toFixed()/(farmerWethBalance2.minus(farmerWethBalance1)).toFixed();
      console.log("New Dex outperforming by:", perf);


      await registry.setPath(
        balDexHex,
        noteAddr,
        wethAddr,
        [noteAddr, wethAddr],
        { from: governance }
      );

      await note.approve(ulAddr, farmerBalance.div(1e10), { from: farmer1 });
      await universalLiquidator.swapTokenOnDEX(farmerBalance.div(1e10), 1, farmer1, balDexHex, [noteAddr, wethAddr], {from: farmer1});
      let farmerWETHBalance = new BigNumber(await weth.balanceOf(farmer1));
      let farmerNOTEBalance = new BigNumber(await note.balanceOf(farmer1));
      console.log(
        'Swapped',
        farmerBalance.div(1e10).minus(farmerNOTEBalance).toFixed(),
        'NOTE for',
        farmerWETHBalance.toFixed(),
        'WETH'
      );
    });
  });
});
