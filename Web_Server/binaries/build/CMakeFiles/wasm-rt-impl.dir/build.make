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
include CMakeFiles/wasm-rt-impl.dir/depend.make
# Include any dependencies generated by the compiler for this target.
include CMakeFiles/wasm-rt-impl.dir/compiler_depend.make

# Include the progress variables for this target.
include CMakeFiles/wasm-rt-impl.dir/progress.make

# Include the compile flags for this target's objects.
include CMakeFiles/wasm-rt-impl.dir/flags.make

CMakeFiles/wasm-rt-impl.dir/wasm2c/wasm-rt-impl.c.o: CMakeFiles/wasm-rt-impl.dir/flags.make
CMakeFiles/wasm-rt-impl.dir/wasm2c/wasm-rt-impl.c.o: ../wasm2c/wasm-rt-impl.c
CMakeFiles/wasm-rt-impl.dir/wasm2c/wasm-rt-impl.c.o: CMakeFiles/wasm-rt-impl.dir/compiler_depend.ts
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green --progress-dir=/root/wabt/build/CMakeFiles --progress-num=$(CMAKE_PROGRESS_1) "Building C object CMakeFiles/wasm-rt-impl.dir/wasm2c/wasm-rt-impl.c.o"
	/usr/bin/cc $(C_DEFINES) $(C_INCLUDES) $(C_FLAGS) -MD -MT CMakeFiles/wasm-rt-impl.dir/wasm2c/wasm-rt-impl.c.o -MF CMakeFiles/wasm-rt-impl.dir/wasm2c/wasm-rt-impl.c.o.d -o CMakeFiles/wasm-rt-impl.dir/wasm2c/wasm-rt-impl.c.o -c /root/wabt/wasm2c/wasm-rt-impl.c

CMakeFiles/wasm-rt-impl.dir/wasm2c/wasm-rt-impl.c.i: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Preprocessing C source to CMakeFiles/wasm-rt-impl.dir/wasm2c/wasm-rt-impl.c.i"
	/usr/bin/cc $(C_DEFINES) $(C_INCLUDES) $(C_FLAGS) -E /root/wabt/wasm2c/wasm-rt-impl.c > CMakeFiles/wasm-rt-impl.dir/wasm2c/wasm-rt-impl.c.i

CMakeFiles/wasm-rt-impl.dir/wasm2c/wasm-rt-impl.c.s: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Compiling C source to assembly CMakeFiles/wasm-rt-impl.dir/wasm2c/wasm-rt-impl.c.s"
	/usr/bin/cc $(C_DEFINES) $(C_INCLUDES) $(C_FLAGS) -S /root/wabt/wasm2c/wasm-rt-impl.c -o CMakeFiles/wasm-rt-impl.dir/wasm2c/wasm-rt-impl.c.s

# Object files for target wasm-rt-impl
wasm__rt__impl_OBJECTS = \
"CMakeFiles/wasm-rt-impl.dir/wasm2c/wasm-rt-impl.c.o"

# External object files for target wasm-rt-impl
wasm__rt__impl_EXTERNAL_OBJECTS =

libwasm-rt-impl.a: CMakeFiles/wasm-rt-impl.dir/wasm2c/wasm-rt-impl.c.o
libwasm-rt-impl.a: CMakeFiles/wasm-rt-impl.dir/build.make
libwasm-rt-impl.a: CMakeFiles/wasm-rt-impl.dir/link.txt
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green --bold --progress-dir=/root/wabt/build/CMakeFiles --progress-num=$(CMAKE_PROGRESS_2) "Linking C static library libwasm-rt-impl.a"
	$(CMAKE_COMMAND) -P CMakeFiles/wasm-rt-impl.dir/cmake_clean_target.cmake
	$(CMAKE_COMMAND) -E cmake_link_script CMakeFiles/wasm-rt-impl.dir/link.txt --verbose=$(VERBOSE)

# Rule to build all files generated by this target.
CMakeFiles/wasm-rt-impl.dir/build: libwasm-rt-impl.a
.PHONY : CMakeFiles/wasm-rt-impl.dir/build

CMakeFiles/wasm-rt-impl.dir/clean:
	$(CMAKE_COMMAND) -P CMakeFiles/wasm-rt-impl.dir/cmake_clean.cmake
.PHONY : CMakeFiles/wasm-rt-impl.dir/clean

CMakeFiles/wasm-rt-impl.dir/depend:
	cd /root/wabt/build && $(CMAKE_COMMAND) -E cmake_depends "Unix Makefiles" /root/wabt /root/wabt /root/wabt/build /root/wabt/build /root/wabt/build/CMakeFiles/wasm-rt-impl.dir/DependInfo.cmake --color=$(COLOR)
.PHONY : CMakeFiles/wasm-rt-impl.dir/depend

