# Original SharedBase CRT startup evidence

This package captures 13 original functions covering CRT attach/startup, security-cookie initialization, heap selection/construction/destruction, thread startup/termination, encoded procedure initialization, locks, thread cleanup and locale reference increments. Every captured instruction is compared with the original SharedBase.dll bytes. It also captures ten cold image ranges with section-backed versus loader-zero-fill evidence.

SharedBase owns these globals independently of Game and Engine. Its two dynamic thread indices begin at `ffffffff`; the four procedure slots begin as loader-filled zero bytes. The static TLS index from the PE TLS directory is a different field. Loading static TLS does not allocate either dynamic slot, initialize the heap, install FLS/TLS procedures or initialize CRT thread data.

`__mtinit` resolves four FLS procedures, falls back to the original TLS procedures if any is unavailable, allocates a getter-cache TLS index, initializes pointer encoding, initializes locks, allocates a PTD slot with its cleanup callback, allocates 0x214 bytes, installs that allocation and initializes its locale/thread fields. Failed branches run the original teardown where specified. None of these effects can be replaced with a successful metadata flag.

The formatter reads the SharedBase security cookie at `10140d6c`. Its cold value is `bb40e64e`, and the original cookie initializer derives a new value from the declared time/process/thread/tick/performance providers and stores its complement at `10140d70`. A cold-image read is not evidence that cookie initialization returned.

This is source evidence. No SharedBase CRT attach, heap, locks, dynamic PTD startup or formatter execution is claimed. The existing selected property diagnostic remains stopped at `100a7eff -> 100b5355`; live Game startup remains outside `__cinit`.

Reproduce with `python tools/gothic3/prepare_shared_crt_bootstrap.py --study <offline-study-directory> --output <output-directory>` using the preserved original installation study.
