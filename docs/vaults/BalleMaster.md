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
