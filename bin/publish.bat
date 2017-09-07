@echo off

IF DEFINED GH_TOKEN (
  .\node_modules\.bin\build --win -p always
) ELSE (
  ECHO You must set the GH_TOKEN environment variable.
  EXIT 1
)
