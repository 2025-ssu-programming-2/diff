#!/usr/bin/env bash

RESET='\033[0m'
CYAN='\033[0;36m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'

load_env() {
    local env_file=".env"
    echo -e "${YELLOW}Found .env file! load .env file...${RESET}"
    if [ -f "$env_file" ]; then
        while IFS= read -r line || [ -n "$line" ]; do
            line=$(echo "$line" | sed 's/#.*$//')
            line=$(echo "$line" | xargs)
            [ -z "$line" ] && continue
            if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
                export "$line"
            fi
        done < "$env_file"
    fi
    echo -e "${YELLOW}Load .env file done!${RESET}"
}

show_progress() {
    local progress=0
    while kill -0 $1 2>/dev/null; do
        if [ $progress -lt 98 ]; then
            progress=$((progress + 2))
        fi
        printf "\rProgress: %d%%" $progress
        sleep 1
    done
    printf "\r${GREEN}Progress: 100%%${RESET}\n"
}

echo -e "${CYAN}Start build...${RESET}"

if ! command -v emcc >/dev/null 2>&1
then
    echo -e "${RED}'emcc' command could not found. please install it.${RESET}"
    exit 1
fi

# Load '.env' file
load_env

EMCC_CMD="emcc"

EXPORTED_FUNCTIONS="${EXPORTED_FUNCTIONS:-[\"_test_console\"]}"
EXPORTED_RUNTIME_METHODS="${EXPORTED_RUNTIME_METHODS:-[\"ccall\"]}"

echo -e "${YELLOW}Build C++ code...${RESET}"

$EMCC_CMD src/main.cpp -o public/main.js \
  -s EXPORTED_FUNCTIONS="$EXPORTED_FUNCTIONS" \
  -s EXPORTED_RUNTIME_METHODS="$EXPORTED_RUNTIME_METHODS" \
  -s ALLOW_MEMORY_GROWTH=1 &
EMCC_PID=$! # Set Process(emcc) ID

show_progress $EMCC_PID

wait $EMCC_PID

echo -e "${GREEN}Build C++ code done!${RESET}"

echo -e "${CYAN}Build done!${RESET}"
