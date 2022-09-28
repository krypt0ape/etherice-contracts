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
const {
    isInDestructureAssignment
} = require("vue/compiler-sfc");
const deployContracts = require("../testUtils/deployContracts");
const {
    fastFoward,
    enterAuction,
    doDailyUpdate,
    getEtherBalance,
    toWei,
    fromWei,
    newStake
} = require("../testUtils/helpers");
const hre = require("hardhat");

describe("Tax Test", function () {
    before(async () => {
        await network.provider.request({
            method: "hardhat_reset",
            params: [],
        });
        await deployContracts();
    });

    describe("Can update tax addresses", () => {
        it("only allows owner to change the tax addresses", async function () {
            await expect(tokenContract.connect(wallet1).updateDevAddress(wallet1.address)).to.be.reverted
            await expect(tokenContract.connect(wallet1).updateMarketingAddress(wallet1.address)).to.be.reverted
            await expect(tokenContract.connect(wallet1).updateBuybackAddress(wallet1.address)).to.be.reverted
            await expect(tokenContract.connect(wallet1).updateRewardsAddress(wallet1.address)).to.be.reverted
        })
    });

    describe("Can update the tax amounts", function () {
        it("Doesn't allow non owner address to update tax", async function () {
            await expect(tokenContract.connect(wallet1).updateTaxes(1, 2, 3, 4, 0)).to.be.reverted;
        })
        it("Doesn't allow new taxs to be higher than 10%", async function () {
            await expect(tokenContract.updateTaxes(1, 4, 5, 2, 3)).to.be.reverted
        });
        it("Changes the taxs", async function () {
            await tokenContract.startAuction(biggestBuyContract.address, stakingContract.address);
            await tokenContract.updateTaxes(1, 2, 2, 2, 2);
            expect(await tokenContract.dev_percentage()).to.equal(1);
            expect(await tokenContract.marketing_percentage()).to.equal(2);
            expect(await tokenContract.buyback_percentage()).to.equal(2);
            expect(await tokenContract.rewards_percentage()).to.equal(2);
            expect(await tokenContract.biggestBuy_percent()).to.equal(2);

            // Reset taxs back
            await tokenContract.updateTaxes(4, 1, 1, 1, 0);
        })
    });

    describe("Day 0 taxs", function () {
        it("Takes 100% tax on day 0", async () => {
            await helpers.setBalance(devWallet.address, 0);
            await helpers.setBalance(marketingWallet.address, 0);
            await helpers.setBalance(buybackWallet.address, 0);
            await helpers.setBalance(rewardsWallet.address, 0);

            await tokenContract.connect(wallet3).enterAuction(wallet4.address, {
                value: ethers.utils.parseEther("70")
            });


            // Contraqct should have 0 as blaance is sent to dev
            expect(await ethers.provider.getBalance(tokenContract.address)).to.equal(ethers.utils.parseEther("0"));
        });

        it("Sends 100% to dev wallet", async () => {
            expect(await ethers.provider.getBalance(devWallet.address)).to.equal(ethers.utils.parseEther("70"));
        });
    })

    describe("Day 1 Taxs", async () => {
        it("ends day 1", async () => {
            await helpers.setBalance(devWallet.address, 0);
            await helpers.setBalance(marketingWallet.address, 0);
            await helpers.setBalance(buybackWallet.address, 0);
            await helpers.setBalance(rewardsWallet.address, 0);
            await doDailyUpdate(); // Finish day 1

            const entries = [{
                wallet: wallet1,
                amount: 50
            }, {
                wallet: wallet2,
                amount: 50
            }]
            await enterAuction(entries);
            await doDailyUpdate();
        })
        it("Sends 4% to dev wallet", async () => {
            expect(await ethers.provider.getBalance(devWallet.address)).to.equal(ethers.utils.parseEther("4"));
        });

        it("Sends 1% to the marketing wallet", async () => {
            expect(await ethers.provider.getBalance(marketingWallet.address)).to.equal(ethers.utils.parseEther("1"));
        })

        it("Sends 1% to the buyback wallet", async () => {
            expect(await ethers.provider.getBalance(buybackWallet.address)).to.equal(ethers.utils.parseEther("1"));
        })

        it("Sends 1% to the rewards wallet", async () => {
            expect(await ethers.provider.getBalance(rewardsWallet.address)).to.equal(ethers.utils.parseEther("1"));
        })
    })

    describe("Takes 8% tax when lottery enabled", function () {
        it("Takes 8% tax on daily update", async () => {
            await helpers.setBalance(devWallet.address, 0);
            await helpers.setBalance(marketingWallet.address, 0);
            await helpers.setBalance(buybackWallet.address, 0);
            await helpers.setBalance(rewardsWallet.address, 0);

            const entries = [{
                wallet: wallet1,
                amount: 50
            }, {
                wallet: wallet2,
                amount: 50
            }]
            await enterAuction(entries);
            await doDailyUpdate();
        })
        it("Sends 4% to the dev wallet", async () => {
            expect(await ethers.provider.getBalance(devWallet.address)).to.equal(ethers.utils.parseEther("4"));
        })
        it("Sends 1% to the marketing wallet", async () => {
            expect(await ethers.provider.getBalance(marketingWallet.address)).to.equal(ethers.utils.parseEther("1"));
        })
        it("Sends 1% to the buyback wallet", async () => {
            expect(await ethers.provider.getBalance(rewardsWallet.address)).to.equal(ethers.utils.parseEther("1"));
        })
        it("Sends 1% to the rewards wallet", async () => {
            expect(await ethers.provider.getBalance(buybackWallet.address)).to.equal(ethers.utils.parseEther("1"));
        })
        it("Sends 1% to the buy comp wallet", async () => {
            expect(await ethers.provider.getBalance(rewardsWallet.address)).to.equal(ethers.utils.parseEther("1"));
        })
    })

    describe("Takes 2% tax on loans", function () {
        let dailyDivs, devBalance;
        it("fills the loan", async () => {
            // Get some tokens
            await tokenContract.connect(wallet2).collectAuctionTokens(1);
            // PLcae a stake
            const tokens = 450000;
            const length = 5;
            await newStake({
                tokens,
                length,
                wallet: wallet2
            });
            // Skp to next day
            await doDailyUpdate();
            enterAuction([{
                wallet: wallet1,
                amount: 10
            }])
            await doDailyUpdate();
            dailyDivs = (await stakingContract.dayDivendPool(await tokenContract.currentDay()));
            devBalance = await getEtherBalance(devWallet.address);
            // Place a lloan
            await stakingContract.connect(wallet2).requestLoanOnStake(1, toWei(1), toWei(0.5), 3);
            // fill the laon
            await stakingContract.connect(wallet1).fillLoan(1, {
                value: toWei(1)
            })
            await doDailyUpdate();
        })
        it("Sends 1% back into the daily divs pool", async () => {
            const newDivs = (await stakingContract.dayDivendPool(await tokenContract.currentDay() - 1));
            const expected = parseInt(newDivs) - parseInt(dailyDivs)
            expect(expected.toString()).to.equal(toWei("0.01"));
        })
        it("Sends 1% to the dev share", async () => {
            const newDevBalance = await getEtherBalance(devWallet.address);
            const expected = parseInt(newDevBalance) - parseInt(devBalance)
            expect(expected.toString()).to.equal(toWei("0.01"));
        })
    })

    describe("Takes 10% tax when buying stakes", function () {
        let dailyDivs, devBalance;
        it("Buys a new stake", async () => {
            // Get some tokens
            await tokenContract.connect(wallet2).collectAuctionTokens(2);
            // PLcae a stake
            const tokens = 450000;
            const length = 5;
            await newStake({
                tokens,
                length,
                wallet: wallet2
            });
            // Skp to next day
            await doDailyUpdate();
            await stakingContract.connect(wallet2).listStakeForSale(2, toWei(1) )

            enterAuction([{
                wallet: wallet1,
                amount: 10
            }])
            await doDailyUpdate();
            await doDailyUpdate();
            dailyDivs = (await stakingContract.dayDivendPool(await tokenContract.currentDay()  ));
            await stakingContract.connect(wallet3).buyStake(2, {value: toWei(1)} )
            devBalance = await getEtherBalance(devWallet.address);
        })
        it("Sends 5% back into the daily divs poll", async () => {
            const newDivs = (await stakingContract.dayDivendPool(await tokenContract.currentDay() ));
            const expected = parseInt(newDivs) - parseInt(dailyDivs)
            expect(expected.toString()).to.equal(toWei("0.05"));
        })
        it("Sends 5% to the dev share", async ()=> {
            await doDailyUpdate();
            const newDevBalance = await getEtherBalance(devWallet.address);
            const expected = parseInt(newDevBalance) - parseInt(devBalance)
            expect(expected.toString()).to.equal(toWei("0.05")); // == 0.1 from previous test  + 0.6
        })
    })
});