# Fiona — Befragung zum Aufgabenbild des Kreisbrandmeisters

Eine anonyme, KI-geführte Befragung der Stadt-, Gemeinde- und Ortsbrandmeister
im Landkreis Vechta samt Stellvertretern. Ziel: herausfinden, welche Aufgaben
und Erwartungen an den Kreisbrandmeister und seine Stellvertreter gerichtet
werden.

**Es entstehen keine Kosten.** Die Seite ist reines HTML, CSS und JavaScript.
Während des Gesprächs geht nichts nach außen — kein KI-Dienst, kein Server,
keine Anmeldung.

---

## Zum Ausprobieren

**Doppelklick auf `Fiona starten.cmd`.** Es öffnet sich ein schwarzes Fenster
und der Browser. Zum Beenden das schwarze Fenster schließen.

> **Warum nicht einfach `index.html` doppelklicken?**
>
> Weil Chrome sich bei einer Datei-Adresse (`file://...`) die Mikrofon-Freigabe
> **grundsätzlich nicht merkt** — dort gibt es keinen Ursprung, den er speichern
> könnte. Folge: Bei **jeder einzelnen Frage** kommt die Abfrage neu. Das ist
> keine Fehlfunktion und lässt sich mit keinem Programmiertrick umgehen.
>
> `Fiona starten.cmd` liefert denselben Ordner über `http://localhost:8080` aus.
> Das gilt Chrome als sicherer Ursprung — die Freigabe wird gespeichert und
> **genau einmal** abgefragt. Es wird nichts installiert und nichts ins Internet
> gestellt; der Server läuft nur auf diesem Rechner.
>
> Öffnet man die Seite doch als Datei, weist sie auf der Vorbereitungsseite
> selbst darauf hin.

Die Seite läuft im **Testbetrieb**, solange in `leitfaden.js` kein Formularlink
eingetragen ist: Am Ende wird nichts abgeschickt, man kann den Text nur
herunterladen. Genau richtig für den Trockenlauf.

## Die Dateien

| Datei | Wofür |
|---|---|
| **`leitfaden.js`** | **Hier änderst Du den Wortlaut.** Alle Fragen, Nachfragen, Stichwörter, Einstellungen |
| `fiona.js` | Die Steuerung. Muss man für Textänderungen nicht anfassen |
| `styles.css` | Aussehen |
| `index.html` | Gerüst und die Hinweisfenster |
| `Fiona starten.cmd` | **Zum Ausprobieren doppelklicken** — startet den lokalen Server |
| `Fiona-Server.ps1` | Der kleine Server dahinter. Nicht anfassen nötig |

Nach einer Änderung: Datei speichern, im Browser **F5** drücken.

## Scharf schalten

1. In Microsoft Forms ein Formular anlegen mit **einer einzigen Frage** vom Typ
   *Langer Text*, zum Beispiel: „Bitte füge hier Deine Zusammenfassung ein."
2. Unter *Einstellungen*: **„Jede Person kann antworten"** wählen.
   Das ist zwingend — die Teilnehmer haben in der Regel kein Konto in der
   Microsoft-365-Umgebung, in der das Formular liegt.
3. Prüfen, dass **keine Namen erfasst** werden. Microsoft Forms zeichnet Namen
   je nach Voreinstellung mit auf. Nach dem ersten Testeintrag in die
   Ergebnisdatei schauen: Es darf **keine** Namensspalte geben.
4. Den Formularlink in `leitfaden.js` bei `formularUrl` eintragen.
5. Selbst einen kompletten Durchlauf machen und prüfen, dass der Text ankommt.

## Veröffentlichen über GitHub Pages

1. Neues **öffentliches** Repository anlegen, zum Beispiel `fiona-befragung`.
2. Den Inhalt dieses Ordners hineinlegen.
3. *Settings → Pages → Source: Deploy from a branch → main / (root)*.
4. Nach ein paar Minuten liegt die Seite unter
   `https://<benutzername>.github.io/fiona-befragung/`.
5. Diesen Link in die Einladungs-E-Mail.

> **Wichtig:** In dieses Repository gehört **nur** dieser Ordner — keine
> internen Unterlagen, keine Teilnehmerdaten.

