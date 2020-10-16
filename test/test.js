/* global ethers, describe, it, before */

const { expect } = require('chai')
const truffleAssert = require('truffle-assertions')

describe('Raffle', function () {
  let account
  let raffle
  let vouchers
  let voucherAddress

  before(async function () {
    const accounts = await ethers.getSigners()
    account = await accounts[0].getAddress()
    console.log('Account: ' + account)
    console.log('---')

    const RaffleContract = await ethers.getContractFactory('RaffleContract')
    raffle = await RaffleContract.deploy(account)
    await raffle.deployed()

    const VoucherContract = await ethers.getContractFactory('VouchersFacet')
    vouchers = await VoucherContract.deploy(account)
    await vouchers.deployed()
    voucherAddress = vouchers.address
  })

  it('Should have 10 of each ticket', async function () {
    const balances = await vouchers.balanceOfAll(account)
    const totalSupply = await vouchers.totalSupply(0)
    expect(balances[0]).to.equal(10)
    expect(balances.length).to.equal(6)
    expect(balances.length).to.equal(6)
    expect(totalSupply).to.equal(10)
  })

  it('Should start raffle', async function () {

    // address stakeAddress;
    // uint256 stakeId; //The rarity type of the ticket
    // address prizeAddress;
    // uint256 prizeId; //The specific item of the item 
    // uint256 prizeValue;
    const items = [
      [voucherAddress, '0', voucherAddress, '0', '5'],
      [voucherAddress, '1', voucherAddress, '1', '5'],
      [voucherAddress, '2', voucherAddress, '2', '5']
    ]

    // Approve vouchers to transfer
    await vouchers.setApprovalForAll(raffle.address, true)

    const raffleEndTime = Number((Date.now() / 1000).toFixed()) + 86400
    await raffle.startRaffle(raffleEndTime, items)
    const info = await raffle.raffleInfo('0')
    const raffleEnd = Number(info.raffleEnd_)
    expect(raffleEnd).to.greaterThan(Number((Date.now() / 1000).toFixed()))
    expect
    expect(info.raffleItems_.length).to.equal(3)
  })

  it("Shouldn't be able to stake more tickets than they own", async function () {
    const stakeItems = [
      [voucherAddress, 0, 10],
      [voucherAddress, 1, 5],
    ]
    await truffleAssert.reverts(raffle.stake("0", stakeItems), "Vouchers: _value greater than balance")
  })

  it("Should stake tickets to raffle", async function () {
    const stakeItems = [
      [voucherAddress, 0, 5],
      [voucherAddress, 1, 5],
    ]
    await raffle.stake("0", stakeItems)
  })

  it("Should not draw a number before raffle ends", async function () {
    await truffleAssert.reverts(raffle.drawRandomNumber("0"), "Raffle: Raffle time has not expired")
  })

  it("Should draw random number for each prize", async function () {

    ethers.provider.send("evm_increaseTime", [86401])   // add 60 seconds
    await raffle.drawRandomNumber("0")
    const winners = await raffle['winners(uint256)']("0")
    const winner = winners[0]
    expect(winner.staker).to.equal(account)
    expect(winners.length).to.equal(2)
    winners.forEach((obj) => {
      expect(obj.claimed).to.equal(false)
    });
  })

  it("Cannot claim another random number", async function () {
    await truffleAssert.reverts(raffle.drawRandomNumber("0"), "Raffle: Random number already generated")
  })

  it("Should claim prizes", async function () {
    await raffle.claimPrize("0")
    const winners = await raffle['winners(uint256)']("0")
    winners.forEach((obj) => {
      expect(obj.claimed).to.equal(true)
    });
  })
})
