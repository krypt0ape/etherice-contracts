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
} = require("../testUtils/helpers")

describe("Test Max Gas Fees", function () {
    before(async () => {
        await network.provider.request({
            method: "hardhat_reset",
            params: [],
        });
        await deployContracts();
    });
 
    describe("New Stake", function () {
        it("Get some tokens to stake", async () => {
            const entries = [
                {wallet: wallet1, amount: 2},
                {wallet: wallet2, amount: 2}, 
            ];
            await startAuctionAndGetTokens(entries);
            // Day == 1
            expect(await tokenContract.balanceOf(wallet1.address)).to.equal(ethers.utils.parseEther("1455000"))
            expect(await tokenContract.balanceOf(wallet2.address)).to.equal(ethers.utils.parseEther("1455000"))
        })
        it("sets the allowance", async () => {
            await tokenContract.connect(wallet1).approve(stakingContract.address, ethers.utils.parseEther("1000000"));
            expect(await tokenContract.connect(wallet1).allowance(wallet1.address, stakingContract.address)).to.equal(ethers.utils.parseEther("1000000"))
        })

        it("emits the new stake event", async () => {
            await expect(await stakingContract.connect(wallet1).newStake(ethers.utils.parseEther("1000000"), 60)).to.emit(
                stakingContract, "NewStake"
            ).withArgs(
                wallet1.address,
                anyValue,
                1, // stake id
                ethers.utils.parseEther("1000000"),
                60,
            );
        })

        it("Emits the stake collected event", async () => {
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            await fastFoward();
            // Skipto day 60
            await expect(await stakingContract.connect(wallet1).collectStake(1)).to.emit(
                stakingContract, "StakeCollected"
            );
        })
    })
});