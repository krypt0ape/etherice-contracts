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
const { doDailyUpdate, enterAuction, fastFoward, toWei} = require("../testUtils/helpers");

describe("Test Dividends Distribution", function () {
    before(async () => {
        await network.provider.request({
            method: "hardhat_reset",
            params: [],
        });
        await deployContracts();
    });
    
  
    describe("Token contract address", function () {
        it("Rejects the token contract address being changed once set (its set in deploy)", async () => {
            await expect(stakingContract.setTokenContractAddress(wallet3.address)).to.be.reverted
        })
    });

    describe("Receive Divs", function () {
        it("Rejects if day 0", async () => {
            await expect(stakingContract.receiveDivs()).to.be.reverted
        })
        it("Rejects if sender isn't the token contract", async () => {
            await expect(stakingContract.receiveDivs()).to.be.reverted
        })

        it("Recevies the day 0 auction entry as divs", async () => {
            // Needs to start the auction for the next tests
            await tokenContract.startAuction(biggestBuyContract.address, stakingContract.address);
            // As divs dont get send until day 1 daily update  we need to skip to that
            await tokenContract.connect(wallet3).enterAuction(zeroAddress, {
                value: ethers.utils.parseEther("1")
            });
            await helpers.time.increase(3600 * 25);
            await tokenContract.doDailyUpdate();
            await tokenContract.connect(wallet3).enterAuction(zeroAddress, {
                value: ethers.utils.parseEther("10")
            });
            await helpers.time.increase(3600 * 25);
            await tokenContract.doDailyUpdate();
        
            expect( await ethers.provider.getBalance(stakingContract.address) ).to.equal( ethers.utils.parseEther("9.3") )
        })

        describe("Spreads day 1 divs over day 2 & 3", function(){
            it("Gives half to day 2", async () => {
                expect(await stakingContract.dayDivendPool(2)).to.equal(ethers.utils.parseEther("4.65"));
            })
            it("Gives half to day 3", async () => {
                expect(await stakingContract.dayDivendPool(3)).to.equal(ethers.utils.parseEther("4.65"));
            })
            it("Gives 0 to day 3", async () => {
                expect(await stakingContract.dayDivendPool(4)).to.equal(0);
            })
        })
        
        describe("Spreads day 10 divs  days 11 - 20", function(){
            it("moves to day 10", async () => {
                await helpers.setBalance(stakingContract.address, 0);
                await helpers.time.increase( (3600 * 24) * 8); // move forward 8 more days
                await tokenContract.doDailyUpdate();
                expect(await tokenContract.currentDay()).to.equal(10);
            })
            it("sends day 10 divs to contract", async () => {
                await helpers.setBalance(tokenContract.address, 0);
                await tokenContract.connect(wallet3).enterAuction(global.zeroAddress, {
                    value: ethers.utils.parseEther("10")
                });
                await helpers.time.increase(3600 * 24);
                await tokenContract.doDailyUpdate();
                expect( await ethers.provider.getBalance( stakingContract.address) ).to.equal( ethers.utils.parseEther("9.3") )
            })
            // skip to day 10
            it("sends 0 to day 10", async () => {
                expect(await stakingContract.dayDivendPool(10)).to.equal( ethers.utils.parseEther("0") );
            })
            it("sends 1/10 to day 11", async () => {
                expect(await stakingContract.dayDivendPool(11)).to.equal( ethers.utils.parseEther("0.93") );
            })
            it("sends 1/10 to day 12", async () => {
                expect(await stakingContract.dayDivendPool(12)).to.equal( ethers.utils.parseEther("0.93") );
            })
            it("sends 1/10 to day 13", async () => {
                expect(await stakingContract.dayDivendPool(13)).to.equal( ethers.utils.parseEther("0.93") );
            })
            it("sends 1/10 to day 14", async () => {
                expect(await stakingContract.dayDivendPool(14)).to.equal( ethers.utils.parseEther("0.93") );
            })
            it("sends 1/10 to day 15", async () => {
                expect(await stakingContract.dayDivendPool(15)).to.equal( ethers.utils.parseEther("0.93") );
            })
            it("sends 1/10 to day 16", async () => {
                expect(await stakingContract.dayDivendPool(16)).to.equal( ethers.utils.parseEther("0.93") );
            })
            it("sends 1/10 to day 17", async () => {
                expect(await stakingContract.dayDivendPool(17)).to.equal( ethers.utils.parseEther("0.93") );
            })
            it("sends 1/10 to day 18", async () => {
                expect(await stakingContract.dayDivendPool(18)).to.equal( ethers.utils.parseEther("0.93") );
            })
            it("sends 1/10 to day 19", async () => {
                expect(await stakingContract.dayDivendPool(19)).to.equal( ethers.utils.parseEther("0.93") );
            })
            it("sends 1/10 to day 20", async () => {
                expect(await stakingContract.dayDivendPool(20)).to.equal( ethers.utils.parseEther("0.93") );
            })
            it("sends none to day 21", async () => {
                expect(await stakingContract.dayDivendPool(21)).to.equal( 0 );
            })
        })
        describe("Spreads day 15 divs over days 16 - 30", function() {
            it("moves to day 15", async () => {
                await helpers.time.increase( (3600 * 24) * 4); // move forward 8 more days
                await tokenContract.doDailyUpdate();
                expect(await tokenContract.currentDay()).to.equal(15);
            })
            it("sends day 15 divs to contract", async () => {
                await helpers.setBalance(tokenContract.address, 0);
                await helpers.setBalance(stakingContract.address, 0);

                await tokenContract.connect(wallet3).enterAuction(zeroAddress, {
                    value: ethers.utils.parseEther("10")
                });
                await helpers.time.increase(3600 * 24);
                await tokenContract.doDailyUpdate();
                expect( await ethers.provider.getBalance( stakingContract.address) ).to.equal( ethers.utils.parseEther("9.3") )
            })
            it("sends 1/15 to day 16 and increases its previous balance", async () => {
                expect(await stakingContract.dayDivendPool(16)).to.equal( ethers.utils.parseEther("1.55") );
            })
            it("sends  1/15 to day 18 and increases its previous balance", async () => {
                expect(await stakingContract.dayDivendPool(18)).to.equal( ethers.utils.parseEther("1.55") );
            })
            it("sends  1/15 to day 21 ", async () => {
                expect(await stakingContract.dayDivendPool(21)).to.equal( ethers.utils.parseEther("0.62") );
            })
            it("sends  1/15 to day 25 ", async () => {
                expect(await stakingContract.dayDivendPool(25)).to.equal( ethers.utils.parseEther("0.62") );
            })
            it("sends none to day 30 ", async () => {
                expect(await stakingContract.dayDivendPool(36)).to.equal( 0 );
            })
        });
        describe("Spreads day 25 divs over days 26 - 50", function(){
            it("moves to day 25", async () => {
                await helpers.time.increase( (3600 * 24) * 9); // move forward 8 more days
                await tokenContract.doDailyUpdate();
                expect(await tokenContract.currentDay()).to.equal(25);
            })
            it("sends day 25 divs to contract", async () => {
                await helpers.setBalance(tokenContract.address, 0);
                await helpers.setBalance(stakingContract.address, 0);

                await tokenContract.connect(wallet3).enterAuction(zeroAddress, {
                    value: ethers.utils.parseEther("10")
                });
                await helpers.time.increase(3600 * 24);
                await tokenContract.doDailyUpdate();
                expect( await ethers.provider.getBalance( stakingContract.address) ).to.equal( ethers.utils.parseEther("9.3") )
            })
            it("sends no divs to day 25 ", async () => {
                expect(await stakingContract.dayDivendPool(25)).to.equal( ethers.utils.parseEther("0.62") );
            })
            it("sends divs to day 29 (has divs fro last test too)", async () => {
                expect(await stakingContract.dayDivendPool(29)).to.equal( ethers.utils.parseEther("0.992") );
            })
            it("sends divs to 50", async () => {
                expect(await stakingContract.dayDivendPool(50)).to.equal( ethers.utils.parseEther("0.372") );
            })
            it("sends none to day 51 ", async () => {
                expect(await stakingContract.dayDivendPool(51)).to.equal( 0 );
            })
         });
        describe("Spreads day 35 divs over days 36 - 65 (should spead over max 30 days NOT 35)", function(){
            it("moves to day 35", async () => {
                await helpers.time.increase( (3600 * 24) * 9); // move forward 8 more days
                await tokenContract.doDailyUpdate();
                expect(await tokenContract.currentDay()).to.equal(35);
            })
            it("sends day 35 divs to contract", async () => {
                await helpers.setBalance(tokenContract.address, 0);
                await helpers.setBalance(stakingContract.address, 0);

                await tokenContract.connect(wallet3).enterAuction(zeroAddress, {
                    value: ethers.utils.parseEther("10")
                });
                await helpers.time.increase(3600 * 24);
                await tokenContract.doDailyUpdate();
                expect( await ethers.provider.getBalance( stakingContract.address) ).to.equal( ethers.utils.parseEther("9.3") )
            })
            it("sends divs to 48", async () => {
                expect(await stakingContract.dayDivendPool(50)).to.equal( ethers.utils.parseEther("0.682") );
            })
            it("sends divs to 65", async () => {
                expect(await stakingContract.dayDivendPool(60)).to.equal( ethers.utils.parseEther("0.31") );
            })
            it("sends none to day 66 ", async () => {
                expect(await stakingContract.dayDivendPool(66)).to.equal( 0 );
            })
        });
    })


    describe("Update the max div reward days", function () {
        it("Rejects if not owner", async () => {
            await expect(stakingContract.connect(wallet1).updateMaxDividendRewardDays(50)).to.be.reverted
        })
        it("Rejects if > 60", async () => {
            await expect(stakingContract.updateMaxDividendRewardDays(70)).to.be.reverted
        })
        it("Rejects if < 10", async () => {
            await expect(stakingContract.updateMaxDividendRewardDays(5)).to.be.reverted
        })
        it("Updates the div reward days", async () => {
            await stakingContract.updateMaxDividendRewardDays(50)
            expect(await stakingContract.maxDividendRewardDays()).to.equal(50)
            await stakingContract.updateMaxDividendRewardDays(30)
        })
    });

    describe("Dividend payouts with a 0 auction day event", function(){
        it("it still process divs the following day ", async () =>{
            // Enter auction
            await fastFoward();
            // Collect tokens
            await tokenContract.connect(wallet1).collectAuctionTokens(36);
            await tokenContract.connect(wallet1).approve(stakingContract.address, toWei(111) );
            await stakingContract.connect(wallet1).newStake( toWei(111), 3)
            await doDailyUpdate();
            await doDailyUpdate();
            await doDailyUpdate();
            await doDailyUpdate();
            await doDailyUpdate();
            await expect(await stakingContract.connect(wallet1).collectStake(1)).to.emit(
                stakingContract, "StakeCollected"
            ).withArgs(
                wallet1.address,
                anyValue,
                1, // stake id
                anyValue,
                anyValue, 
            );
        })
    })
})