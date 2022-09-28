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

describe("Referrer Test", function() {
    before(async () => {
        await network.provider.request({
            method: "hardhat_reset",
            params: [],
        });
        await deployContracts();
    });

    describe("Update referrer bonus", function () {
        it("Only allows owner to change the values", async () => {
            await expect( tokenContract.connect(wallet1).updateReferrerBonus(30, 30)).to.be.reverted;
        });
        it("Checks referrer % <= 5%", async () => {
            await expect( tokenContract.updateReferrerBonus(55, 50)).to.be.reverted;
        });
        it("Checks referree % <= 5%", async () => {
            await expect( tokenContract.updateReferrerBonus(50, 55)).to.be.reverted;
        });
        it("Changes the referrer amount", async () => {
            await tokenContract.updateReferrerBonus(30, 20);
            expect( await tokenContract.referrer_bonus() ).to.equal(30)
        });
        it("Changes the referree amount", async () => {
            expect( await tokenContract.referree_bonus() ).to.equal(20)

            // Reset values
            await tokenContract.updateReferrerBonus(50, 10);
        });
    })

    describe("Pays a referrer comission", function(){
        it("Saves the referrer address on enter auction", async () => {
            await tokenContract.startAuction(biggestBuyContract.address, stakingContract.address);

            await tokenContract.connect(wallet2).enterAuction(wallet1.address, {
                value: ethers.utils.parseEther("3.5")
            });
            const userAuctionEntry = await tokenContract.mapUserAuctionEntry(wallet2.address, 0);
            expect(userAuctionEntry.referrer).to.equal(wallet1.address)

            // Second entry so we claim 50% of tokens on day0
            await tokenContract.connect(wallet3).enterAuction(wallet4.address, {
                value: ethers.utils.parseEther("3.5")
            });
        });

        const expectedRewards = 1455000;
        const expectedReferrerBonus = expectedRewards / 100 * 5; // 5%
        const expectedReferreeBonus = expectedRewards / 100; // 1%
        it("Emits the RefferrerBonusPaid event", async () => {
            await helpers.time.increase(3600 * 25);
            await tokenContract.doDailyUpdate();
            await expect(await tokenContract.connect(wallet2).collectAuctionTokens(0)).to.emit(
                tokenContract, "RefferrerBonusPaid"
            ).withArgs(
                wallet1.address,
                wallet2.address,
                anyValue, // todo can we check the block timestamp ?
                ethers.utils.parseEther(expectedReferrerBonus.toString()), 
                ethers.utils.parseEther(expectedReferreeBonus.toString())
            );
        })

        it("Pays the refferer bonus when user collects tokens", async () => {
            expect( await tokenContract.balanceOf(wallet1.address) ).to.equal( ethers.utils.parseEther(expectedReferrerBonus.toString()) )
        })

        it("Pays the refferee bonus when user collects tokens", async () => {
            expect( await tokenContract.balanceOf(wallet2.address) ).to.equal( ethers.utils.parseEther((expectedReferreeBonus+expectedRewards ).toString()) )
        })
    }) 
})
