/*
  Fiona — Gesprächsleitfaden
  ==========================

  DAS IST DIE DATEI, DIE DU ÄNDERST.

  Hier steht jedes Wort, das Fiona sagt. Wer den Wortlaut ändern will, ändert
  ihn hier — und nirgends sonst. Die Technik liegt in fiona.js, da muss man
  nicht hinein.

  Faustregeln:
  - Alles zwischen "Anführungszeichen" ist Text.
  - Kommas und geschweifte Klammern nicht löschen.
  - Nach einer Änderung: Datei speichern, im Browser neu laden (F5).
*/

/* ------------------------------------------------------------------ */
/* 1. Einstellungen                                                     */
/* ------------------------------------------------------------------ */

const KONFIG = {
  // Link zum Microsoft-Formular, in das die Zusammenfassung eingefügt wird.
  // Solange hier "" steht, läuft die Seite im TESTBETRIEB: Es wird nichts
  // abgeschickt, man kann den Text nur herunterladen.
  formularUrl: "",

  // Dateiname für den Download der eigenen Antworten.
  dateiname: "Meine-Antworten-Kreisbrandmeister.txt",

  // Fiona spricht beim Start. Kann jederzeit über den Knopf oben abgeschaltet
  // werden. Der Text steht immer auch geschrieben da.
  sprachausgabeAn: true,

  // Spracheingabe (Antworten sprechen statt tippen) überhaupt anbieten?
  // ACHTUNG: Die Spracherkennung des Browsers schickt den Ton an Google bzw.
  // Microsoft. Wer das nicht will, setzt hier false.
  spracheingabeAnbieten: true,

  // Wie schnell Fiona spricht. 1.0 ist normal, 0.9 gemächlich, 1.1 flott.
  sprechtempo: 1.0,

  /*
     Feste Stimme je Browser — der Teilnehmer wird nicht mehr gefragt.

     Gesucht wird nach einem Namensbestandteil, nicht nach dem vollen Namen:
     Die Bezeichnungen unterscheiden sich je nach Windows-Version leicht.
     Gefunden wird der erste Eintrag, der auf dem Rechner vorhanden ist —
     die weiteren sind Rückfallebenen.

     "Ingrid Online (Natural)" und "Google Deutsch" werden über das Internet
     erzeugt und klingen deutlich natürlicher als die eingebauten Stimmen.
  */
  stimmen: {
    edge:    ["Ingrid", "Katja", "Hedda", "Stefan"],
    chrome:  ["Google Deutsch", "Katja", "Hedda", "Stefan"],
    andere:  ["Google Deutsch", "Ingrid", "Katja", "Hedda", "Stefan"],
  },
};

/* ------------------------------------------------------------------ */
/* 2. Der Startbildschirm                                               */
/* ------------------------------------------------------------------ */
/*
   Hier ist es noch still. Fiona fängt erst an zu sprechen, wenn jemand auf
   einen der Startknöpfe geklickt hat — vorher lassen die Browser gar keinen
   Ton zu.
*/

const STARTSEITE = {
  // Bildunterschrift zur Illustration auf der Startseite.
  bildunterschrift: "Alle Fragen zielen auf eine Rolle — nicht auf eine bestimmte Person",
  // Achtung: „Fiona ist eine KI" wäre nicht ganz richtig. Im Gespräch läuft
  // keine KI — Fiona arbeitet dieses Drehbuch ab. KI steckt in der späteren
  // Auswertung. Deshalb hier und überall: „Computerprogramm".
  titel: "Kreisbrandmeister — Aufgaben und Erwartungen?",
  untertitel: "Eine anonyme Befragung der Brandmeister im Landkreis Vechta",
  absaetze: [
    "Vor der kommenden Wahl soll schwarz auf weiß stehen, welche Aufgaben ein Kreisbrandmeister hier übernehmen soll — und was von ihm und seinen Stellvertretern erwartet wird.",
    "Deine Antworten zählen genauso wie die aller anderen. Je mehr mitmachen, desto klarer wird das Bild.",
  ],
  punkte: [
    "20 bis 30 Minuten",
    "Anonym — kein Name, keine Anmeldung",
    "Freiwillig und jederzeit abbrechbar",
  ],
  starten: "Los geht's",
};

