# /bin/bash
for d in ./*/ ; do (cd "$d" && echo "$d" && cloc --vcs git); done > cloc.out
