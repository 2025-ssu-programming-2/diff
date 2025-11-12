cmake_minimum_required(VERSION 4.0)
project(diff)

set(CMAKE_CXX_STANDARD 20)

add_custom_target(
    build ALL
    WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
    COMMAND ${CMAKE_SOURCE_DIR}/build.sh
    COMMENT "...CMAKE BUILD START..."
)

add_custom_target(
    build_windows ALL
    WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
    COMMAND ${CMAKE_SOURCE_DIR}/build.ps1
    COMMENT "...CMAKE BUILD(WINDOWS) START..."
)