/* ------------------------------------------------------------------ */
/* 2b. Die Vorbereitungsseite: Hinweise, Ton, Mikrofon                  */
/* ------------------------------------------------------------------ */

const VORBEREITUNG = {
  titel: "Kurz vorbereiten",
  untertitel: "Zwei Minuten, dann geht es los.",
  // "icon" wählt eines der Zeichen aus fiona.js:
  // roboter, schloss, lautsprecher, mikrofon, uhr, haken
  hinweise: [
    {
      icon: "roboter",
      titel: "Fiona ist kein Mensch",
      text: "Fiona ist ein Computerprogramm, das einen Fragebogen abarbeitet. Sie kann Dir nichts beantworten — sie kann nur fragen und zuhören.",
    },
    {
      icon: "schloss",
      titel: "Vollständig anonym",
      text: "Es wird kein Name erhoben, keine Gemeinde erfragt und kein Ton aufgezeichnet. Am Ende liest Du die Zusammenfassung und gibst sie selbst frei.",
    },
    {
      icon: "lautsprecher",
      titel: "Ton anstellen",
      text: "Fiona spricht mit Dir. Stell bitte Deine Lautsprecher oder Kopfhörer an. Alles steht aber auch geschrieben da.",
    },
  ],
  mikroTitel: "Mikrofon prüfen",
  // Vorsicht: In Texten NIE ein gerades Anführungszeichen benutzen — es
  // beendet den Text vorzeitig. Für Zitate im Text die typografischen
  // Zeichen „ und “ nehmen.
  mikroText: "Willst Du Deine Antworten sprechen statt tippen? Dann prüfen wir kurz, ob das Mikrofon läuft. Sag zum Beispiel: „Moin, ich bin …“ und Deinen Vornamen. Du siehst dann gleich, dass der Name nicht stehen bleibt.",
  mikroStarten: "Mikrofon testen",
  mikroBeenden: "Test beenden",
  mikroNochmal: "Noch einmal testen",
  mikroNameWeg: "Siehst Du? Der Name ist durch [Name] ersetzt. Genauso läuft es später im Gespräch.",

  /*
     Die Meldungen während des Tests. Sie lösen einander ab, damit man immer
     sieht, woran es gerade liegt — statt vor einem stummen Feld zu sitzen.
  */
  mikroStatus: {
    starte:     "Test wird gestartet …",
    erlaubnis:  "Warte auf die Freigabe des Mikrofons — bitte oben auf „Zulassen“ klicken.",
    hoert:      "Mikrofon läuft. Sag jetzt bitte etwas.",
    pegel:      "Ich empfange Ton.",
    erkannt:    "Ich habe Dich verstanden. Alles in Ordnung.",
    leise:      "Ich empfange noch nichts. Sprich bitte lauter — oder prüfe, ob das Mikrofon stummgeschaltet ist.",
    nichts:     "Konnte das Mikrofon nicht erkennen. Ist es stummgeschaltet oder nicht angeschlossen?",
    verweigert: "Das Mikrofon wurde nicht freigegeben. Klick in der Adresszeile auf das Schloss-Symbol und erlaube den Zugriff.",
    keinGeraet: "Es ist kein Mikrofon angeschlossen.",
    beendet:    "Test beendet.",
  },

  // Sekunden bis zu den beiden Warnstufen.
  mikroGeduldLeise: 7,
  mikroGeduldNichts: 15,
  weiterSprechen: "Gespräch beginnen — ich spreche",
  weiterTippen: "Gespräch beginnen — ich tippe",
  // Wird nur beim lokalen Öffnen der Datei gezeigt. Dort merkt sich Chrome die
  // Mikrofon-Erlaubnis nicht. Über das Internet fragt er nur einmal.
  nurUeberInternet: "Achtung: Die Seite wurde als Datei geöffnet. Chrome merkt sich die Mikrofon-Freigabe dann NICHT und fragt bei jeder einzelnen Frage neu — das ist keine Fehlfunktion, sondern eine Sicherheitsregel des Browsers. Schließ die Seite und starte sie stattdessen über „Fiona starten.cmd“ im selben Ordner. Dann wird nur einmal gefragt.",
  keinMikrofon: "Dein Browser kann keine Spracheingabe. Nimm bitte Google Chrome oder Microsoft Edge — oder tippe.",
};

