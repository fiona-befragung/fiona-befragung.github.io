@echo off
rem ====================================================================
rem  Fiona zum Ausprobieren starten.
rem
rem  Doppelklick genuegt. Es oeffnet sich ein schwarzes Fenster und der
rem  Browser. Zum Beenden das schwarze Fenster schliessen.
rem
rem  Warum nicht einfach index.html doppelklicken? Weil Chrome sich die
rem  Mikrofon-Freigabe bei einer Datei-Adresse nicht merkt und dann bei
rem  JEDER Frage neu fragt. Ueber diesen Weg fragt er nur einmal.
rem ====================================================================
title Fiona - Befragung Kreisbrandmeister
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Fiona-Server.ps1"
