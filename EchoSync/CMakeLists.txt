cmake_minimum_required(VERSION 3.20)
project(EchoSync VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Optimization Flags for Low-End Target Hardware
if(MSVC)
    add_compile_options(/O2 /Oi /Ot /GL /W4 /permissive-)
    add_link_options(/LTCG)
else()
    add_compile_options(-O3 -Wall -Wextra -pedantic)
endif()

# New optional subsystems (default OFF for production builds)
option(ENABLE_DIAGNOSTICS "Enable diagnostics subsystem" OFF)
option(ENABLE_STATS "Enable statistics subsystem" OFF)
option(ENABLE_CACHE "Enable cache subsystem" OFF)
option(ENABLE_PROTECTION "Enable protection subsystem" OFF)
option(ENABLE_PROJECT_INTEL "Enable project intelligence subsystem" OFF)
option(ENABLE_DASHBOARD "Enable dashboard subsystem" OFF)
option(ENABLE_CLOUD "Enable cloud sync subsystem" OFF)

if(ENABLE_DIAGNOSTICS)
    add_compile_definitions(ENABLE_DIAGNOSTICS)
endif()
if(ENABLE_STATS)
    add_compile_definitions(ENABLE_STATS)
endif()
if(ENABLE_CACHE)
    add_compile_definitions(ENABLE_CACHE)
endif()
if(ENABLE_PROTECTION)
    add_compile_definitions(ENABLE_PROTECTION)
endif()
if(ENABLE_PROJECT_INTEL)
    add_compile_definitions(ENABLE_PROJECT_INTEL)
endif()
if(ENABLE_DASHBOARD)
    add_compile_definitions(ENABLE_DASHBOARD)
endif()
if(ENABLE_CLOUD)
    add_compile_definitions(ENABLE_CLOUD)
endif()

include_directories(include)

file(GLOB_RECURSE ECHOSYNC_SOURCES
    "src/*.cpp"
)

add_executable(EchoSync ${ECHOSYNC_SOURCES})

if(WIN32)
    target_link_libraries(EchoSync PRIVATE winmm ole32)
endif()

set_target_properties(EchoSync PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin"
)
