#----------------------------------------------------------------
# Generated CMake target import file.
#----------------------------------------------------------------

# Commands may need to know the format version.
set(CMAKE_IMPORT_FILE_VERSION 1)

# Import target "wabt::wabt" for configuration ""
set_property(TARGET wabt::wabt APPEND PROPERTY IMPORTED_CONFIGURATIONS NOCONFIG)
set_target_properties(wabt::wabt PROPERTIES
  IMPORTED_LINK_INTERFACE_LANGUAGES_NOCONFIG "C;CXX"
  IMPORTED_LOCATION_NOCONFIG "${_IMPORT_PREFIX}/lib/libwabt.a"
  )

list(APPEND _IMPORT_CHECK_TARGETS wabt::wabt )
list(APPEND _IMPORT_CHECK_FILES_FOR_wabt::wabt "${_IMPORT_PREFIX}/lib/libwabt.a" )

# Import target "wabt::wasm-rt-impl" for configuration ""
set_property(TARGET wabt::wasm-rt-impl APPEND PROPERTY IMPORTED_CONFIGURATIONS NOCONFIG)
set_target_properties(wabt::wasm-rt-impl PROPERTIES
  IMPORTED_LINK_INTERFACE_LANGUAGES_NOCONFIG "C"
  IMPORTED_LOCATION_NOCONFIG "${_IMPORT_PREFIX}/lib/libwasm-rt-impl.a"
  )

list(APPEND _IMPORT_CHECK_TARGETS wabt::wasm-rt-impl )
list(APPEND _IMPORT_CHECK_FILES_FOR_wabt::wasm-rt-impl "${_IMPORT_PREFIX}/lib/libwasm-rt-impl.a" )

# Commands beyond this point should not need to know the version.
set(CMAKE_IMPORT_FILE_VERSION)
