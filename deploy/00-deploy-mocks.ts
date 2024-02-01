import { ethers, network } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/dist/types";
import { developmentChains } from "../helper-hardhat-config";

const BASE_FEE = ethers.parseEther('0.25')  // 0.25 LINK per request
const GAS_PRICE_LINK = 1e9;  // LINK per gas

const deployMocks: DeployFunction = async ({ getNamedAccounts, deployments }: HardhatRuntimeEnvironment) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const args = [BASE_FEE, GAS_PRICE_LINK]

    if (developmentChains.includes(network.name)) {
        log('Deploying mocks on local network...')
        await deploy('VRFCoordinatorV2Mock', {
            from: deployer,
            args: args,
            log: true,
        })
        log('Mocks Deployed!')
    }
}

export default deployMocks
deployMocks.tags = ["all", "mocks"]