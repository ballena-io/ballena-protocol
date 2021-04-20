# BalleMaster

This contract will take care of all rewards calculations and distribution of BALLE tokens in vaults.
It's ownable and the owner is the only who can manage the active vaults and it's parameters for rewards distribution.
The ownership will be transferred to the Governance GNOSIS Safe

## Information

This contract is the central information repository for all vaults and the user state across them to get a precise BALLE rewards calculation and visualization on frontend app.

### Vault information

Regarding vault information, there is an array of vaults (indexed by vault id) wich stores an structure of `VaultInfo` type with the following contents (for each vault):

- `depositToken`: blockchain address of the token deposited by user.
- `wantToken`: blockchain address of the token the strategy maximizes.
- `rewardsActive`: rewards are being distributed for this vault.
- `allocPoint`: rewards allocation points assigned to the vault.
- `lastRewardBlock`: last block number that BALLEs distribution occurred in the vault.
- `accBallePerShare`: accumulated BALLEs per share, times 1e12.
- `strat`: blockchain address of the strategy contract implementation.

### User information

There is a mapping to store user participation and rewards debt for each vault. This is stored in an structure of `UserInfo` type with the following contents:

- `shares`: user shares of the corresponding vault.
- `rewardDebt`: reward debt of the user in this vault.

## Reward calculations

The BALLE rewards distribution for vaults is a fixed quantity (24,000 BALLE) that will get distributed at a fixed ratio per block of 0.002283105022831050 BALLE/block (approx. 2.739726 BALLE/hour).

That BALLE distribution per block will be divided by the sum of all vault's allocation points and multiplied by the allocation points of the vault being rewarded, that way, rewards can be ballanced between vaults.

For example, if there are three vaults, two with 100 allocation points and another with 200, the later one will get double rewards related to the former ones, that is:

- Vault 1 (100 alloc points): 0.6849315 BALLE/hour.
- Vault 2 (100 alloc points): 0.6849315 BALLE/hour.
- Vault 3 (200 alloc points): 1.369863 BALLE/hour.

This will be informed on user interface with a multiplier displayed on each vault, indicating the effective factor for each vault: 1x, 2x, 5x etc.

Each user will get his part of rewards from the vault, proportional to his shares. For this calculation to work, each time a user varies his participation on a vault, this is what happen:

- The vault's `accBallePerShare` and `lastRewardBlock` gets updated.
- User receives the pending reward sent to his address.
- User's `shares` gets updated.
- User's `rewardDebt` gets updated.

At any point in time, the amount of BALLEs entitled to a user but is pending to be distributed is:

    pending reward = (user.shares * vault.accBallePerShare) / 1e12 - user.rewardDebt

## Vault management

Each vault is managed from two smart contracts, this one, that will be responsible for its lifecycle, rewards distribution and entry/exit point or interface with the user (every operation with the vault will be thru this contract), and the Strategy smart contract that will implement the strategy details and will interact with the destination platform.

No tokens are held in any of the two contracts of the vault, they only pass thru them to reach the destination's platform farm smart contract when the user makes a deposit and the inverse path on withdrawal.

For the creation of a new vault, a new strategy smart contract will be deployed to the blockchain. Then a new entry to vault's registry on BalleMaster smart contract will be created with the address of the tokens involved and the strategy smart contract address. This step will be made by a call to `addVault()`.
At this point, the vault is created, so it can be tested that deposit and withdraw functions are working properly (`deposit()`, `withdraw()`, `emergencyWithdraw()` and `harvest()`), to ensure that there will be no problems with user's tokens.

The only thing that is not working still is the BALLE rewards distribution to ensure that testing phase previous to launch will not interfere with rewards distribution.

For activation of BALLE reward distribution on the new vault, a transaction from our GNOSIS Management Safe should be made. This is to ensure that no one person alone can change rewards distribution on vaults. The GNOSIS safe is set as the owner of our BalleMaster smart contract after deployment on mainnet and all methods involved in reward distribution and balancing should be made from it. For these transactions to be made, a determined number of signatures on the GNOSIS Safe will be needed.

### Rewards activation

After the creation and testing of the new vault, it will need an activation from the GNOSIS Management Safe that will call the `activateVaultRewards()` method of the smart contract. With this call, where the `allocPoint` for the vault should be indicated, all needed variables for the vault get initialized and reward distribution starts from the next block onwards.

### Rewards modification

If, at some point, the rewards distribution multiplicator for one vault needs to be changed, it can be made from the GNOSIS Management Safe with a call to `modifyVaultRewards()` method of the smart contract with the new `allocPoint` for the vault.

### Rewards deactivation

In case a vault needs to be retired, it should be deactivated from rewards distribution to not interfere with the active vaults. This will be made from our GNOSIS Management Safe with a call to `deactivateVaultRewards()` method of the smart contract.

## Vault information for frontend

There is some information about the vaults to show in the frontend app that should be obtained here.

The first, is the visibility of the vault itself. The vault shoul be made visible on our frontend on the same moment the activation occurs, and while this can not be determined exactly (depends when the last needed signature on the GNOSIS is made), there should be a method to show the vault automatically when it's activated (reading his status information from the smart contract)

The status information from the vault useful for frontend can be read from `vaultInfo(VAULT_ID)`:

- `lastRewardBlock`: is set to 0 when the vault is created, then set to the block that is activated. So, if 0 is not activated and if >0 it was activated.
- `rewardsActive`: the vault gets BALLE
- `allocPoint`: rewards multiplier (100 = 1x)

To get the staked tokens of the user (will include benefits in case of an autocompounding strategy): `stakedTokens(VAULT_ID, WALLET_ADDRESS)`

To get pending BALLE rewards of the user: `pendingBalle(VAULT_ID, WALLET_ADDRESS)`
