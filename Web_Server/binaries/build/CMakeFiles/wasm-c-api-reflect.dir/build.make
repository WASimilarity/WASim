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
include CMakeFiles/wasm-c-api-reflect.dir/depend.make
# Include any dependencies generated by the compiler for this target.
include CMakeFiles/wasm-c-api-reflect.dir/compiler_depend.make

# Include the progress variables for this target.
include CMakeFiles/wasm-c-api-reflect.dir/progress.make

# Include the compile flags for this target's objects.
include CMakeFiles/wasm-c-api-reflect.dir/flags.make

CMakeFiles/wasm-c-api-reflect.dir/third_party/wasm-c-api/example/reflect.c.o: CMakeFiles/wasm-c-api-reflect.dir/flags.make
CMakeFiles/wasm-c-api-reflect.dir/third_party/wasm-c-api/example/reflect.c.o: ../third_party/wasm-c-api/example/reflect.c
CMakeFiles/wasm-c-api-reflect.dir/third_party/wasm-c-api/example/reflect.c.o: CMakeFiles/wasm-c-api-reflect.dir/compiler_depend.ts
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green --progress-dir=/root/wabt/build/CMakeFiles --progress-num=$(CMAKE_PROGRESS_1) "Building C object CMakeFiles/wasm-c-api-reflect.dir/third_party/wasm-c-api/example/reflect.c.o"
	/usr/bin/cc $(C_DEFINES) $(C_INCLUDES) $(C_FLAGS) -MD -MT CMakeFiles/wasm-c-api-reflect.dir/third_party/wasm-c-api/example/reflect.c.o -MF CMakeFiles/wasm-c-api-reflect.dir/third_party/wasm-c-api/example/reflect.c.o.d -o CMakeFiles/wasm-c-api-reflect.dir/third_party/wasm-c-api/example/reflect.c.o -c /root/wabt/third_party/wasm-c-api/example/reflect.c

CMakeFiles/wasm-c-api-reflect.dir/third_party/wasm-c-api/example/reflect.c.i: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Preprocessing C source to CMakeFiles/wasm-c-api-reflect.dir/third_party/wasm-c-api/example/reflect.c.i"
	/usr/bin/cc $(C_DEFINES) $(C_INCLUDES) $(C_FLAGS) -E /root/wabt/third_party/wasm-c-api/example/reflect.c > CMakeFiles/wasm-c-api-reflect.dir/third_party/wasm-c-api/example/reflect.c.i

CMakeFiles/wasm-c-api-reflect.dir/third_party/wasm-c-api/example/reflect.c.s: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Compiling C source to assembly CMakeFiles/wasm-c-api-reflect.dir/third_party/wasm-c-api/example/reflect.c.s"
	/usr/bin/cc $(C_DEFINES) $(C_INCLUDES) $(C_FLAGS) -S /root/wabt/third_party/wasm-c-api/example/reflect.c -o CMakeFiles/wasm-c-api-reflect.dir/third_party/wasm-c-api/example/reflect.c.s

# Object files for target wasm-c-api-reflect
wasm__c__api__reflect_OBJECTS = \
"CMakeFiles/wasm-c-api-reflect.dir/third_party/wasm-c-api/example/reflect.c.o"

# External object files for target wasm-c-api-reflect
wasm__c__api__reflect_EXTERNAL_OBJECTS =

wasm-c-api-reflect: CMakeFiles/wasm-c-api-reflect.dir/third_party/wasm-c-api/example/reflect.c.o
wasm-c-api-reflect: CMakeFiles/wasm-c-api-reflect.dir/build.make
wasm-c-api-reflect: libwasm.so
wasm-c-api-reflect: libwabt.a
wasm-c-api-reflect: CMakeFiles/wasm-c-api-reflect.dir/link.txt
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green --bold --progress-dir=/root/wabt/build/CMakeFiles --progress-num=$(CMAKE_PROGRESS_2) "Linking CXX executable wasm-c-api-reflect"
	$(CMAKE_COMMAND) -E cmake_link_script CMakeFiles/wasm-c-api-reflect.dir/link.txt --verbose=$(VERBOSE)

# Rule to build all files generated by this target.
CMakeFiles/wasm-c-api-reflect.dir/build: wasm-c-api-reflect
.PHONY : CMakeFiles/wasm-c-api-reflect.dir/build

CMakeFiles/wasm-c-api-reflect.dir/clean:
	$(CMAKE_COMMAND) -P CMakeFiles/wasm-c-api-reflect.dir/cmake_clean.cmake
.PHONY : CMakeFiles/wasm-c-api-reflect.dir/clean

CMakeFiles/wasm-c-api-reflect.dir/depend:
	cd /root/wabt/build && $(CMAKE_COMMAND) -E cmake_depends "Unix Makefiles" /root/wabt /root/wabt /root/wabt/build /root/wabt/build /root/wabt/build/CMakeFiles/wasm-c-api-reflect.dir/DependInfo.cmake --color=$(COLOR)
.PHONY : CMakeFiles/wasm-c-api-reflect.dir/depend

