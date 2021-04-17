# BALLE Migration

This contract will be the responsible of the BALLE token migration to BALLEv2.
It will have only one method `migrate` that will take all BALLE tokens from the wallet, transfer them to the contract and mint BALLEv2 for the same amount to the wallet.
It needs to be allowed to make the BALLE token transfer from the wallet, so, a call to `approve` method of BALLE should be done before the call to `migrate`.

It needs to be added to BALLEv2 minters, so it can mint new BALLEv2 tokens for the same amount of BALLE tokens transferred.

The last date until which BATTLE token migration to BALLEv2 is allowed should be indicated by the block number in the contract `migrate` method.