/* ------------------------------------------------------------------ */
/* 2c. Wenn der Browser nicht mitspielt                                 */
/* ------------------------------------------------------------------ */
/*
   Firefox kann keine Spracheingabe. Fiona kann dort zwar sprechen und man
   könnte tippen — aber das ist nicht das, was gedacht war. Deshalb ein
   deutlicher Hinweis, bevor überhaupt etwas anfängt.
*/

// Was Fiona sagt, wenn der Ton endgültig nicht geht.
const TON_HINWEIS = {
  schriftlich: "Alles klar, dann machen wir schriftlich weiter. Du verpasst nichts — alles, was ich sage, steht ohnehin geschrieben da. Über den Knopf oben rechts kannst Du den Ton jederzeit wieder anschalten.",
};

const BROWSER_HINWEIS = {
  titel: "Dieser Browser macht nicht mit",
  text: "Fiona braucht Google Chrome oder Microsoft Edge. Dein Browser kann keine Spracheingabe — Du könntest hier nur tippen.",
  anleitung: "Am einfachsten: Link kopieren, Chrome oder Edge öffnen und dort einfügen.",
  linkKopieren: "Link kopieren",
  linkKopiert: "Kopiert — jetzt in Chrome oder Edge einfügen",
  trotzdem: "Trotzdem weitermachen und tippen",
};

/* ------------------------------------------------------------------ */
/* 3. Die Begrüßung (Block 0)                                           */
/* ------------------------------------------------------------------ */

// Das Erste, was Fiona sagt — nach einer kurzen Pause, damit man sich auf den
// Ton einstellen kann.
const VORSTELLUNG = [
  "Moin. Ich bin Fiona, Dein künstlicher Interview-Partner.",
];

// Sekunden, die Fiona nach dem Start wartet, bevor sie zu reden anfängt.
const VORLAUF_SEKUNDEN = 2.5;

// Der Mikrofontest — nur im Sprachmodus.
const MIKROTEST = {
  bitte: "Bevor wir loslegen, testen wir kurz Dein Mikrofon. Sag bitte irgendetwas — zum Beispiel einfach Moin.",
  gehoert: "Ich höre Dich. Das passt.",
  nichts: "Ich habe nichts gehört. Prüf bitte, ob Dein Mikrofon freigegeben ist — oder tippe einfach, das geht genauso gut.",
  weiter: "Passt, weiter",
  tippen: "Geht nicht — ich tippe lieber",
  platzhalter: "Was Du sagst, erscheint hier …",
};

// Wenn die Begrüßung durch ist, wartet Fiona auf ein Ja.
const BESTAETIGUNG = {
  ja: "Ja, los geht's",
  nein: "Doch lieber nicht",
  abbruch: "Alles klar, kein Problem. Es wurde nichts gespeichert. Du kannst die Seite jetzt schließen.",
};

