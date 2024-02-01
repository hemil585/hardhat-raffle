import { assert, expect } from "chai"
import { BigNumberish } from "ethers"
import { network, deployments, ethers } from "hardhat"
import { developmentChains, networkConfig } from "../../helper-hardhat-config"
import { Raffle, VRFCoordinatorV2Mock } from "../../typechain-types"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle", async () => {
    let raffle: Raffle
    let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock
    let player: SignerWithAddress
    let accounts: SignerWithAddress[]
    let entranceFee: BigNumberish
    let interval: bigint

    beforeEach(async () => {
      accounts = await ethers.getSigners(); // could also do with getNamedAccounts
      player = accounts[0];
      await deployments.fixture(["all"]);
      raffle = await ethers.getContract("Raffle", player);
      vrfCoordinatorV2Mock = await ethers.getContract(
        "VRFCoordinatorV2Mock",
        player
      );
      entranceFee = await raffle.viewEntranceFee();
      interval = await raffle.getInterval();
    });

    describe("constructor", () => {
      it("should intitializes the raffle correctly", async () => {
        const raffleState = await raffle.viewRaffleState();
        assert.equal(raffleState.toString(), "0");
        assert.equal(
          interval.toString(),
          networkConfig[network.config.chainId!]["keepersUpdateInterval"]
        );
      });
    });

    describe("enterRaffle", () => {
      it("reverts when you don't pay enough", async () => {
        await expect(raffle.enter()).to.be.reverted;
      });

      it("records player when they enter", async () => {
        await raffle.enter({ value: entranceFee });
        const contractPlayer = await raffle.viewPlayers(0);
        assert.equal(player.address, contractPlayer);
      });

      it("emits event on enter", async () => {
        await expect(raffle.enter({ value: entranceFee })).to.emit(
          raffle,
          "RaffleEnter"
        );
      });

      it("doesn't allow entrance when raffle is calculating", async () => {
        await raffle.enter({ value: entranceFee });
        await network.provider.send("evm_increaseTime", [
          Number(interval) + 1,
        ]);
        await network.provider.request({ method: "evm_mine", params: [] });
        await raffle.performUpkeep("0x");
        await expect(raffle.enter({ value: entranceFee })).to.be.reverted;
      });
    });

    describe("performUpkeep", function () {
      it("can only run if checkupkeep is true", async () => {
        await raffle.enter({ value: entranceFee })
        await network.provider.send("evm_increaseTime", [Number(interval) + 1])
        await network.provider.request({ method: "evm_mine", params: [] })
        const tx = await raffle.performUpkeep("0x")
        assert(tx)
      })
    })
  });
