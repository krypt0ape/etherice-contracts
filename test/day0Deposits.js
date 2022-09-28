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
const deployContracts = require('../testUtils/deployContracts');
const { fastFoward, getEtherBalance , fromWei, toWei, enterAuction, restore} = require("../testUtils/helpers");

describe("Day 0 deposits ", function() {
    before(async () => {
        await network.provider.request({
            method: "hardhat_reset",
            params: [],
        });
        await deployContracts();
    });

    describe("Day 0 goes direct to the tax wallets", async function(){
        it("starts the auction", async ()=>{
            await helpers.setBalance(devWallet.address, 0);
            await helpers.setBalance(marketingWallet.address, 0);
            await helpers.setBalance(rewardsWallet.address, 0);
            await helpers.setBalance(buybackWallet.address, 0);

            await tokenContract.startAuction(biggestBuyContract.address, stakingContract.address);
        })
        it("enters the auction", async () => {
            // console.log( (await getEtherBalance(wallet1.address)).toString() )
            // console.log( (await getEtherBalance(wallet2.address)).toString() )
            // console.log( (await getEtherBalance(wallet3.address)).toString() )
            // console.log( (await getEtherBalance(wallet4.address)).toString() )
            const entries = [
                {wallet: wallet1, amount: 70},
                {wallet: wallet2, amount: 70},
                {wallet: wallet3, amount:70},
                {wallet: wallet3, amount: 70},
                {wallet: wallet1, amount: 70},
            ]
            await enterAuction(entries);
        })
        it("Sends the all to the dev wallet", async () => {
            expect( await getEtherBalance(devWallet.address)).to.equal( toWei(350) )
        })
    })

    describe("Day 1", function(){
        it("Fist buy of the day runs do daily update", async () => {
            await helpers.time.increase(3600 * 25);

            await expect(await tokenContract.connect(wallet2).enterAuction(zeroAddress, {
                value: ethers.utils.parseEther("3.5")
            })).to.emit(
                tokenContract, "DailyAuctionEnd"
                ).withArgs(
                    anyValue, // todo can we check the block timestamp ?
                    0,
                    anyValue,
                    anyValue, // minted 3m - 3% = 2.91m
                );
        })

        it("doesn't send any monies direct to tax", async () => {
            expect(  await ethers.provider.getBalance(tokenContract.address) ).to.equal( toWei("3.5") );
        })
    });
})