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

# Include any dependencies generated for this target.
include CMakeFiles/wasm-validate.dir/depend.make
# Include any dependencies generated by the compiler for this target.
include CMakeFiles/wasm-validate.dir/compiler_depend.make

# Include the progress variables for this target.
include CMakeFiles/wasm-validate.dir/progress.make

# Include the compile flags for this target's objects.
include CMakeFiles/wasm-validate.dir/flags.make

CMakeFiles/wasm-validate.dir/src/tools/wasm-validate.cc.o: CMakeFiles/wasm-validate.dir/flags.make
CMakeFiles/wasm-validate.dir/src/tools/wasm-validate.cc.o: ../src/tools/wasm-validate.cc
CMakeFiles/wasm-validate.dir/src/tools/wasm-validate.cc.o: CMakeFiles/wasm-validate.dir/compiler_depend.ts
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green --progress-dir=/root/wabt/build/CMakeFiles --progress-num=$(CMAKE_PROGRESS_1) "Building CXX object CMakeFiles/wasm-validate.dir/src/tools/wasm-validate.cc.o"
	/usr/bin/c++ $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -MD -MT CMakeFiles/wasm-validate.dir/src/tools/wasm-validate.cc.o -MF CMakeFiles/wasm-validate.dir/src/tools/wasm-validate.cc.o.d -o CMakeFiles/wasm-validate.dir/src/tools/wasm-validate.cc.o -c /root/wabt/src/tools/wasm-validate.cc

CMakeFiles/wasm-validate.dir/src/tools/wasm-validate.cc.i: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Preprocessing CXX source to CMakeFiles/wasm-validate.dir/src/tools/wasm-validate.cc.i"
	/usr/bin/c++ $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -E /root/wabt/src/tools/wasm-validate.cc > CMakeFiles/wasm-validate.dir/src/tools/wasm-validate.cc.i

CMakeFiles/wasm-validate.dir/src/tools/wasm-validate.cc.s: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Compiling CXX source to assembly CMakeFiles/wasm-validate.dir/src/tools/wasm-validate.cc.s"
	/usr/bin/c++ $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -S /root/wabt/src/tools/wasm-validate.cc -o CMakeFiles/wasm-validate.dir/src/tools/wasm-validate.cc.s

# Object files for target wasm-validate
wasm__validate_OBJECTS = \
"CMakeFiles/wasm-validate.dir/src/tools/wasm-validate.cc.o"

# External object files for target wasm-validate
wasm__validate_EXTERNAL_OBJECTS =

wasm-validate: CMakeFiles/wasm-validate.dir/src/tools/wasm-validate.cc.o
wasm-validate: CMakeFiles/wasm-validate.dir/build.make
wasm-validate: libwabt.a
wasm-validate: CMakeFiles/wasm-validate.dir/link.txt
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green --bold --progress-dir=/root/wabt/build/CMakeFiles --progress-num=$(CMAKE_PROGRESS_2) "Linking CXX executable wasm-validate"
	$(CMAKE_COMMAND) -E cmake_link_script CMakeFiles/wasm-validate.dir/link.txt --verbose=$(VERBOSE)

# Rule to build all files generated by this target.
CMakeFiles/wasm-validate.dir/build: wasm-validate
.PHONY : CMakeFiles/wasm-validate.dir/build

CMakeFiles/wasm-validate.dir/clean:
	$(CMAKE_COMMAND) -P CMakeFiles/wasm-validate.dir/cmake_clean.cmake
.PHONY : CMakeFiles/wasm-validate.dir/clean

CMakeFiles/wasm-validate.dir/depend:
	cd /root/wabt/build && $(CMAKE_COMMAND) -E cmake_depends "Unix Makefiles" /root/wabt /root/wabt /root/wabt/build /root/wabt/build /root/wabt/build/CMakeFiles/wasm-validate.dir/DependInfo.cmake --color=$(COLOR)
.PHONY : CMakeFiles/wasm-validate.dir/depend

