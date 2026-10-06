OnInit and OnGameStartUp execute ordered live calls and preserve failed prefixes.
Original PlayerMemory scalar adapter retains the captured physical PS and original notifications.
The same shared player controls are reset. Pending queue fields are never zeroed by OnInit.
All unported wrapper/helper/allocator/navigation/enclave/quest/stat/inventory calls remain explicit host boundaries.
No native code, tests, browser review, deployment or game completion is claimed.
