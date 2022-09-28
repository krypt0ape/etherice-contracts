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
    restore,
    fastFoward
} = require("../testUtils/helpers");
const hre = require("hardhat")

describe("Biggest Buy Comp Test", function () {
    before(async () => {
        await network.provider.request({
            method: "hardhat_reset",
            params: [],
        });
        await deployContracts();
    });
    describe("Starting the lottery", async () => {
        it("Sends the lottery tax only when enabled", async () => {
            // start auction
            await tokenContract.startAuction(biggestBuyContract.address, stakingContract.address);
            // fast forard to day 1
            await fastFoward();
            // set a lottery taax on the contract
            await tokenContract.updateTaxes(4, 1, 1, 1, 1);
            // fast forward to day 2 fast forwrd does 2 ETH buy. 
            // Tax = 8% = 0.16ETH = 0.02ETH to buy comp. If its over that it means it moved
            // tax from before when we enabled it
            await fastFoward();
            // check contract balance
            expect(await getEtherBalance(biggestBuyContract.address)).to.equal(toWei(0.02));
        })
        it("Only allows the owner to add to the exclusion list", async () => {
            await expect(biggestBuyContract.connect(wallet1).excludeAddressFromLottery(wallet1.address, true)).to.be.reverted;
        })
        it("adds to the exlusion list", async () => {
            await biggestBuyContract.excludeAddressFromLottery(wallet1.address, true);
            expect(await biggestBuyContract.excludeFromComp(wallet1.address)).to.equal(true)
        })
        it("Starts the lottery", async () => {
            await biggestBuyContract.doStartComp(tokenContract.address);
            expect(await biggestBuyContract.startLottery()).to.equal(true);
        })
        it("doesnt allow adding to the exclusion list once started", async () => {
            await expect(biggestBuyContract.excludeAddressFromLottery(wallet3.address, true)).to.be.reverted;
        })
    })

    describe("Update global values", async function () {
        it("Rejects nonowner update of ditribution taxs", async () => {
            await expect(biggestBuyContract.connect(wallet1).updatePercentages(5, 5, 5)).to.be.reverted;
        });
        it("Rejects update over 100% of ditribution taxs", async () => {
            await expect(biggestBuyContract.updatePercentages(50, 50, 10)).to.be.revertedWith("Rewards split cant be more than 100%")
        });
        it("Allows update of the taxs", async () => {
            await biggestBuyContract.updatePercentages(25, 25, 10);
            expect(await biggestBuyContract.devPercentage()).to.equal(25);
            expect(await biggestBuyContract.rewardsPercentage()).to.equal(25);
            expect(await biggestBuyContract.winnerPercentage()).to.equal(10);
            await biggestBuyContract.updatePercentages(10, 30, 30);
        });

        it("Rejects nonowner update of daily reduction percentage", async () => {
            await expect(biggestBuyContract.connect(wallet1).updateDailyTopBuyReductionPercentage(3)).to.be.reverted;
        });
        it("Rejects update of daily reduction percentage over 99%", async () => {
            await expect(biggestBuyContract.updateDailyTopBuyReductionPercentage(999)).to.be.reverted;
        });
        it("updates the daily reduction percentage", async () => {
            await biggestBuyContract.updateDailyTopBuyReductionPercentage(70);
            expect(await biggestBuyContract.dailyTopBuyReductionPercentage()).to.equal(70);
            await biggestBuyContract.updateDailyTopBuyReductionPercentage(50);
        });

    })

    describe("New Buy", async function () {
        it("Doesn't register any buys from an excluded wallet", async () => {
            const entries = [{
                wallet: wallet1,
                amount: 10
            }];
            await enterAuction(entries);
            expect(await biggestBuyContract.topBuyTodayAddress()).to.equal(global.zeroAddress);
        })
        it("Saves amount if top buy for the day", async () => {
            const entries = [{
                wallet: wallet2,
                amount: 10
            }];
            await enterAuction(entries);

            expect(await biggestBuyContract.topBuyTodayAmount()).to.equal(toWei(10));
        })
        it("Saves address if top buy for the day", async () => {
            expect(await biggestBuyContract.topBuyTodayAddress()).to.equal(wallet2.address);
        })
        it("Doesn't save if not top buy for the day", async () => {

            const entries = [{
                wallet: wallet4,
                amount: 1
            }];
            await enterAuction(entries);
            expect(await biggestBuyContract.topBuyTodayAddress()).to.equal(wallet2.address);
        })
    })

    describe("Process winner", async function () {
        it("Emits biggest buy winner event", async () => {
            await helpers.setBalance(devWallet.address, 0);
            await helpers.setBalance(rewardsWallet.address, 0);
            await helpers.setBalance(wallet2.address, 0);

            await helpers.time.increase(3600 * 24);
            await expect(await tokenContract.doDailyUpdate()).to.emit(
                biggestBuyContract, "BiggestBuyCompWinner"
            ).withArgs(
                wallet2.address,
                anyValue,
                toWei((0.23 / 100) * 30),
                toWei(10)
            );
        });
        it("Sets the topBuy amount to the top buy today amount", async () => {
            expect(await biggestBuyContract.topBuy()).to.equal(toWei(10));
        })
        it("sends 10% to dev wallet", async () => {
            // The do daily update sends tax so we can't accuratly no this nubmer  chekc its over 
            expect(await getEtherBalance(devWallet.address)).to.greaterThan(toWei((0.23 / 100) * 10))
        })
        it("sends 30% to winner wallet", async () => {
            expect(await getEtherBalance(wallet2.address)).to.equal(toWei((0.23 / 100) * 30))
        })
        it("sends 30% to rewards wallet", async () => {
            // The do daily update sends tax so we can't accuratly no this nubmer so wejust chekc its over 
            expect(await getEtherBalance(rewardsWallet.address)).to.greaterThan(toWei((0.23 / 100) * 30))
        })
        it("resets the top buy today amount", async () => {
            expect(await biggestBuyContract.topBuyTodayAmount()).to.equal(0);
        })
        it("resets the top buy today address", async () => {
            expect(await biggestBuyContract.topBuyTodayAddress()).to.equal(global.zeroAddress);
        })
    })

    describe("Process when no winner", async function () {
        it("Reduces the biggest buy by biggest buy percent if no winner", async () => {
            await helpers.setBalance(wallet2.address, ethers.utils.parseEther("10"));
            await fastFoward();
            expect(await biggestBuyContract.topBuy()).to.equal(toWei(9.5));
        })
    })
});