## Wie Fiona arbeitet

Fiona folgt einem Drehbuch. Sie denkt sich keine neuen Fragen aus, aber sie
reagiert:

- **Verzweigungen.** Fällt in der Antwort auf „Was fehlt Dir?" ein Stichwort wie
  *Leitstelle*, *Ausbildung* oder *Beschaffung*, kommt die passende Nachfrage.
  Höchstens zwei je Block.
- **Anstoß.** Kommt bei der wichtigsten Frage (Block 3) sehr wenig, hilft Fiona
  einmal mit einem Hinweis auf das Brandschutzgesetz nach.
- **Nachfassen.** Am Ende von Block 7 fragt sie nach — je nachdem, ob viel oder
  wenig kam, mit unterschiedlichem Wortlaut.

Am Schluss setzt sie aus allen Antworten eine gegliederte Zusammenfassung
zusammen. Der Teilnehmer kann sie **bearbeiten**, bevor er speichert.

## Was für die Anonymität getan wird

| Maßnahme | Wo |
|---|---|
| Kein Name, keine E-Mail, kein persönlicher Link | überall |
| Namen nach „ich bin …" werden durch `[Name]` ersetzt | automatisch |
| Keine Frage nach der Gemeinde | Block 1 |
| Gemeindenamen aus dem Landkreis werden durch `[Ort]` ersetzt | automatisch |
| Angaben zu Partei, Gewerkschaft, Religion, Gesundheit werden durch `[entfernt]` ersetzt | automatisch |
| Kein Ton wird aufgezeichnet oder gespeichert | — |
| Der Teilnehmer prüft und ändert die Zusammenfassung vor dem Absenden | Block 10 |
| Beim Schließen der Seite ist alles gelöscht | — |

**Namen werden über Redewendungen erkannt**, nicht über Großschreibung — siehe
unten. Zusätzlich bittet Fiona darum, keine Namen zu nennen, und der Teilnehmer
prüft die Zusammenfassung am Ende selbst.

Die Ortsliste in `leitfaden.js` (`ORTE`) bei Bedarf um Ortsteile ergänzen.

## Aussehen

**Durchgehend hell.** Warmes Sandweiß mit zwei sanften Farbverläufen, Rot als
Akzent, Bernstein für die Zeichnung. Es gibt bewusst **keine Umschaltung auf
Dunkelmodus** — das war eine Festlegung. Alle Farben halten Kontrast über
4,5 : 1.

**Die Zeichnung auf der Startseite** ist selbst gemacht und steckt direkt im
HTML: In der Mitte die Umrissfigur mit Feuerwehrhelm — sie steht für das Amt,
bewusst ohne Gesicht, denn es geht um eine Rolle und nicht um einen bestimmten
Menschen. Ringsum die Fragen, die darauf zielen.

> **Warum keine Wappen?** Kommunale Wappen sind nicht frei verwendbar. In
> Niedersachsen führen Landkreis, Städte und Gemeinden ihre Wappen; die Nutzung
> durch Dritte ist **genehmigungspflichtig**, und diese Seite steht später
> öffentlich im Netz. Die eigene Zeichnung umgeht das vollständig — und erklärt
> das Vorhaben besser als zehn Schilde.

**Die Zeichen** (Icons) sind ebenfalls selbst gezeichnet und stecken in
`fiona.js` unter `ZEICHEN`: Roboter, Schloss, Lautsprecher, Mikrofon, Uhr,
Haken. Keine fremden Dateien, keine Symbolschriftart, nichts wird nachgeladen.
Ein neues Zeichen: Pfadangaben ergänzen, in `leitfaden.js` unter `icon:`
aufrufen.

## Die drei Bildschirme

| | |
|---|---|
| **1 — Startseite** | Zeichnung, Titel, worum es geht, ein Knopf |
| **2 — Vorbereitung** | Drei Hinweiskarten, Mikrofontest, dann die Wahl: sprechen oder tippen |
| **3 — Gespräch** | Jedes Thema auf einer eigenen Seite |

