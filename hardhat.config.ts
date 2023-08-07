import 'dotenv/config';
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import '@typechain/hardhat'
import './tasks/NFTBridge'
import './tasks/ZKBridgeHandle'
import './tasks/LayerzeroHandle'


/* note: boolean environment variables are imported as strings */
module.exports = {
    hardhat: {
        initialBaseFeePerGas: 0,
        chainId: 31337,
        hardfork: "shanghai",
        forking: {
            url: process.env.ETH_MAINNET_URL || "",
            enabled: false,
        },
    },
    networks: {
        opbnb_test: {
            chainId: 5611,
            url: process.env.OPBNB_TESTNET_URL || "",
            accounts:
                process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
        },
        combo_test: {
            chainId: 91715,
            url: process.env.COMBO_TESTNET_URL || "",
            accounts:
                process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
        },
        bsc_test: {
            chainId: 97,
            url: process.env.BSC_TESTNET_URL || "",
            accounts:
                process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
        }
    },
    solidity: {
        compilers: [
            {
                version: "0.8.14",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                }
            }
        ]
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts"
    },
    mocha: {
        timeout: 40000
    },
    typechain: {
        outDir: "build/types",
        target: "ethers-v5"
    }
}
