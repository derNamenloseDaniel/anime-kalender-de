' Startet `node <Skript>` ohne Konsolenfenster, wartet und gibt den Exit-Code des Skripts zurück (Aufruf: wscript.exe //B //NoLogo <diese Datei> <Skript> <Logdatei>).
' Grund: node.exe ist ein Konsolenprogramm; die Mod startet es sonst aus einem Elternprozess ohne Konsole, und Windows öffnet ein Fenster.
' wscript.exe ist ein Fensterprogramm, Run mit Fensterstil 0 versteckt das Kind. Die Fehlerausgabe (stderr) landet in der Logdatei.
Set sh = CreateObject("WScript.Shell")
befehl = "cmd /c node """ & WScript.Arguments(0) & """ 2> """ & WScript.Arguments(1) & """"
WScript.Quit sh.Run(befehl, 0, True)
