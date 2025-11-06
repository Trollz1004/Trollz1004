import { ethers } from "hardhat";

/**
 * 7-Step DAO Deployment Script for aidoesitall.org
 * Supports: Ethereum, Polygon, Arbitrum, Base
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Deploying DAO contracts with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // Step 1: Deploy Governance Token
  console.log("\n📝 Step 1: Deploying GovernanceToken...");
  const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
  const token = await GovernanceToken.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("✅ GovernanceToken deployed to:", tokenAddress);

  // Step 2: Deploy Timelock (2-day delay)
  console.log("\n⏱️  Step 2: Deploying Timelock...");
  const minDelay = 2 * 24 * 60 * 60; // 2 days in seconds
  const proposers: string[] = []; // Will be set to Governor after deployment
  const executors: string[] = []; // Will be set to Governor after deployment
  const admin = deployer.address; // Temporary admin

  const Timelock = await ethers.getContractFactory("Timelock");
  const timelock = await Timelock.deploy(minDelay, proposers, executors, admin);
  await timelock.waitForDeployment();
  const timelockAddress = await timelock.getAddress();
  console.log("✅ Timelock deployed to:", timelockAddress);

  // Step 3: Deploy Governor
  console.log("\n🏛️  Step 3: Deploying DAOGovernor...");
  const Governor = await ethers.getContractFactory("DAOGovernor");
  const governor = await Governor.deploy(tokenAddress, timelockAddress);
  await governor.waitForDeployment();
  const governorAddress = await governor.getAddress();
  console.log("✅ DAOGovernor deployed to:", governorAddress);

  // Step 4: Deploy Treasury
  console.log("\n💎 Step 4: Deploying Treasury...");
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy();
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("✅ Treasury deployed to:", treasuryAddress);

  // Step 5: Configure roles
  console.log("\n🔐 Step 5: Configuring roles...");
  const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
  const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
  const CANCELLER_ROLE = await timelock.CANCELLER_ROLE();
  const ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();

  console.log("Granting PROPOSER_ROLE to Governor...");
  await timelock.grantRole(PROPOSER_ROLE, governorAddress);

  console.log("Granting EXECUTOR_ROLE to Governor...");
  await timelock.grantRole(EXECUTOR_ROLE, governorAddress);

  console.log("Granting CANCELLER_ROLE to Governor...");
  await timelock.grantRole(CANCELLER_ROLE, governorAddress);

  console.log("Renouncing admin role for full decentralization...");
  await timelock.renounceRole(ADMIN_ROLE, deployer.address);
  console.log("✅ Roles configured");

  // Step 6: Delegate votes
  console.log("\n🗳️  Step 6: Delegating votes...");
  await token.delegate(deployer.address);
  console.log("✅ Votes delegated to deployer");

  // Step 7: Fund treasury
  console.log("\n💰 Step 7: Funding treasury...");
  const initialFunding = ethers.parseEther("10"); // 10 ETH
  const tx = await deployer.sendTransaction({
    to: treasuryAddress,
    value: initialFunding
  });
  await tx.wait();
  console.log("✅ Treasury funded with 10 ETH");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DAO DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log("\n📋 Contract Addresses:");
  console.log("GovernanceToken:", tokenAddress);
  console.log("Timelock:", timelockAddress);
  console.log("DAOGovernor:", governorAddress);
  console.log("Treasury:", treasuryAddress);
  console.log("\n⚙️  DAO Configuration:");
  console.log("Voting Delay: 1 day");
  console.log("Voting Period: 3 days");
  console.log("Proposal Threshold: 10,000 tokens (1%)");
  console.log("Quorum: 4%");
  console.log("Timelock Delay: 2 days");
  console.log("\n🔗 Next Steps:");
  console.log("1. Verify contracts on block explorer");
  console.log("2. Deploy frontend to aidoesitall.org");
  console.log("3. Distribute tokens to community");
  console.log("4. Create first governance proposal");
  console.log("\n💡 Verify Commands:");
  console.log(`npx hardhat verify --network ${network.name} ${tokenAddress}`);
  console.log(`npx hardhat verify --network ${network.name} ${timelockAddress} ${minDelay} "[]" "[]" ${admin}`);
  console.log(`npx hardhat verify --network ${network.name} ${governorAddress} ${tokenAddress} ${timelockAddress}`);
  console.log(`npx hardhat verify --network ${network.name} ${treasuryAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
