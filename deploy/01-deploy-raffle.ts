import { ethers, network } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { VERIFICATION_BLOCK_CONFIRMATIONS, developmentChains, networkConfig } from "../helper-hardhat-config";
import { VRFCoordinatorV2Mock } from "../typechain-types";
import { verify } from "../utils/verify";
import { BigNumberish } from "ethers";

const VRF_SUBSCRIPTION_FUND_AMOUNT = ethers.parseEther('30')

const deployRaffle = async ({ getNamedAccounts, deployments }: HardhatRuntimeEnvironment) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    let vrfCoordinatorV2Address, subscriptionId:BigNumberish
    const entranceFee = networkConfig[chainId!].raffleEntranceFee;
    const gasLane = networkConfig[chainId!].gasLane
    const callbackGasLimit = networkConfig[chainId!].callbackGasLimit
    const interval = networkConfig[chainId!].keepersUpdateInterval

    if (developmentChains.includes(network.name)) {
        let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock = await ethers.getContract('VRFCoordinatorV2Mock')
        vrfCoordinatorV2Address = await vrfCoordinatorV2Mock.getAddress()
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
        const transactionReceipt = await transactionResponse.wait(1)
        subscriptionId = BigInt(transactionReceipt!.logs[0].topics[1])        
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUBSCRIPTION_FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId!].vrfCoordinatorV2;
        subscriptionId = networkConfig[chainId!].subscriptionId as BigNumberish
    }

    const args = [vrfCoordinatorV2Address, entranceFee, gasLane, subscriptionId, callbackGasLimit, interval]
    const waitBlockConfirmations = developmentChains.includes(network.name) ? 1 : VERIFICATION_BLOCK_CONFIRMATIONS

    const raffle = await deploy('Raffle', {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: waitBlockConfirmations
    })

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log('Verifying...')
        await verify(raffle.address, args)
    }

    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock:VRFCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address)
    }

}

export default deployRaffle
deployRaffle.tags = ["all", "raffle"]