# Shared SPU animation binding

The same NativeScriptProcessingUnit owns timers, active pointer, completion byte, VisualAnimation pointer, descriptor, CString and flags. The adapter offers one persistent checked facade; every access needs its live same-SPU scheduler scope. Snapshots are diagnostic copies.

ProcessScript polling and FullStop abort use the same PlayAni conductor and NativeInstructionProxyRegistry as initial invocation. Hero _AI_Jump now returns pending AL0 and resumes the actual Fall_Loop call through source GetAni services. Actor/cache/physics/world services are still required; no browser gameplay or native execution is claimed.

Factory defaults are the recovered complete fresh-constructor state, not a replay of Invalidate on an existing processor. Uninitialized scratch remains unknown until an original write occurs.
