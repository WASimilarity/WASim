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

# Utility rule file for spectest-interp-copy-to-bin.

# Include any custom commands dependencies for this target.
include CMakeFiles/spectest-interp-copy-to-bin.dir/compiler_depend.make

# Include the progress variables for this target.
include CMakeFiles/spectest-interp-copy-to-bin.dir/progress.make

CMakeFiles/spectest-interp-copy-to-bin: spectest-interp
	/root/cmake-3.21.2-linux-x86_64/bin/cmake -E make_directory /root/wabt/bin
	/root/cmake-3.21.2-linux-x86_64/bin/cmake -E copy /root/wabt/build/spectest-interp /root/wabt/bin

spectest-interp-copy-to-bin: CMakeFiles/spectest-interp-copy-to-bin
spectest-interp-copy-to-bin: CMakeFiles/spectest-interp-copy-to-bin.dir/build.make
.PHONY : spectest-interp-copy-to-bin

# Rule to build all files generated by this target.
CMakeFiles/spectest-interp-copy-to-bin.dir/build: spectest-interp-copy-to-bin
.PHONY : CMakeFiles/spectest-interp-copy-to-bin.dir/build

CMakeFiles/spectest-interp-copy-to-bin.dir/clean:
	$(CMAKE_COMMAND) -P CMakeFiles/spectest-interp-copy-to-bin.dir/cmake_clean.cmake
.PHONY : CMakeFiles/spectest-interp-copy-to-bin.dir/clean

CMakeFiles/spectest-interp-copy-to-bin.dir/depend:
	cd /root/wabt/build && $(CMAKE_COMMAND) -E cmake_depends "Unix Makefiles" /root/wabt /root/wabt /root/wabt/build /root/wabt/build /root/wabt/build/CMakeFiles/spectest-interp-copy-to-bin.dir/DependInfo.cmake --color=$(COLOR)
.PHONY : CMakeFiles/spectest-interp-copy-to-bin.dir/depend

