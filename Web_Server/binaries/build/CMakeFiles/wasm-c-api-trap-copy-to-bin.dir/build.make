# CMAKE generated file: DO NOT EDIT!
# Generated by "Unix Makefiles" Generator, CMake Version 3.21

# Delete rule output on recipe failure.
.DELETE_ON_ERROR:

#=============================================================================
# Special targets provided by cmake.

# Disable implicit rules so canonical targets will work.
.SUFFIXES:

# Disable VCS-based implicit rules.
% : %,v

# Disable VCS-based implicit rules.
% : RCS/%

# Disable VCS-based implicit rules.
% : RCS/%,v

# Disable VCS-based implicit rules.
% : SCCS/s.%

# Disable VCS-based implicit rules.
% : s.%

.SUFFIXES: .hpux_make_needs_suffix_list

# Command-line flag to silence nested $(MAKE).
$(VERBOSE)MAKESILENT = -s

#Suppress display of executed commands.
$(VERBOSE).SILENT:

# A target that is always out of date.
cmake_force:
.PHONY : cmake_force

#=============================================================================
# Set environment variables for the build.

# The shell in which to execute make rules.
SHELL = /bin/sh

# The CMake executable.
CMAKE_COMMAND = /root/cmake-3.21.2-linux-x86_64/bin/cmake

# The command to remove a file.
RM = /root/cmake-3.21.2-linux-x86_64/bin/cmake -E rm -f

# Escaping for special characters.
EQUALS = =

# The top-level source directory on which CMake was run.
CMAKE_SOURCE_DIR = /root/wabt

# The top-level build directory on which CMake was run.
CMAKE_BINARY_DIR = /root/wabt/build

# Utility rule file for wasm-c-api-trap-copy-to-bin.

# Include any custom commands dependencies for this target.
include CMakeFiles/wasm-c-api-trap-copy-to-bin.dir/compiler_depend.make

# Include the progress variables for this target.
include CMakeFiles/wasm-c-api-trap-copy-to-bin.dir/progress.make

CMakeFiles/wasm-c-api-trap-copy-to-bin: wasm-c-api-trap
	/root/cmake-3.21.2-linux-x86_64/bin/cmake -E make_directory /root/wabt/bin
	/root/cmake-3.21.2-linux-x86_64/bin/cmake -E copy /root/wabt/build/wasm-c-api-trap /root/wabt/bin/
	/root/cmake-3.21.2-linux-x86_64/bin/cmake -E copy /root/wabt/third_party/wasm-c-api/example/trap.wasm /root/wabt/build/
	/root/cmake-3.21.2-linux-x86_64/bin/cmake -E copy /root/wabt/third_party/wasm-c-api/example/trap.wasm /root/wabt/bin/

wasm-c-api-trap-copy-to-bin: CMakeFiles/wasm-c-api-trap-copy-to-bin
wasm-c-api-trap-copy-to-bin: CMakeFiles/wasm-c-api-trap-copy-to-bin.dir/build.make
.PHONY : wasm-c-api-trap-copy-to-bin

# Rule to build all files generated by this target.
CMakeFiles/wasm-c-api-trap-copy-to-bin.dir/build: wasm-c-api-trap-copy-to-bin
.PHONY : CMakeFiles/wasm-c-api-trap-copy-to-bin.dir/build

CMakeFiles/wasm-c-api-trap-copy-to-bin.dir/clean:
	$(CMAKE_COMMAND) -P CMakeFiles/wasm-c-api-trap-copy-to-bin.dir/cmake_clean.cmake
.PHONY : CMakeFiles/wasm-c-api-trap-copy-to-bin.dir/clean

CMakeFiles/wasm-c-api-trap-copy-to-bin.dir/depend:
	cd /root/wabt/build && $(CMAKE_COMMAND) -E cmake_depends "Unix Makefiles" /root/wabt /root/wabt /root/wabt/build /root/wabt/build /root/wabt/build/CMakeFiles/wasm-c-api-trap-copy-to-bin.dir/DependInfo.cmake --color=$(COLOR)
.PHONY : CMakeFiles/wasm-c-api-trap-copy-to-bin.dir/depend

