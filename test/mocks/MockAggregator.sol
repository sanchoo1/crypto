// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../src/interfaces/AggregatorV3Interface.sol";

contract MockAggregator is AggregatorV3Interface {
    int256 public answer;

    function setAnswer(int256 _answer) external {
        answer = _answer;
    }

    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 _answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (1, answer, block.timestamp, block.timestamp, 1);
    }
}
