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
    restore
} = require("../testUtils/helpers");

describe("Auction Test", function () {

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

        it("Reject start the auction being ran twice", async () => {
            await expect(tokenContract.startAuction(biggestBuyContract.address, stakingContract.address)).to.be.reverted
        });

        it("Mints starting supply to the deployer", async () => {
            const ownerBalance = await tokenContract.balanceOf(owner.address);
            expect(await tokenContract.lastAuctionTokens()).to.equal(ownerBalance);
        });
    });

    describe("Enter Auction", function () {
        let userAuctionEntry;

        it("Emits UserEnterAuction Event", async () => {
            await expect(await tokenContract.connect(wallet2).enterAuction(zeroAddress, {
                value: ethers.utils.parseEther("3.5")
            })).to.emit(
                tokenContract, "UserEnterAuction"
            ).withArgs(
                wallet2.address,
                anyValue, // todo can we check the block timestamp ?
                ethers.utils.parseEther("3.5"),
                0
            );
            userAuctionEntry = await tokenContract.mapUserAuctionEntry(wallet2.address, 0);

            // Enter the lobby a few more times with other addresses, will allow for 
            // better tests on day 1
            const entries = [{
                    wallet: wallet3,
                    amount: 7
                },
                {
                    wallet: wallet4,
                    amount: 2
                },
                {
                    wallet: wallet5,
                    amount: 1.5
                }
            ]
            await enterAuction(entries)
        });

        it("Sets the enter auction Day", async () => {
            expect(userAuctionEntry.day).to.equal(0)
        })

        it("Sets the enter auction deposit", async () => {
            expect(userAuctionEntry.totalDeposits).to.equal(toWei(3.5))
        })

        it("Sets the user auction entry collected to false", async () => {
            expect(userAuctionEntry.hasCollected).to.equal(false)
        })

        it("has correct auction entry entry value for day", async () => {
            expect(await tokenContract.auctionDeposits(0)).to.equal(toWei(14))
        })
    });

    describe("Daily Update", function () {
        it("Doesn't run on day 0", async () => {
            await tokenContract.doDailyUpdate();
            // Total supply should still === 3,000,000 this means no more has been minted
            expect(await tokenContract.lastAuctionTokens()).to.equal(toWei(3000000));
        });

        it("calc day returns the next day", async () => {
            await helpers.time.increase(3600 * 25);
            expect(await tokenContract.calcDay()).to.equal(1);
        })

        it("Emits the day lobby entry event", async () => {
            await expect(await tokenContract.connect(wallet2).doDailyUpdate()).to.emit(
                tokenContract, "DailyAuctionEnd"
            ).withArgs(
                anyValue, // todo can we check the block timestamp ?
                0,
                toWei(14),
                toWei(2910000), // minted 3m - 3% = 2.91m
            );
        });

        it("Flushes contract balance on day lobby entry", async () => {
            expect(await getEtherBalance(tokenContract.address)).to.equal("0");
        })

        it("Mints the last lobby pool - the daily reduction percent", async () => {
            // New total supply is 3,000,000 + ( 3,000,000 - 3% = 2,910,000)
            const newTotalSupply = toWei(5910000)
            expect(await tokenContract.totalSupply()).to.equal(newTotalSupply);
        });

        it("Updates the lobby tokens value for the day", async () => {
            expect(await tokenContract.auctionTokens(0)).to.equal(toWei(2910000));
        });

        it("Doesn't run on the same day twice", async () => {
            const totalSupply = await tokenContract.totalSupply();
            await tokenContract.doDailyUpdate();
            // Total supply to stay the same then no new tokens have been minted
            expect(await tokenContract.totalSupply()).to.equal(totalSupply);
        });
    })

    describe("Exit Auction: Day 1", function () {
        //Day 0 deposits all 25% so should get 1/4 of minted tokens
        const day0TokenShare = toWei(2910000 / 2);

        it("Emits UserLobbyCollect event", async () => {
            await expect(await tokenContract.connect(wallet3).collectAuctionTokens(0)).to.emit(
                tokenContract, "UserCollectAuctionTokens"
            ).withArgs(
                wallet3.address,
                anyValue,  // todo can we check the block timestamp ?
                0, // Collect tokens from day 0
                day0TokenShare,
                0
            );
        });

        it("transfers the tokens to user", async () => {
            expect(await tokenContract.balanceOf(wallet3.address)).to.equal(toWei(2910000 / 2))
        })


        it("Can't collect tokens twice", async () => {
            await expect(tokenContract.connect(wallet3).collectAuctionTokens(0)).to.be.reverted
        })
    })

    describe("Daily Update: day 2", function () {
        it("Increases total supply by last lobbypool - daily reduction %", async () => {
            // Do some more day 1 buy 
            const entries = [{
                    wallet: wallet3,
                    amount: 2
                },
                {
                    wallet: wallet3,
                    amount: 3
                },
                {
                    wallet: wallet4,
                    amount: 3
                },
                {
                    wallet: wallet5,
                    amount: 2
                }
            ]
            await enterAuction(entries);

            await helpers.time.increase(3600 * 25);
            const previousSupply = await tokenContract.totalSupply();
            const expectedNewSupply = parseInt(fromWei(previousSupply)) + 2822700;
            await tokenContract.connect(wallet3).doDailyUpdate();
            expect(await tokenContract.totalSupply()).to.equal(toWei(expectedNewSupply));
        });

        it("Updates the lobbyTokens for the day", async () => {
            expect(await tokenContract.auctionTokens(1)).to.equal(toWei(2822700));
        });

        it("Sends the correct divs to staking contract", async () => {
            expect(await ethers.provider.getBalance(stakingContract.address)).to.equal(toWei(9.3));
        })
    })

    describe("Exit Auction: day 2", function () {
        it("Exits day 0 auction and transfers tokens to buyer 3", async () => {
            await tokenContract.connect(wallet2).collectAuctionTokens(0)
            const _balance = await tokenContract.balanceOf(wallet3.address);

            const _expectedNewBalance = parseInt(fromWei(_balance)) + 1411350;
            await tokenContract.connect(wallet3).collectAuctionTokens(1);

            // Buyer 3 has 50% of supply for day 1
            expect(await tokenContract.balanceOf(wallet3.address)).to.equal(toWei(_expectedNewBalance));
        })
    })

    describe("Daily Update: day 3", function () {
        it("Doesnt mint tokens if 0 deposits", async () => {
            const totalSupply = await tokenContract.totalSupply();
            await helpers.time.increase(3600 * 25); // Skip a day then run daily update
            await tokenContract.doDailyUpdate();
            expect(await tokenContract.totalSupply()).to.equal(totalSupply)
        })
    });
});