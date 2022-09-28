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

describe("Test Staking", function () {
    before(async () => {
        await network.provider.request({
            method: "hardhat_reset",
            params: [],
        });
        await deployContracts();
    });
    describe("Update the max stake days", function () {
        it("Rejects if not owner", async () => {
            await expect(stakingContract.connect(wallet1).updateMaxStakeDays(50)).to.be.reverted
        })
        it("Rejects if > 300", async () => {
            await expect(stakingContract.updateMaxStakeDays(301)).to.be.reverted
        })
        it("Rejects if < 30", async () => {
            await expect(stakingContract.updateMaxStakeDays(20)).to.be.reverted
        })
        it("Updates the max stake days", async () => {
            await stakingContract.updateMaxStakeDays(50)
            expect(await stakingContract.maxStakeDays()).to.equal(50)
            await stakingContract.updateMaxStakeDays(60)
        })
    })

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
        it("Rejects if days  <= 1", async () => {
            await expect(stakingContract.connect(wallet1).newStake(ethers.utils.parseEther("100"), 1)).to.be.revertedWith("Staking: Staking days < 1")
        })
        it("Rejects if days > max staking days (60)", async () => {
            await expect(stakingContract.connect(wallet1).newStake(ethers.utils.parseEther("100"), 61)).to.be.revertedWith("Staking: Staking days > max_stake_days")
        })
        // it("Rejects if sends doens't have enough tokens", async () => {
        //     // trick the owner get 3,000,000 tokens when you start auction so we can skip the auction part here
        //     await expect(stakingContract.connect(wallet1).newStake(ethers.utils.parseEther("2000000"), 10)).to.be.revertedWith("Not enough balance")
        // })
        // it("rejects if not enough allowance", async () => {
        //     await expect(stakingContract.connect(wallet1).newStake(ethers.utils.parseEther("1000000"), 50)).to.be.revertedWith("not enough allowance")
        // })
        it("sets the allowance", async () => {
            await tokenContract.connect(wallet1).approve(stakingContract.address, ethers.utils.parseEther("1000000"));
            expect(await tokenContract.connect(wallet1).allowance(wallet1.address, stakingContract.address)).to.equal(ethers.utils.parseEther("1000000"))
        })

        it("emits the new stake event", async () => {
            await expect(await stakingContract.connect(wallet1).newStake(ethers.utils.parseEther("1000000"), 10)).to.emit(
                stakingContract, "NewStake"
            ).withArgs(
                wallet1.address,
                anyValue,
                1, // stake id
                ethers.utils.parseEther("1000000"),
                10,
            );

            // Day 1 Enter Auction = 10 ETH - 0.93 ETH to Divs
            const entries = [{
                    wallet: wallet1,
                    amount: 5
                },
                {
                    wallet: wallet2,
                    amount: 5
                },
            ]
            await enterAuction(entries)
            await doDailyUpdate();
            // Current day now = 2
        })
        it("sends tokens to contract", async () => {
            expect(await tokenContract.balanceOf(stakingContract.address)).to.equal( toWei(1000000) )
        })
        it("creates a new stake in mapStakes", async () => {
            const stake = await stakingContract.mapStakes(1);
            expect(stake.owner).to.equal(wallet1.address)
            expect(stake.tokensStaked).to.equal( toWei(1000000) )
            expect(stake.startDay).to.equal(2)
            expect(stake.endDay).to.equal(2 + 10)
            expect(stake.forSalePrice).to.equal(0)
            expect(stake.hasCollected).to.equal(false)
            expect(stake.loanRepayments).to.equal(0)
        })

        describe("Increasing tokens in active stake", function () {
            it("Doesn't increase tokens in active stake current day", async () => {
                expect(await stakingContract.tokensInActiveStake(1)).to.equal(0)
            })
            it("increases tokens in active stake day 2", async () => {
                expect(await stakingContract.tokensInActiveStake(2)).to.equal(ethers.utils.parseEther("1000000"))
            })
            it("increases tokens in active stake day 3", async () => {
                expect(await stakingContract.tokensInActiveStake(3)).to.equal(ethers.utils.parseEther("1000000"))
            })
            it("increases tokens in active stake day 4", async () => {
                expect(await stakingContract.tokensInActiveStake(4)).to.equal(ethers.utils.parseEther("1000000"))
            })
            it("increases tokens in active stake day 5", async () => {
                expect(await stakingContract.tokensInActiveStake(5)).to.equal(ethers.utils.parseEther("1000000"))
            })
            it("increases tokens in active stake day 6", async () => {
                expect(await stakingContract.tokensInActiveStake(6)).to.equal(ethers.utils.parseEther("1000000"))
            })
            it("increases tokens in active stake day 7", async () => {
                expect(await stakingContract.tokensInActiveStake(7)).to.equal(ethers.utils.parseEther("1000000"))
            })
            it("increases tokens in active stake day 8", async () => {
                expect(await stakingContract.tokensInActiveStake(8)).to.equal(ethers.utils.parseEther("1000000"))
            })
            it("increases tokens in active stake day 9", async () => {
                expect(await stakingContract.tokensInActiveStake(9)).to.equal(ethers.utils.parseEther("1000000"))
            })
            it("increases tokens in active stake day 10", async () => {
                expect(await stakingContract.tokensInActiveStake(10)).to.equal(ethers.utils.parseEther("1000000"))
            })
            it("increases tokens in active stake day 11", async () => {
                expect(await stakingContract.tokensInActiveStake(11)).to.equal(ethers.utils.parseEther("1000000"))
            })
            it("doesn't tokens in active stake day 12", async () => {
                expect(await stakingContract.tokensInActiveStake(12)).to.equal(0)
            })
        })

        describe("Create a second stake", function () {
            it("creates a second stake and increases the stake id", async () => {
                await newStake({wallet: wallet2, tokens: 1000000, length: 3})
                const stake = await stakingContract.mapStakes(2);
                expect(stake.owner).to.equal(wallet2.address)
                expect(stake.tokensStaked).to.equal( toWei(1000000) )
                expect(stake.startDay).to.equal(3)
                expect(stake.endDay).to.equal(3 + 3)
                expect(stake.forSalePrice).to.equal(0)
                expect(stake.hasCollected).to.equal(false)
                expect(stake.loanRepayments).to.equal(0)
            });
            it("increased total tokens in active stake", async () => {
                expect(await stakingContract.tokensInActiveStake(3)).to.equal( toWei(2000000) )
            })
        })
    })

    describe("Collect Stake", function () {
        it("rejects if owner != sender", async () => {
            await expect(stakingContract.connect(wallet2).collectStake(1)).to.be.revertedWith("Unauthorised")
        })

        it("rejects if stake hasn't ended", async () => {
            await expect(stakingContract.connect(wallet2).collectStake(2)).to.be.revertedWith("Stake hasn't ended")
        })

        it("Adds lots more buys to the auction pool", async () => {
            // Make extra auction entries each day
            // Current Day = 2
            let entries = [{
                    wallet: wallet1,
                    amount: 5
                },
                {
                    wallet: wallet2,
                    amount: 5
                },
            ]
            await enterAuction(entries)
            await doDailyUpdate();

            // Current Day = 3
            entries = [{
                    wallet: wallet1,
                    amount: 7.5
                },
                {
                    wallet: wallet2,
                    amount: 7.5
                },
            ]
            await enterAuction(entries)
            await doDailyUpdate();

            // Current Day = 4
            entries = [{
                    wallet: wallet1,
                    amount: 6
                },
                {
                    wallet: wallet2,
                    amount: 6
                },
            ]
            await enterAuction(entries)
            await doDailyUpdate();

            // Current Day = 5
            entries = [{
                    wallet: wallet1,
                    amount: 13
                },
                {
                    wallet: wallet2,
                    amount: 13
                },
            ]
            await enterAuction(entries)
            await doDailyUpdate();

            // Current Day = 6
            entries = [{
                    wallet: wallet1,
                    amount: 11.5
                },
                {
                    wallet: wallet2,
                    amount: 11.5
                },
            ]
            await enterAuction(entries)
            await doDailyUpdate();

            // Current day = 7
        });

        it("Has the correct divs: day 3", async () => {
            expect(await stakingContract.dayDivendPool(3)).to.equal( toWei(9.3) );
        })

        it("Has the correct divs: day 4", async () => {
            expect(await stakingContract.dayDivendPool(4)).to.equal( toWei(9.3) );
        })

        it("Has the correct divs: day 5", async () => {
            expect(await stakingContract.dayDivendPool(5)).to.equal( toWei(7.44) );
        })

        it("Has the correct divs: day 6", async () => {
            expect(await stakingContract.dayDivendPool(6)).to.equal( toWei(12.276) );
        })

        it("Has the correct divs: day 7", async () => {
            expect(await stakingContract.dayDivendPool(7)).to.equal( toWei(11.191) );
        })

        it("Has the correct divs: day 8", async () => {
            expect(await stakingContract.dayDivendPool(8)).to.equal( toWei(11.191) );
        })

        it("Has the correct divs: day 9", async () => {
            expect(await stakingContract.dayDivendPool(9)).to.equal( toWei(8.401) );
        })

        it("Has the correct divs: day 10", async () => {
            expect(await stakingContract.dayDivendPool(10)).to.equal( toWei(8.401) );
        })

        it("Has the correct divs: day 11", async () => {
            expect(await stakingContract.dayDivendPool(11)).to.equal( toWei(3.565) );
        })

        it("Has the correct divs: day 12", async () => {
            expect(await stakingContract.dayDivendPool(12)).to.equal( toWei(3.565) );
        })

        it("Has the correct divs: day 13", async () => {
            expect(await stakingContract.dayDivendPool(13)).to.equal(0);
        })

        let balanceOfWallet2;
        it("Emits the stake collected event", async () => {
            balanceOfWallet2 = await getEtherBalance(wallet2.address);
            await expect(await stakingContract.connect(wallet2).collectStake(2)).to.emit(
                stakingContract, "StakeCollected"
            ).withArgs(
                wallet2.address,
                anyValue,
                2, // stake id
                toWei(1000000),
                toWei(13.02), 
            );
        })

        it("sets collected to true", async () => {
            const stake = await stakingContract.mapStakes(2);
            expect(stake.hasCollected).to.equal(true)
        })
        it("sends the tokens back to owner", async () => {
            // Should == the original token balance from the start
            expect(await tokenContract.balanceOf(wallet2.address)).to.equal( toWei(1455000) )
        })
        it("sends the divs to owner", async () => {
            const newBalanceOfWallet2 = await getEtherBalance(wallet2.address);
            const diff =  parseInt( newBalanceOfWallet2 ) - parseInt( balanceOfWallet2 );
            // We just compate the fist 2 decimal places to account for gas uage in the transactions
            // so the first 4 shoiuld be 10.69 ETH 
            expect( diff.toString().substring(0,4) ).to.equal( "1301" )
        })

        it("rejects if stake already collected", async () => {
            await expect(stakingContract.connect(wallet2).collectStake(2)).to.be.revertedWith("Already Collected")
        });

        it("reject stake being collected when outstanding loan isnt repaid", async () => {
            await enterAuction([{
                wallet: wallet4, amount: 10
            }]);
            await doDailyUpdate();
            await tokenContract.connect(wallet4).collectAuctionTokens( await tokenContract.currentDay() - 1 );
            await newStake({wallet: wallet4, tokens: 1000000, length: 10})
            await fastFoward();
            await fastFoward();
            await enterAuction([{
                wallet: wallet5, amount: 10,
                wallet: wallet1, amount: 10,
                wallet: wallet2, amount: 10,
                wallet: wallet3, amount: 10,
            }]);
            await fastFoward();
            await stakingContract.connect(wallet4).requestLoanOnStake( 3, toWei(0.1), toWei(0.1), 3 );
            await stakingContract.connect(wallet5).fillLoan( 3, {value: toWei(0.1)} );
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
            await expect(stakingContract.connect(wallet4).collectStake(3)).to.be.revertedWith("Stake has unpaid loan")
        })

        let divs,loanAmount;
        it("allows anyone to repay the loan" , async () => {
            await helpers.setBalance(wallet5.address, 0);
            const loan = await stakingContract.mapLoans(3);
            divs = await stakingContract.calcStakeCollecting(3);
            await stakingContract.repayLoan(3);
            loanAmount  =  parseInt(loan.loanInterest ) + parseInt( loan.loanAmount);
            expect( await getEtherBalance(wallet5.address) ).to.equal( loanAmount.toString() )
        })

        it("allows stake to be collected once repaid", async () => {
            await stakingContract.connect(wallet4).collectStake(3);
        })
    })
});