const BEGRUESSUNG = [
  "Ich bin keine Person. Ich bin ein Computerprogramm, das einen Fragebogen abarbeitet. Ich kann Dir nichts beantworten — ich kann nur fragen und zuhören.",
  "Ich stelle Dir Fragen dazu, welche Aufgaben Du beim Kreisbrandmeister und seinen Stellvertretern siehst und was Du von ihnen erwartest. Aus den Antworten von allen, die mitmachen, entsteht später ein gemeinsames Bild — eine Art Stellenbeschreibung. Damit weiß jeder, worum es bei diesem Amt eigentlich geht.",
  "Drei Dinge vorab:",
  "Ich zeichne nichts auf. Kein Ton, kein Video.",
  "Ich frage Dich nicht nach Deinem Namen und will ihn auch nicht wissen.",
  "Am Ende schreibe ich zusammen, was Du gesagt hast. Du liest es, änderst was Du willst — und erst wenn Du auf Speichern klickst, wird es abgeschickt. Vorher passiert nichts.",
  "Abbrechen kannst Du jederzeit: einfach das Fenster schließen. Dann wird nichts gespeichert.",
  "Wir brauchen ungefähr 20 bis 30 Minuten. Wollen wir starten?",
];

/* ------------------------------------------------------------------ */
/* 4. Was Fiona sagt, wenn etwas schiefgeht                             */
/* ------------------------------------------------------------------ */

const HINWEISE = {
  // Wird gezeigt, wenn jemand sich vorstellt („ich bin …", „ich heiße …").
  name: "Den Namen habe ich herausgenommen — wir halten das anonym. Erzähl gern weiter, aber ohne Namen.",
  // Wird gezeigt, wenn eine Gemeinde aus dem Landkreis genannt wird.
  ort: "Den Ort lasse ich weg. Sonst könnte man Dich erkennen.",
  // Wird gezeigt bei Angaben nach Artikel 9 DSGVO.
  sensibel: "Solche Angaben lasse ich außen vor — sie gehören nicht in die Auswertung. Erzähl gern weiter.",
};

// Gemeinden im Landkreis Vechta. Taucht einer dieser Namen in einer Antwort
// auf, weist Fiona darauf hin und ersetzt ihn durch [Ort].
const ORTE = [
  "Bakum", "Damme", "Dinklage", "Goldenstedt", "Holdorf", "Lohne",
  "Neuenkirchen", "Vörden", "Steinfeld", "Vechta", "Visbek",
];

/*
   Namenserkennung über Redewendungen.

   Einzelne großgeschriebene Wörter zu suchen wäre sinnlos — im Deutschen wird
   jedes Hauptwort großgeschrieben. Diese Wendungen dagegen sind eindeutig:
   Was danach kommt, ist so gut wie immer ein Name.
*/
const NAMENS_WENDUNGEN = [
  "ich bin", "ich heiße", "ich heisse", "mein name ist", "mein vorname ist",
  "hier ist", "hier spricht", "man nennt mich", "ich bins", "ich bin's",
];

// Was nach so einer Wendung KEIN Name ist. Ohne diese Liste würde aus
// „ich bin Ortsbrandmeister" ein geschwärzter Name.
const KEINE_NAMEN = [
  "ortsbrandmeister", "gemeindebrandmeister", "stadtbrandmeister",
  "kreisbrandmeister", "brandmeister", "stellvertreter", "stellvertretender",
  "abschnittsleiter", "zugführer", "gruppenführer", "maschinist",
  "atemschutzgeräteträger", "feuerwehrmann", "feuerwehrfrau", "kamerad",
  "mitglied", "aktiv", "dabei", "seit", "auch", "schon", "noch", "hier",
  "froh", "sicher", "der", "die", "das", "ein", "eine", "kein", "nicht",
  "mir", "mich", "sehr", "ganz", "eher", "immer", "oft", "meistens",
];

// Stichwörter zu besonders geschützten Daten (Artikel 9 DSGVO).
// Tauchen sie auf, wird die Stelle markiert und nicht gespeichert.
const SENSIBEL = [
  "partei", "cdu", "spd", "fdp", "grüne", "afd", "linke",
  "gewerkschaft", "verdi", "kirche", "konfession",
  "krank", "krankheit", "diagnose", "behinderung", "psych",
];

