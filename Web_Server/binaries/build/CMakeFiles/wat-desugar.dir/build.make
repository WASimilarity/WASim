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
include CMakeFiles/wat-desugar.dir/depend.make
# Include any dependencies generated by the compiler for this target.
include CMakeFiles/wat-desugar.dir/compiler_depend.make

# Include the progress variables for this target.
include CMakeFiles/wat-desugar.dir/progress.make

# Include the compile flags for this target's objects.
include CMakeFiles/wat-desugar.dir/flags.make

CMakeFiles/wat-desugar.dir/src/tools/wat-desugar.cc.o: CMakeFiles/wat-desugar.dir/flags.make
CMakeFiles/wat-desugar.dir/src/tools/wat-desugar.cc.o: ../src/tools/wat-desugar.cc
CMakeFiles/wat-desugar.dir/src/tools/wat-desugar.cc.o: CMakeFiles/wat-desugar.dir/compiler_depend.ts
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green --progress-dir=/root/wabt/build/CMakeFiles --progress-num=$(CMAKE_PROGRESS_1) "Building CXX object CMakeFiles/wat-desugar.dir/src/tools/wat-desugar.cc.o"
	/usr/bin/c++ $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -MD -MT CMakeFiles/wat-desugar.dir/src/tools/wat-desugar.cc.o -MF CMakeFiles/wat-desugar.dir/src/tools/wat-desugar.cc.o.d -o CMakeFiles/wat-desugar.dir/src/tools/wat-desugar.cc.o -c /root/wabt/src/tools/wat-desugar.cc

CMakeFiles/wat-desugar.dir/src/tools/wat-desugar.cc.i: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Preprocessing CXX source to CMakeFiles/wat-desugar.dir/src/tools/wat-desugar.cc.i"
	/usr/bin/c++ $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -E /root/wabt/src/tools/wat-desugar.cc > CMakeFiles/wat-desugar.dir/src/tools/wat-desugar.cc.i

CMakeFiles/wat-desugar.dir/src/tools/wat-desugar.cc.s: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Compiling CXX source to assembly CMakeFiles/wat-desugar.dir/src/tools/wat-desugar.cc.s"
	/usr/bin/c++ $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -S /root/wabt/src/tools/wat-desugar.cc -o CMakeFiles/wat-desugar.dir/src/tools/wat-desugar.cc.s

# Object files for target wat-desugar
wat__desugar_OBJECTS = \
"CMakeFiles/wat-desugar.dir/src/tools/wat-desugar.cc.o"

# External object files for target wat-desugar
wat__desugar_EXTERNAL_OBJECTS =

wat-desugar: CMakeFiles/wat-desugar.dir/src/tools/wat-desugar.cc.o
wat-desugar: CMakeFiles/wat-desugar.dir/build.make
wat-desugar: libwabt.a
wat-desugar: CMakeFiles/wat-desugar.dir/link.txt
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green --bold --progress-dir=/root/wabt/build/CMakeFiles --progress-num=$(CMAKE_PROGRESS_2) "Linking CXX executable wat-desugar"
	$(CMAKE_COMMAND) -E cmake_link_script CMakeFiles/wat-desugar.dir/link.txt --verbose=$(VERBOSE)

# Rule to build all files generated by this target.
CMakeFiles/wat-desugar.dir/build: wat-desugar
.PHONY : CMakeFiles/wat-desugar.dir/build

CMakeFiles/wat-desugar.dir/clean:
	$(CMAKE_COMMAND) -P CMakeFiles/wat-desugar.dir/cmake_clean.cmake
.PHONY : CMakeFiles/wat-desugar.dir/clean

CMakeFiles/wat-desugar.dir/depend:
	cd /root/wabt/build && $(CMAKE_COMMAND) -E cmake_depends "Unix Makefiles" /root/wabt /root/wabt /root/wabt/build /root/wabt/build /root/wabt/build/CMakeFiles/wat-desugar.dir/DependInfo.cmake --color=$(COLOR)
.PHONY : CMakeFiles/wat-desugar.dir/depend

