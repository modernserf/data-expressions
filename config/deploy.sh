#!/usr/bin/env bash
_TMP_CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
git checkout -b gh-pages &&
    npm run build:docs &&
    mv docs/* ./ &&
    git add . &&
    git commit -m "deploy" &&
    git push -u origin gh-pages --force &&
    git checkout $_TMP_CURRENT_BRANCH &&
    git branch -D gh-pages
