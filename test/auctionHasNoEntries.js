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
const deployContracts = require("../testUtils/deployContracts");
const {
    getEtherBalance,
    fromWei,
    toWei,
    enterAuction,
    snapshot,
    restore, doDailyUpdate
} = require("../testUtils/helpers");

describe("Auction has 0 entries doesn't break the calc token value", function () {

    before(async () => {
        await network.provider.request({
            method: "hardhat_reset",
            params: [],
        });
        await deployContracts();
    });

    describe("Starting Auction", function () {
        it("Starts the auction", async () => {
            await tokenContract.startAuction(biggestBuyContract.address, stakingContract.address);
            expect(await tokenContract.launchTime()).to.greaterThan(0);
        });

        it("Skips a day", async ()=>{
            await doDailyUpdate();
        })

        it("doesnt throw error when we call calcTokenValue", async ()=>{
            expect( await tokenContract.calcTokenValue(zeroAddress, 0) ).to.equal(0)
        })
    });

});