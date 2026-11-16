"""One GPU job at a time, across both labs, so their downloads can run side by side.

SAM 3 next to MM-Grounding-DINO spilled GPU memory into system RAM and froze the PC, so every step that loads a
large model takes this lock first; downloads and CPU work don't, and run while another job holds it.
The lock is an OS file lock on tools/.gpu.lock: it is released when the holder exits, even if it crashes.

usage: python gpu_lock.py <command> [args...]    # runs the command while holding the lock, exits with its code
       with gpu_lock.held(): ...                 # from Python
"""
import contextlib, os, pathlib, shutil, subprocess, sys, time

LOCK = pathlib.Path(__file__).parent / ".gpu.lock"


@contextlib.contextmanager
def held():
    with open(LOCK, "a+b") as f:
        while True:
            try:
                if os.name == "nt":
                    import msvcrt
                    f.seek(0)
                    msvcrt.locking(f.fileno(), msvcrt.LK_NBLCK, 1)
                else:
                    import fcntl
                    fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except OSError:
                time.sleep(2)
        try:
            yield
        finally:
            if os.name == "nt":
                import msvcrt
                f.seek(0)
                msvcrt.locking(f.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                import fcntl
                fcntl.flock(f, fcntl.LOCK_UN)


if __name__ == "__main__":
    cmd = sys.argv[1:]
    # Windows can't start a relative path like .venv/Scripts/python.exe; resolve it first.
    cmd[0] = shutil.which(cmd[0]) or os.path.abspath(cmd[0])
    with held():
        sys.exit(subprocess.call(cmd))
