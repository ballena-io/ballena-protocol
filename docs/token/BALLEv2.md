# BALLEv2 Token

BEP-20 implementation of the [ballena.io](https://ballena.io) governance token.
This token will be minted from corresponding smart contracts until max supply of 40,000 reached.

The base implementation is relied to battle tested [OpenZeppelin ERC20](https://docs.openzeppelin.com/contracts/4.x/erc20). On top of this a cap is added to limit the maximun amount to be minted.
The minting will be made from a couple of sources, so, there is a mecanism to authorize addresses as minters.

## Governance

On contract creation, the creator address is established as governance address for the token. It will be assigned to the Gnosis Safe after deployment.
The governance address can authorize and revoke minters and set a new governance address.

## Minters

Only addresses authorized as governance or minters will be able to mint new BALLE.
Some of the minters will be:

- BALLEv2 Migration contract
- BALLEv2 Vault rewards contract
- BALLEv2 Governance pool rewards contract

Minting amount will be limited to the maximun supply of 40,000 BALLE.

## Misc

BALLEv2 token has an special function `governanceRecoverUnsupported` that can recover tokens sent accidentally to the token contract. In case someone messed up and send there his tokens, a request to the project governance can be made to claim them. The use of such function is at disposal of the governance and will be decided by voting. Not guarantee that it will be voted to send tokens back.
