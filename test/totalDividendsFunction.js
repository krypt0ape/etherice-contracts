const {
    expect
} = require("chai");
const {
    ethers
} = require("hardhat");
const {
    anyValue
} = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const deployContracts = require("../testUtils/deployContracts")
const hre = require("hardhat")
const {
    enterAuction,startAuctionAndGetTokens,
    doDailyUpdate, toWei, getEtherBalance,
    newStake, fastFoward
} = require("../testUtils/helpers");

// This func is throwing errors when contract not started so writting a test
// to help figure out why
describe("Test Total Divs Function", function () {
    before(async () => {
        await network.provider.request({
            method: "hardhat_reset",
            params: [],
        });
        await deployContracts();
    });

    describe("Get the total rewards", function(){
        it("returns total rewards of 0 when auction not started", async () => {
            expect(await stakingContract.totalDivendPool()).to.eq("0");
        })
    })

});