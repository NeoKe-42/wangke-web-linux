WangKe Web Linux
================

This is a real Debian GNU/Linux system. It is not a simulation of a shell:
every command you type is executed by a genuine Linux userland (bash,
coreutils, python3, gcc, ...) running inside your browser.

How it works
------------
- The CheerpX engine translates 32-bit x86 machine code to WebAssembly
  on the fly and emulates the Linux kernel (syscalls, ext2, proc, devpts).
- The root filesystem you are looking at is an .ext2 disk image loaded
  from the website itself; writes are stored in your browser (IndexedDB)
  as an overlay and never leave this machine.
- Use the "恢复系统" button in the top-right Settings dialog to wipe the
  overlay and restore the pristine system.

Installed tools
---------------
bash, coreutils, curl, wget, git, vim, nano, python3, gcc, make,
tree, htop, neofetch, less, file, procps.

Files
-----
README.txt      this file
projects.txt    placeholder for your project list
papers.txt      placeholder for your paper list
welcome.sh      prints the login welcome message

Networking
----------
Open Settings → Network to connect via Tailscale. With an exit node on
your tailnet you can reach the public internet (curl/wget; ICMP/ping is
not available in this environment).
