# BALLEv2 Token

BEP-20 implementation of the [ballena.io](https://ballena.io) governance token.
This token will be minted from corresponding smart contracts until max supply of 40,000 reached.

The base implementation is relied to battle tested [OpenZeppelin ERC20](https://docs.openzeppelin.com/contracts/4.x/erc20). On top of this a cap is added to limit the maximun amount to be minted.
The minting will be made from a couple of sources, so, there is a mecanism to authorize addresses as minters.

## Governance

On contract creation, the creator address is established as governance address for the token. It will be assigned to the Gnosis Safe after deployment.
The governance address can authorize and revoke minters.

## Minters

Only addresses authorized as minters will be able to mint new BALLE.
Some of the minters will be:

- BALLEv2 Migration contract
- BALLEv2 Vault rewards contract
- BALLEv2 Governance pool rewards contract

Minting amount will be limited to the maximun supply of 40,000 BALLE.