Jeder Block beginnt mit einer **Übergangskarte**: Zeichen, „Thema 3 von 9",
Titel, Einleitung und ein Weiter-Knopf. Danach wird der Verlauf geleert und der
Block startet auf leerer Fläche — kein endloses Scrollen.

### Der Startbildschirm ist Absicht

**Kein Browser spielt Ton ab, bevor jemand geklickt hat.** Deshalb steht am
Anfang ein stiller Startbildschirm. Erst mit dem Klick auf einen der beiden
Startknöpfe fängt Fiona an zu sprechen. Ohne diesen Bildschirm bliebe es in
Chrome komplett stumm.

Die Stimme wird nicht mehr abgefragt — sie steht je Browser fest, siehe unten.

### Der Einstieg, Schritt für Schritt

1. Klick auf einen Startknopf. Fiona wartet **2,5 Sekunden** („Einen Moment …"),
   damit man sich auf den Ton einstellen kann. Einstellbar in `leitfaden.js`
   über `VORLAUF_SEKUNDEN`.
2. Kurze Vorstellung: *„Moin. Ich bin Fiona, Dein künstlicher
   Interview-Partner."*
3. Dann die ausführliche Begrüßung, die mit *„Wollen wir starten?"* endet.
4. **Fiona wartet auf ein ausdrückliches Ja.** Erst mit dem Klick auf „Ja, los
   geht's" beginnt das Interview.

### Die Sprechanzeige

Solange Fiona redet, steht oben rechts unter der Kopfzeile ein kleines Fenster mit vier
schwingenden Balken: **„Fiona spricht"**. Wer nichts hört, sieht damit sofort,
dass es am Ton liegt und nicht an der Seite — und kann gleich dort auf
**„Ich höre nichts"** klicken. Dann läuft alles geschrieben weiter.

### Fiona spricht

Über die Sprachausgabe des Browsers. Kostenlos. Zwei Dinge sind eingebaut,
damit es nicht stockt:

- Der Text wird in **Abschnitte von rund 170 Zeichen** geschnitten — an
  Satzgrenzen, aber mehrere Sätze zusammen. Satz für Satz zu sprechen klingt
  gehackt; ein Stück am Stück bricht Chrome nach etwa 15 Sekunden ab. Die
  Abschnittslänge ist der Mittelweg (`ABSCHNITT_MAX` in `fiona.js`).
- **Das Gespräch wartet nicht aufs Vorlesen.** Die Frage steht sofort
  geschrieben da. Wer lesen will, liest; wer zuhören will, hört zu.

**Die Stimme steht je Browser fest** — der Teilnehmer wird nicht gefragt:

| Browser | Stimme |
|---|---|
| Microsoft Edge | Microsoft Ingrid Online (Natural), Deutsch (Österreich) |
| Google Chrome | Google Deutsch |
| sonst | die erste vorhandene aus der Rückfallliste |

Beide sind Netzstimmen und klingen deutlich natürlicher als die eingebauten
Windows-Stimmen (Hedda, Katja, Stefan). Gesucht wird nach einem Teil des Namens,
nicht nach dem vollen — die Bezeichnungen unterscheiden sich je nach
Windows-Version leicht. Ist die Wunschstimme nicht da, greift die Rückfallliste
aus `KONFIG.stimmen` in `leitfaden.js`.

Wirklich natürliche Stimmen gibt es sonst nur bei kostenpflichtigen Diensten.
Das war hier ausgeschlossen — das ist die Grenze dieser Lösung, kein Fehler.

Tempo einstellbar in `leitfaden.js` über `sprechtempo` (1.0 ist normal).

### Antworten sprechen

> **Das geht erst, wenn die Seite über das Internet läuft — nicht beim
> Doppelklick auf die Datei.**

Die Spracherkennung des Browsers verlangt eine verschlüsselte Verbindung
(https). Lokal geöffnet blockiert Chrome das Mikrofon. Die Seite sagt das auf
dem Startbildschirm auch. **Für den Trockenlauf mit Sprache muss die Seite also
erst bei GitHub Pages liegen.**

Läuft sie über https, dann:

- Nach jeder Frage geht das Mikrofon **von selbst an**. Ein pulsender roter
  Punkt zeigt „Ich höre zu".
- Das Gesprochene erscheint laufend im Feld — man sieht mit, was ankommt.
- Fertig ist man mit **„Fertig — weiter"**. Ein Knopf „Nochmal sprechen" wirft
  das Mikrofon wieder an.
- Tippen geht jederzeit zusätzlich, auch mitten im Diktat.

Der Ton geht dabei an Google beziehungsweise Microsoft — das macht der Browser,
nicht diese Seite. Es wird nichts aufgezeichnet. Wer das gar nicht anbieten
will, setzt in `leitfaden.js` `spracheingabeAnbieten: false`.

### Wenn der Ton klemmt

Drei Reißleinen sind eingebaut: pro Satz, für den gesamten Beitrag und für den
Fall, dass gar nichts kommt. Spätestens nach einer halben Minute geht es
weiter, notfalls stumm. **Das Gespräch bleibt nie stehen.**

## Barrierefreiheit

Gebaut nach WCAG 2.2 AA: alles mit der Tastatur bedienbar, sichtbarer Fokus,
Kontrast über 4,5:1, hell und dunkel, bei 200 % Zoom benutzbar, Sprache
ausgezeichnet, Rücksicht auf `prefers-reduced-motion`. Der gesprochene Text
steht immer auch geschrieben da.

## Bekannte Grenze

Geht man mit „Eine Frage zurück" über eine bereits gestellte Nachfrage hinweg
und antwortet dann anders, wird dieselbe Nachfrage nicht erneut gestellt. Im
Gespräch fällt das nicht auf; für die Auswertung ist es ohne Bedeutung.

---

Stand: 2026-08-29

---

## Was beim Sprechen passiert

### Nur EINE Spracherkennung

Wird für jede Frage eine neue Erkennung gestartet, fragt Chrome jedes Mal
wieder nach der Mikrofon-Erlaubnis. Deshalb läuft **eine** Erkennung durch das
ganze Gespräch; beim Fragenwechsel wird nur das Ziel-Feld getauscht. Während
Fiona spricht, werden erkannte Wörter verworfen — sonst schriebe sie sich
selbst mit.

> **Lokal geöffnet fragt Chrome trotzdem jedes Mal.** Bei einer Datei-URL merkt
> er sich die Erlaubnis grundsätzlich nicht. Über das Internet (GitHub Pages)
> fragt er **einmal** und behält es. Die Seite weist auf der Vorbereitungsseite
> darauf hin.

### Satzzeichen

Die Spracherkennung liefert Text ohne Punkt und ohne Großschreibung. Jeder
fertig erkannte Abschnitt wird deshalb nachbereitet: erster Buchstabe groß, am
Ende ein Punkt. `neuer Absatz` erzeugt einen Zeilenumbruch.

**Gesprochene Satzzeichen wie „Punkt" und „Komma" werden bewusst NICHT
ausgewertet.** In der Feuerwehrsprache kommen die Wörter zu oft normal vor —
„an dem Punkt", „Sammelpunkt". Wer sie ersetzen ließe, machte mehr kaputt als
er repariert.

### Namen

Namen werden über **Redewendungen** erkannt, nicht über Großschreibung: „ich
bin …", „ich heiße …", „mein Name ist …". Was danach kommt, wird durch `[Name]`
ersetzt — außer es steht in der Liste `KEINE_NAMEN` (dort stehen Funktionen wie
*Ortsbrandmeister*, damit aus „ich bin Ortsbrandmeister" kein geschwärzter Name
wird).

Einzelne großgeschriebene Wörter zu suchen wäre sinnlos: Im Deutschen wird
jedes Hauptwort großgeschrieben.

**Der Mikrofontest führt das gleich vor.** Wer „Moin, ich bin …" und seinen
Vornamen sagt, sieht sofort, dass der Name durch `[Name]` ersetzt wird. Das
schafft mehr Vertrauen als jeder Beteuerungssatz.

## Die Zusammenfassung

Am Ende erscheint die Zusammenfassung **nicht** als eine große Textwand,
sondern als Karten — eine je Block, mit Zeichen, Überschrift und Trennlinien.
Jede Antwort steht in einem eigenen Feld und lässt sich einzeln ändern oder
leeren. Die Felder wachsen mit dem Inhalt.

**Der Download und das, was ins Formular geht, sind dagegen reiner Text** —
schlicht und schnörkellos, damit es sich später gut auswerten lässt.

## Beim Ändern von Texten aufpassen

In `leitfaden.js` darf in einem Text **nie ein gerades Anführungszeichen**
stehen — es beendet den Text vorzeitig, und dann lädt die ganze Seite nicht
mehr. Für Zitate im Text die typografischen Zeichen `„` und `“` verwenden.

## Firefox

Firefox kann keine Spracheingabe. Statt den Teilnehmer erst nach zehn Minuten
damit zu überraschen, kommt **gleich beim Öffnen ein großer Hinweis**: „Dieser
Browser macht nicht mit", dazu die Empfehlung Chrome oder Edge und ein Knopf,
der den Link in die Zwischenablage legt.

Ausgesperrt wird trotzdem niemand — unter dem Hinweis steht klein „Trotzdem
weitermachen und tippen". Wer nur Firefox hat, soll teilnehmen können.

## Der Mikrofontest

Er misst **zwei Dinge getrennt**, und das ist der Kern:

| Befund | Bedeutung |
|---|---|
| kein Pegel | Mikrofon aus, stummgeschaltet oder nicht angeschlossen |
| Pegel, aber kein Text | Mikrofon läuft — die Erkennung hat nur nichts verstanden |
| Pegel und Text | alles in Ordnung |

Die Spracherkennung allein reicht nicht: Sie meldet nur, wenn sie **Wörter**
versteht. Ist das Mikrofon stumm, passiert einfach gar nichts — und man sitzt
vor einem leeren Feld, ohne zu wissen, woran es liegt. Deshalb wird zusätzlich
der rohe Pegel gemessen und als Balken angezeigt.

Der Ablauf meldet sich bei jedem Schritt:

1. „Test wird gestartet …"
2. „Warte auf die Freigabe des Mikrofons …"
3. „Mikrofon läuft. Sag jetzt bitte etwas." + Pegelbalken
4. „Ich empfange Ton." (grün) → „Ich habe Dich verstanden."
5. Nach 7 Sekunden ohne Pegel: „Ich empfange noch nichts. Sprich bitte lauter —
   oder prüfe, ob das Mikrofon stummgeschaltet ist." (gelb)
6. Nach 15 Sekunden: „Konnte das Mikrofon nicht erkennen. Ist es
   stummgeschaltet oder nicht angeschlossen?" (rot)

Wird der Zugriff verweigert oder ist kein Gerät da, steht das ebenfalls klar da.
Die Wartezeiten stehen in `leitfaden.js` unter `mikroGeduldLeise` und
`mikroGeduldNichts`.

Nach dem Test wird der Mikrofon-Datenstrom wieder freigegeben — sonst leuchtet
das Aufnahmesymbol im Browser weiter.

## Warum die Mikrofon-Abfrage bei einer Datei-Adresse nicht zu lösen ist

Das hat einige Anläufe gekostet, deshalb hier klar:

Chrome speichert Berechtigungen **pro Ursprung** (Domäne). Eine lokal geöffnete
Datei hat keinen speicherbaren Ursprung — er ist leer. Also kann Chrome die
Mikrofon-Freigabe dort nicht behalten.

Erschwerend: Die Spracherkennung startet sich nach jeder Sprechpause selbst neu,
und **jeder Start ist eine neue Anfrage**. Ein dauerhaft offener
`getUserMedia`-Strom hilft nicht, weil die Spracherkennung ihre Freigabe
getrennt anfordert.

Es gibt genau zwei Wege, und beide laufen über einen echten Ursprung:

| Weg | Wofür |
|---|---|
| `Fiona starten.cmd` → `http://localhost:8080` | zum Ausprobieren auf diesem Rechner |
| GitHub Pages → `https://…` | für die echte Befragung |

In beiden Fällen fragt Chrome **einmal** und merkt es sich.
