#!/bin/bash
set -e

docker compose down
docker volume rm rome_user-home rome_rome-home
docker compose up -d
