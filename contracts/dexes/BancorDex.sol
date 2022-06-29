// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interface/ILiquidityDex.sol";
import "../interface/IBancorNetwork.sol";

contract BancorDex is ILiquidityDex, Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    receive() external payable {}

    address public network;

    constructor(address _network) public {
        network = _network;
    }

    function changeNetwork(address _network) public onlyOwner {
        network = _network;
    }

    function doSwap(
        uint256 amountIn,
        uint256 minAmountOut,
        address spender,
        address target,
        address[] memory path
    ) public override returns (uint256) {
        require(path.length == 2, "Only supports single swaps");
        address buyToken = path[1];
        address sellToken = path[0];

        IERC20(sellToken).safeTransferFrom(spender, address(this), amountIn);
        IERC20(sellToken).safeIncreaseAllowance(network, amountIn);

        uint256 sellTokenBalance = IERC20(sellToken).balanceOf(address(this));

        return IBancorNetwork(network).tradeBySourceAmount(
            Token(sellToken),
            Token(buyToken),
            amountIn,
            minAmountOut,
            block.timestamp + 60,
            target
        );
    }
}