/* ------------------------------------------------------------------ */
/* 5. Die Blöcke                                                        */
/* ------------------------------------------------------------------ */
/*
   Jede Frage hat:
     id       — technischer Name, nicht anfassen
     frage    — was Fiona fragt
     label    — Überschrift in der Zusammenfassung
     typ      — "text" (Freitext) oder "auswahl"
     optionen — nur bei "auswahl"
     verzweigt — true: aus dieser Antwort darf Fiona eine Nachfrage ableiten
     ueberspringbar — true: darf ohne Antwort weitergehen

   Ein Block kann zusätzlich haben:
     verzweigungen — Stichwort trifft, Fiona fragt nach (höchstens zwei je Block)
     anstoss       — Hilfe, falls sehr wenig kommt
     nachfassen    — Nachfrage am Ende des Blocks
*/

const BLOECKE = [

  /* --- Block 1 ---------------------------------------------------- */
  {
    nummer: 1,
    name: "Einordnung",
    icon: "person",
    zusammenfassungTitel: "ANGABEN ZUR PERSON (anonym)",
    einleitung: "Zuerst drei kurze Fragen, damit ich Deine Antworten später einordnen kann. Klick einfach die Antwort an, die passt. Bitte nenne dabei keine Gemeinde und keine Namen — sonst wird die Anonymität löchrig.",
    fragen: [
      {
        id: "funktion",
        frage: "Welche Funktion hast Du?",
        label: "Funktion",
        typ: "auswahl",
        optionen: [
          "Ortsbrandmeister",
          "stellvertretender Ortsbrandmeister",
          "Gemeinde- oder Stadtbrandmeister",
          "stellvertretender Gemeinde- oder Stadtbrandmeister",
          "andere Führungsfunktion",
        ],
      },
      {
        id: "groesse",
        frage: "Wie groß ist Deine Wehr ungefähr?",
        label: "Größe der Wehr",
        typ: "auswahl",
        optionen: ["unter 30 Aktive", "30 bis 60", "60 bis 100", "über 100"],
      },
      {
        id: "jahre",
        frage: "Wie lange bist Du schon in dieser Funktion?",
        label: "Jahre im Amt",
        typ: "auswahl",
        optionen: ["unter 2 Jahren", "2 bis 5 Jahre", "5 bis 10 Jahre", "über 10 Jahre"],
      },
    ],
  },

  /* --- Block 2 ---------------------------------------------------- */
  {
    nummer: 2,
    name: "Wie es heute läuft",
    icon: "lupe",
    zusammenfassungTitel: "WIE ES HEUTE LÄUFT",
    einleitung: "Jetzt zum Thema. Denk an die Kreisebene, so wie sie heute läuft.",
    fragen: [
      { id: "heute_gut", frage: "Was funktioniert aus Deiner Sicht gut?", label: "Was gut funktioniert", typ: "text" },
      { id: "heute_fehlt", frage: "Und was fehlt Dir? Wo hast Du Dir schon mal gedacht: Das müsste eigentlich anders laufen?", label: "Was fehlt", typ: "text", verzweigt: true },
    ],
    maxVerzweigungen: 2,
    verzweigungen: [
      { stichworte: ["erreichbar", "erreicht", "meldet sich", "rückruf", "ruft nicht"],
        frage: "Du sprichst die Erreichbarkeit an. In welcher Situation hast Du jemanden gebraucht und nicht erreicht?" },
      { stichworte: ["einsatz", "einsatzstelle", "vor ort", "lage"],
        frage: "Wann soll der Kreisbrandmeister an der Einsatzstelle sein — und wann besser nicht?" },
      { stichworte: ["ausbildung", "lehrgang", "kreisausbildung", "atemschutz"],
        frage: "Was müsste sich bei der Ausbildung auf Kreisebene ändern?" },
      { stichworte: ["technik", "fahrzeug", "beschaffung", "gerät"],
        frage: "Welche Rolle soll er bei Beschaffungen spielen?" },
      { stichworte: ["leitstelle", "alarmierung", "melder"],
        frage: "Was erwartest Du von ihm im Verhältnis zur Leitstelle?" },
      { stichworte: ["politik", "landkreis", "verwaltung", "kreistag", "geld", "haushalt"],
        frage: "Wie soll er die Feuerwehren gegenüber der Verwaltung vertreten?" },
      { stichworte: ["nachwuchs", "jugendfeuerwehr", "mitglieder", "tagesalarm"],
        frage: "Welche Rolle soll er beim Thema Personal und Nachwuchs spielen?" },
      { stichworte: ["digitalfunk", "software", "digitalisierung", "edv"],
        frage: "Was erwartest Du von ihm beim Thema Technik und Digitalisierung?" },
      { stichworte: ["kommunikation", "information", "erfahren", "keiner sagt"],
        frage: "Wie soll Information vom Kreis zu Euch kommen?" },
    ],
  },

  /* --- Block 3 ---------------------------------------------------- */
  {
    nummer: 3,
    name: "Die Aufgaben",
    icon: "liste",
    zusammenfassungTitel: "AUFGABEN",
    einleitung: "Jetzt kommt der wichtigste Teil.",
    fragen: [
      { id: "aufgaben_muss", frage: "Nenn mir bitte die Aufgaben, die Deiner Meinung nach zwingend beim Kreisbrandmeister liegen müssen. Nimm Dir Zeit — es dürfen ruhig viele sein.", label: "Gehört zwingend zum Amt", typ: "text",
        anstoss: {
          wennKuerzerAls: 120,
          text: "Ich helfe mal mit einem Anstoß. Das Brandschutzgesetz sagt, dass die Kreisfeuerwehr vom Kreisbrandmeister geführt wird und dass er bei den überörtlichen Aufgaben des Landkreises mitwirkt. Das ist sehr allgemein gehalten. Was heißt das für Dich im Alltag ganz konkret?",
        } },
      { id: "aufgaben_mehr", frage: "Fällt Dir noch etwas ein? Auch Kleinigkeiten, die im Alltag wichtig sind.", label: "Ergänzungen", typ: "text" },
      { id: "aufgaben_woanders", frage: "Und jetzt andersherum: Welche Aufgaben landen heute beim Kreisbrandmeister, gehören aber eigentlich woanders hin? Zu den Stellvertretern, zum Hauptamt beim Landkreis, zu den Abschnittsleitern oder zu den Gemeindebrandmeistern?", label: "Gehört woanders hin", typ: "text" },
      { id: "aufgaben_kern", frage: "Wenn Du Dir eine einzige Aufgabe aussuchen müsstest, die er auf keinen Fall abgeben darf — welche wäre das?", label: "Darf er nie abgeben", typ: "text" },
    ],
  },

  /* --- Block 4 ---------------------------------------------------- */
  {
    nummer: 4,
    name: "Erwartungen an die Person",
    icon: "stern",
    zusammenfassungTitel: "ERWARTUNGEN AN DIE PERSON",
    einleitung: "Jetzt geht es weniger um Aufgaben und mehr um die Person.",
    fragen: [
      { id: "person_fachlich", frage: "Was erwartest Du von einem Kreisbrandmeister fachlich? Was muss er können oder wissen?", label: "Fachlich", typ: "text" },
      { id: "person_fuehrung", frage: "Und als Führungskraft: Wie soll er mit Euch Brandmeistern arbeiten?", label: "Als Führungskraft", typ: "text" },
      { id: "person_menschlich", frage: "Und menschlich? Was ist Dir wichtig, wenn Du mit ihm zu tun hast?", label: "Menschlich", typ: "text" },
      { id: "person_ausschluss", frage: "Gibt es etwas, das für Dich ein Ausschlusskriterium wäre?", label: "Ausschlusskriterium", typ: "text" },
    ],
  },

  /* --- Block 5 ---------------------------------------------------- */
  {
    nummer: 5,
    name: "Zeit und Erreichbarkeit",
    icon: "uhr",
    zusammenfassungTitel: "ZEIT UND ERREICHBARKEIT",
    einleitung: "Reden wir über den Aufwand — der wird gern unterschätzt.",
    fragen: [
      { id: "zeit_umfang", frage: "Wie viel Zeit muss ein Kreisbrandmeister im Monat aufbringen können?", label: "Zeitaufwand", typ: "text" },
      { id: "zeit_erreichbar", frage: "Wie erreichbar muss er sein? Rund um die Uhr, oder gibt es Zeiten, in denen ein Stellvertreter reicht?", label: "Erreichbarkeit", typ: "text" },
      { id: "zeit_realistisch", frage: "Was davon ist neben einem normalen Beruf überhaupt zu schaffen? Und was folgt daraus für die Verteilung der Aufgaben?", label: "Was realistisch ist", typ: "text" },
    ],
  },

  /* --- Block 6 ---------------------------------------------------- */
  {
    nummer: 6,
    name: "Planung und Alarmierung",
    icon: "alarm",
    zusammenfassungTitel: "PLANUNG UND ALARMIERUNG",
    einleitung: "Ein Bereich fehlt mir noch: die Planung.",
    // Achtung: Dieser Block steht bewusst HINTER Block 3. Bei der Auswertung
    // getrennt zählen, wer das Thema schon in Block 3 von sich aus genannt hat.
    fragen: [
      { id: "plan_aao", frage: "Wer soll aus Deiner Sicht darüber entscheiden, wann die Kreisfahrzeuge und die Unterstützungseinheiten alarmiert werden — also über deren Alarm- und Ausrückeordnung?", label: "Alarm- und Ausrückeordnung", typ: "text" },
      { id: "plan_gefahren", frage: "Welche Rolle soll der Kreisbrandmeister bei der Gefahrenabwehrplanung spielen? Objektplanungen, überörtliche Einsatzkonzepte, Bereitstellungsräume.", label: "Gefahrenabwehrplanung", typ: "text" },
      { id: "plan_grenze", frage: "Und wo hört seine Zuständigkeit auf? Was ist Sache der Gemeinden, was Sache des Landkreises?", label: "Grenze der Zuständigkeit", typ: "text" },
      { id: "plan_kats", frage: "Bei einer Großschadenslage oder im Katastrophenschutz — welche Rolle hat er da?", label: "Katastrophenschutz", typ: "text", ueberspringbar: true },
    ],
  },

  /* --- Block 7 ---------------------------------------------------- */
  {
    nummer: 7,
    name: "Zusammenarbeit",
    icon: "leute",
    zusammenfassungTitel: "ZUSAMMENARBEIT",
    einleitung: "Der Kreisbrandmeister steht zwischen mehreren Stellen. Vier kurze Fragen dazu.",
    fragen: [
      { id: "zus_landkreis", frage: "Was erwartest Du von ihm gegenüber dem Landkreis, also der Verwaltung?", label: "Landkreis / Verwaltung", typ: "text", ueberspringbar: true },
      { id: "zus_verband", frage: "Und gegenüber dem Kreisfeuerwehrverband?", label: "Kreisfeuerwehrverband", typ: "text", ueberspringbar: true },
      { id: "zus_gemeinden", frage: "Und gegenüber Euch — den Gemeinden und Ortswehren? Wie oft und in welcher Form soll Kontakt sein?", label: "Gemeinden und Ortswehren", typ: "text", ueberspringbar: true },
      { id: "zus_leitstelle", frage: "Und gegenüber der Leitstelle?", label: "Leitstelle", typ: "text", ueberspringbar: true },
    ],
    // Am Blockende einmal nachfassen. Kam insgesamt wenig, fragt Fiona direkt.
    // Kam viel, fragt sie stattdessen nach einer vergessenen Stelle.
    nachfassen: {
      schwelle: 120,
      id: "zus_nachfass",
      label: "Nachtrag Zusammenarbeit",
      wenig: "Für die Zusammenarbeit fällt Dir wirklich nichts ein?",
      viel: "Gibt es noch eine Stelle, mit der er zusammenarbeiten muss und die wir vergessen haben?",
    },
  },

  /* --- Block 8 ---------------------------------------------------- */
  {
    nummer: 8,
    name: "Die Stellvertretung",
    icon: "zweig",
    zusammenfassungTitel: "STELLVERTRETUNG",
    einleitung: "Fast geschafft. Jetzt zu den Stellvertretern — die werden meistens mitgedacht und selten besprochen.",
    fragen: [
      { id: "stv_anzahl", frage: "Das Gesetz verlangt mindestens einen. Wie viele braucht es aus Deiner Sicht im Landkreis Vechta?", label: "Anzahl", typ: "text" },
      { id: "stv_zuschnitt", frage: "Sollen die Stellvertreter feste Zuständigkeiten haben — etwa Ausbildung, Technik oder Digitalfunk? Oder sollen sie den Kreisbrandmeister einfach allgemein vertreten?", label: "Zuschnitt", typ: "text" },
      { id: "stv_aufgaben", frage: "Welche von den Aufgaben, die Du vorhin genannt hast, gehören ausdrücklich zu einem Stellvertreter?", label: "Aufgaben der Stellvertretung", typ: "text" },
    ],
  },

  /* --- Block 9 ---------------------------------------------------- */
  {
    nummer: 9,
    name: "Die offene Frage",
    icon: "sprechblase",
    zusammenfassungTitel: "WAS SONST NOCH GESAGT WURDE",
    einleitung: "Zwei letzte Fragen.",
    fragen: [
      { id: "offen_fehlt", frage: "Was habe ich nicht gefragt, das aber dazugehört?", label: "Was nicht gefragt wurde", typ: "text" },
      { id: "offen_satz", frage: "Und zum Schluss: Wenn Du dem künftigen Kreisbrandmeister einen einzigen Satz mitgeben könntest — welcher wäre das?", label: "Ein Satz zum Mitgeben", typ: "text" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* 6. Der Abschluss (Block 10)                                          */
/* ------------------------------------------------------------------ */

const ABSCHLUSS = {
  einleitung: [
    "Danke. Ich habe alles zusammengeschrieben, was Du gesagt hast. Lies bitte in Ruhe drüber.",
    "Zwei Bitten:",
    "Steht irgendwo etwas, an dem man erkennen könnte, wer Du bist? Ein Ort, ein Name, ein bestimmter Vorfall? Dann ändere oder streiche es.",
    "Steht irgendwo etwas falsch oder verkürzt? Dann korrigiere es.",
    "Du kannst den Text direkt bearbeiten. Wenn er passt, klick auf Speichern — erst dann wird er anonym abgelegt. Wenn Du das nicht möchtest, schließ einfach das Fenster: Dann wird nichts gespeichert und nichts weitergegeben.",
  ],
  nachDemSpeichern: [
    "Gespeichert. Danke, dass Du Dir die Zeit genommen hast.",
    "Du kannst Deinen Text jetzt als Datei herunterladen und bei Dir aufbewahren. Bitte mach das gleich hier: Sobald Du die Seite schließt, kann ich Dir den Text nicht mehr zuordnen — dafür ist das Verfahren anonym.",
    "Die Ergebnisse aus allen Gesprächen werden zusammengefasst und in einer Sitzung vorgestellt.",
  ],
  // Anleitung für das Einfügen ins Formular.
  formularAnleitung: "Der Text liegt jetzt in der Zwischenablage. Im Formular, das sich gleich öffnet, klickst Du in das große Feld und drückst Strg und V. Dann auf Absenden.",
  testbetrieb: "TESTBETRIEB: Es ist noch kein Formular hinterlegt, es wird nichts abgeschickt. Du kannst den Text herunterladen.",
};
