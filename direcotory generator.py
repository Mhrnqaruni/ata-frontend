#!/usr/bin/env python3

import os

# ─── CONFIGURE ────────────────────────────────────────────────────────────────
max_depth = 3  # Set the maximum depth to explore. 0 for root only, 1 for root + children, etc.

skip_dirs = [
    "venv",
    ".pytest_cache",
    "test",
    ".git",
    "__pycache__",
    "GCSE",
    "Primary School",
    "Sixth Form - College",
    "node_modules"
    # add more folder names here to skip
]

output_file = "directory_map.txt"
# ────────────────────────────────────────────────────────────────────────────────

def main():
    root_dir = os.getcwd()
    base = os.path.basename(root_dir.rstrip(os.path.sep))
    
    with open(output_file, "w", encoding="utf-8") as f:
        # We don't write the root here, os.walk will handle it on the first iteration

        for current_root, dirs, files in os.walk(root_dir):
            # relative path from root
            rel_path = os.path.relpath(current_root, root_dir)
            
            # --- DEPTH CALCULATION ---
            if rel_path == ".":
                depth = 0
            else:
                depth = len(rel_path.split(os.path.sep))
            
            # --- PRUNING LOGIC ---
            # Prune skip_dirs first
            # We iterate over a copy of dirs using list(dirs) because we modify it in the loop
            for d in list(dirs):
                if d in skip_dirs:
                    # Construct the path to show it's being skipped
                    if depth < max_depth: # Only show skipped message if within depth
                        if rel_path == ".":
                             prefix = f"/{base}"
                        else:
                             prefix = f"/{base}/{rel_path.replace(os.path.sep, '/')}"
                        skip_path = prefix + "/" + d + "/"
                        f.write(skip_path + " (skipped)\n")
                    dirs.remove(d) # Prune it from traversal

            # Now, prune based on max_depth
            if depth >= max_depth:
                dirs[:] = [] # Clear the list of directories to visit next, stopping the descent

            # --- OUTPUT GENERATION ---
            # Construct the display prefix for the current directory
            if rel_path == ".":
                prefix = f"/{base}"
            else:
                prefix = f"/{base}/{rel_path.replace(os.path.sep, '/')}"

            # write this folder’s path
            f.write(prefix + "/\n")

            # list files: full path for first, shortened for the rest
            if files:
                # full path for the first file
                first_file = files[0]
                f.write(f"{prefix}/{first_file}\n")

                # for subsequent files, show only ".../<last_dir>/<filename>"
                last_dir = os.path.basename(current_root)
                for filename in files[1:]:
                    f.write(f".../{last_dir}/{filename}\n")

    print(f"Directory map written to {output_file} (up to a depth of {max_depth})")

if __name__ == "__main__":
    main()