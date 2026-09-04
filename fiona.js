/*
  Fiona — Technik
  ===============

  Hier steckt die Steuerung. Wortlaut und Fragen stehen in leitfaden.js —
  zum Ändern von Texten muss man diese Datei NICHT anfassen.

  Grundsatz: Während des Gesprächs verlässt nichts den Rechner. Es gibt keine
  Verbindung nach außen. Erst beim Speichern wird der Text in die
  Zwischenablage gelegt und das Formular geöffnet.

  Zwei Ausnahmen, die der BROWSER macht, nicht diese Seite:
  - Die Stimme "Google Deutsch" wird über das Internet erzeugt.
  - Die Spracherkennung schickt den Ton an Google bzw. Microsoft.
  Beides ist abschaltbar, beides steht im Hinweistext.
*/

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const verlauf = $("verlauf");
  const eingabe = $("eingabe");

  /* --- Zustand ---------------------------------------------------- */

  const zustand = {
    blockIndex: 0,
    frageIndex: 0,
    warteschlange: [],
    verzweigungen: 0,
    antworten: {},
    reihenfolge: [],
    gestellt: { verzweigungen: [], anstoesse: [], nachfassen: [] },
    tonAn: true,
    modus: "tippen",        // "sprechen" oder "tippen"
    hoertZu: false,
    gestartet: false,
    fertig: false,
    fionaRedet: false,   // solange true, wird nichts vom Mikrofon uebernommen
  };

  const schritte = [];
  const BLOCK_GESAMT = BLOECKE.length + 1;

  /* ================================================================ */
  /* Sprachausgabe                                                     */
  /* ================================================================ */
  /*
     Zwei Dinge machen die Browser-Sprachausgabe unbrauchbar, wenn man sie
     naiv benutzt:

     1. Vor der ersten Klickgeste spielt kein Browser Ton ab. Deshalb der
        Startbildschirm — dort wird geklickt, und erst danach redet Fiona.

     2. Chrome bricht lange Ansagen nach etwa 15 Sekunden ab. Deshalb wird
        jeder Text in Sätze zerlegt und Satz für Satz gesprochen. Das klingt
        nebenbei auch weniger gehetzt, weil zwischen den Sätzen eine echte
        Pause entsteht.
  */

  let stimmen = [];
  let stimme = null;
  let wecker = null;

  /*
     Welcher Browser? Nur nötig, um die passende Stimme zu wählen.
     Reihenfolge beachten: Edge meldet sich auch als Chrome.
  */
  function browserArt() {
    const kennung = navigator.userAgent;
    if (kennung.indexOf("Edg/") > -1) return "edge";
    if (kennung.indexOf("Firefox/") > -1) return "firefox";
    if (kennung.indexOf("Chrome/") > -1) return "chrome";
    return "andere";
  }

  const BROWSER = browserArt();

  /*
     Die Stimme wird NICHT mehr abgefragt. Für jeden Browser steht in
     leitfaden.js fest, welche genommen wird — in Edge die österreichische
     Netzstimme "Ingrid Online (Natural)", in Chrome "Google Deutsch".
     Beide klingen deutlich natürlicher als die eingebauten Windows-Stimmen.

     Die Liste der Stimmen steht beim Laden der Seite oft noch nicht bereit;
     die Browser reichen sie nach. Deshalb wird bei jedem Nachreichen neu
     gewählt — sonst bliebe man auf der erstbesten Blechstimme sitzen.
  */
  function stimmenLaden() {
    if (!("speechSynthesis" in window)) return;
    stimmen = window.speechSynthesis.getVoices().filter(
      (s) => s.lang && s.lang.toLowerCase().startsWith("de")
    );
    stimme = besteStimme();
  }

  function besteStimme() {
    const wunsch = (KONFIG.stimmen && (KONFIG.stimmen[BROWSER] || KONFIG.stimmen.andere)) || [];

    for (const teil of wunsch) {
      const treffer = stimmen.find((s) => s.name.indexOf(teil) > -1);
      if (treffer) return treffer;
    }
    // Nichts aus der Wunschliste da: Netzstimmen klingen fast immer besser.
    return stimmen.find((s) => s.localService === false) || stimmen[0] || null;
  }

  function weckerAn() {
    // Chrome vergisst mitten in der Warteschlange gelegentlich, weiterzureden.
    if (wecker) return;
    wecker = setInterval(() => {
      if (window.speechSynthesis.speaking) window.speechSynthesis.resume();
      else weckerAus();
    }, 6000);
  }

  function weckerAus() {
    if (wecker) { clearInterval(wecker); wecker = null; }
  }

  /*
     Text in Abschnitte schneiden, nicht in einzelne Sätze.

     Satz für Satz zu sprechen klingt gehackt — nach jedem Punkt entsteht eine
     unnatürliche Lücke. Deshalb werden ganze Sätze zu Abschnitten von rund
     170 Zeichen gebündelt: lang genug, dass es fließt, kurz genug, dass Chrome
     nicht abbricht (das passiert bei etwa 15 Sekunden Redezeit).
  */
  const ABSCHNITT_MAX = 170;

  function inSaetze(text) {
    const teile = text.match(/[^.!?…]+[.!?…]*/g);
    if (!teile) return [text];

    const abschnitte = [];
    let aktuell = "";

    teile.forEach((t) => {
      const s = t.trim();
      if (!s) return;
      if (aktuell && (aktuell.length + 1 + s.length) > ABSCHNITT_MAX) {
        abschnitte.push(aktuell);
        aktuell = s;
      } else {
        aktuell = aktuell ? aktuell + " " + s : s;
      }
    });

    if (aktuell) abschnitte.push(aktuell);
    return abschnitte;
  }

  /*
     Eine eigene Warteschlange. Nötig, weil Fiona manchmal zwei Sachen
     hintereinander sagt (Blockeinleitung und dann die Frage) — ohne eigene
     Liste käme das durcheinander.

     Und eine Notbremse: Falls der Browser gar keinen Ton abspielt, darf das
     Gespräch NICHT hängenbleiben. Meldet sich nach zwei Sekunden nichts,
     läuft alles stumm weiter.
  */

  const redeliste = [];
  let redetGerade = false;
  let tonKaputt = false;

  /*
     Laufnummer fuer das Sprechen.

     Hier steckte ein Fehler: tonAus() hat zwar die Warteschlange geleert und
     abgebrochen — aber der gerade laufende Beitrag hatte noch seine eigenen
     Zeitgeber. Die haben brav den naechsten Abschnitt nachgeschoben, und der
     Ton ging weiter. Jetzt wird bei jedem Abbruch die Laufnummer erhoeht;
     alles Aeltere weiss dann, dass es nicht mehr zustaendig ist.
  */
  let redeLauf = 0;

  function sprich(text, danach) {
    const stumm = !zustand.tonAn || !("speechSynthesis" in window) || tonKaputt;
    if (stumm) {
      if (danach) setTimeout(danach, 0);
      return;
    }
    redeliste.push({
      saetze: inSaetze(Array.isArray(text) ? text.join(" ") : text),
      danach: danach,
    });
    if (!redetGerade) redeAbarbeiten();
  }

  function sprechanzeige(an) {
    const a = $("sprechanzeige");
    if (!a) return;
    if (an) {
      // Die Kopfzeile wächst, sobald die Fortschrittsleiste erscheint —
      // deshalb jedes Mal neu messen, damit die Anzeige direkt darunter sitzt.
      const kopf = document.querySelector(".kopf");
      if (kopf) {
        document.documentElement.style.setProperty(
          "--kopfhoehe", kopf.getBoundingClientRect().height + "px"
        );
      }
    }
    a.hidden = !an;
  }

  function redeAbarbeiten() {
    if (redeliste.length === 0) {
      redetGerade = false;
      zustand.fionaRedet = false;
      weckerAus();
      sprechanzeige(false);
      return;
    }
    redetGerade = true;
    zustand.fionaRedet = true;
    weckerAn();
    sprechanzeige(true);

    const eintrag = redeliste[0];
    const meinLauf = redeLauf;
    let i = 0;
    let abgeschlossen = false;
    let satzWecker = null;
    let aufpasser = null;
    let letzteRegung = Date.now();

    const fertig = () => {
      if (abgeschlossen || meinLauf !== redeLauf) { abgeschlossen = true; clearTimeout(satzWecker); clearInterval(aufpasser); return; }
      abgeschlossen = true;
      clearTimeout(satzWecker);
      clearInterval(aufpasser);
      redeliste.shift();
      if (eintrag.danach) eintrag.danach();
      redeAbarbeiten();
    };

    /*
       Auf "onend" allein ist kein Verlass. Chrome verschluckt das Ereignis
       gelegentlich, und in manchen Umgebungen kommt es nie. Deshalb bekommt
       jeder Satz eine eigene Reißleine, großzügig bemessen: gut anderthalb
       mal so lang, wie das Sprechen dauern dürfte. Lieber ein Satzende
       abgeschnitten als ein Gespräch, das stehenbleibt.
    */
    const naechster = () => {
      clearTimeout(satzWecker);
      if (abgeschlossen || meinLauf !== redeLauf) return;
      letzteRegung = Date.now();
      if (i >= eintrag.saetze.length) { fertig(); return; }

      const text = eintrag.saetze[i++];
      const satz = new SpeechSynthesisUtterance(text);
      satz.lang = "de-DE";
      satz.rate = KONFIG.sprechtempo || 1.0;
      if (stimme) satz.voice = stimme;

      let weiter = false;
      const einmal = () => { if (!weiter) { weiter = true; naechster(); } };
      satz.onend = einmal;
      satz.onerror = einmal;

      window.speechSynthesis.speak(satz);

      // Reißleine für diesen Abschnitt — aber nur, wenn wirklich nichts mehr
      // spricht. Wird noch geredet, wird einfach weiter gewartet. Ein Satz
      // darf lange dauern, er darf nur nicht steckenbleiben.
      const pruefen = () => {
        if (weiter) return;
        if (window.speechSynthesis.speaking) {
          satzWecker = setTimeout(pruefen, 3000);
          return;
        }
        einmal();
      };
      satzWecker = setTimeout(pruefen, 2500 + text.length * 120);
    };

    naechster();

    // Zweite Reißleine: Passiert gar nichts, ist der Ton kaputt. Dann läuft
    // das Gespräch stumm weiter, statt hängenzubleiben.
    setTimeout(() => {
      if (!abgeschlossen && !window.speechSynthesis.speaking && i <= 1) {
        tonKaputt = true;
        zustand.tonAn = false;
        tonKnopfAnzeigen(false);
        fertig();
      }
    }, 2000);

    /*
       Dritte Reißleine — und hier steckte ein Fehler drin: Vorher stand hier
       eine feste Frist von einer halben Minute. Die hat lange Ansagen wie die
       Begrüßung mittendrin abgeschnitten, weil sie schlicht länger dauern.

       Jetzt ein Wächter, der nur zuschlägt, wenn tatsächlich nichts mehr
       passiert. Solange gesprochen wird, läuft alles weiter. Steht es
       fünfzehn Sekunden still, geht es ohne Ton weiter.
    */
    aufpasser = setInterval(() => {
      if (abgeschlossen) { clearInterval(aufpasser); return; }
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        letzteRegung = Date.now();
        return;
      }
      if (Date.now() - letzteRegung > 15000) fertig();
    }, 2000);

    // Und eine letzte Obergrenze. Der längste Beitrag — die Begrüßung —
    // dauert gesprochen gut eine Minute. Drei Minuten sind reichlich Puffer
    // und verhindern, dass ein Browser, der nie ein Sprechende meldet, das
    // Ganze auf Dauer festhält.
    setTimeout(fertig, 180000);
  }

  function tonAus() {
    redeLauf++;                 // alles Laufende ist damit ungueltig
    weckerAus();
    redeliste.length = 0;
    redetGerade = false;
    zustand.fionaRedet = false;
    sprechanzeige(false);
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  /* ================================================================ */
  /* Spracheingabe                                                     */
  /* ================================================================ */
  /*
     WICHTIG — hier steckte ein ärgerlicher Fehler:

     Wenn man für jede Frage eine NEUE Spracherkennung startet, fragt Chrome
     jedes Mal wieder nach der Mikrofon-Erlaubnis. Bei einer lokal geöffneten
     Datei merkt er sie sich ohnehin nie. Nach dreißig Fragen ist das
     unerträglich.

     Deshalb: Es gibt genau EINE Erkennung. Sie wird einmal gestartet und läuft
     dann durch. Beim Fragenwechsel wird nur das Ziel-Feld ausgetauscht.
     Während Fiona spricht, werden erkannte Wörter verworfen — sonst schriebe
     sie sich selbst mit.
  */

  const ErkennungsKlasse = window.SpeechRecognition || window.webkitSpeechRecognition;

  let erkennung = null;
  let zielFeld = null;
  let zielAnzeige = null;

  function spracheMoeglich() {
    // Absichtlich NICHT auf "isSecureContext" prüfen: Chrome lässt das
    // Mikrofon auch bei lokal geöffneten Dateien zu (fragt dann nur jedes Mal
    // nach). Ob es wirklich geht, zeigt sich beim Versuch — schlägt er fehl,
    // schaltet onerror die Spracheingabe ab.
    return !!ErkennungsKlasse && KONFIG.spracheingabeAnbieten;
  }

  function anzeigeSetzen(text, hoert) {
    if (!zielAnzeige) return;
    zielAnzeige.hidden = false;
    zielAnzeige.textContent = text;
    zielAnzeige.classList.toggle("hoert", !!hoert);
  }

  function erkennungAufbauen() {
    if (erkennung || !ErkennungsKlasse) return;

    erkennung = new ErkennungsKlasse();
    erkennung.lang = "de-DE";
    erkennung.continuous = true;
    erkennung.interimResults = true;

    erkennung.onstart = () => anzeigeSetzen("Ich höre zu …", true);

    /*
       Erkanntes wird ANGEHAENGT, nie ueberschrieben.

       Hier steckte ein Fehler: Vorher wurde das ganze Feld neu geschrieben
       (fester Text plus vorlaeufiger). Startete die Erkennung neu — was sie
       nach jeder Sprechpause tut — war der bisherige Inhalt weg. Wer auf
       "Nochmal sprechen" drueckte, verlor seine Antwort.

       Jetzt gehoert das Feld dem Nutzer. Fertig erkannte Saetze werden ans
       Ende gehaengt; was noch nicht fertig erkannt ist, steht in der Anzeige
       darunter und nicht im Feld.
    */
    erkennung.onresult = (e) => {
      // Waehrend Fiona redet, hoert das Mikrofon zwar mit, aber nichts davon
      // wird uebernommen.
      if (zustand.fionaRedet || !zielFeld) return;

      let vorlaeufig = "";
      let neu = "";

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const stueck = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          const sauber = alsSatz(stueck);
          if (sauber) neu += (neu ? " " : "") + sauber;
        } else {
          vorlaeufig += stueck;
        }
      }

      if (neu) {
        const bisher = zielFeld.value.trimEnd();
        zielFeld.value = bisher ? bisher + " " + neu : neu;
        zielFeld.dispatchEvent(new Event("input"));
        zielFeld.scrollTop = zielFeld.scrollHeight;
      }

      if (zielAnzeige) {
        anzeigeSetzen(vorlaeufig ? "… " + vorlaeufig : "Ich höre zu …", true);
      }
    };

    erkennung.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        zustand.hoertZu = false;
        KONFIG.spracheingabeAnbieten = false;
        anzeigeSetzen("Das Mikrofon ist nicht freigegeben. Tipp Deine Antwort bitte ein.", false);
      } else if (e.error === "no-speech" || e.error === "aborted") {
        // Kommt bei Sprechpausen ständig vor — kein Grund für einen Hinweis.
      }
    };

    erkennung.onend = () => {
      // Chrome beendet nach Sprechpausen von selbst. Solange zugehört werden
      // soll, geht es weiter — OHNE neue Nachfrage, weil es dieselbe
      // Erkennung ist.
      if (!zustand.hoertZu) return;
      // Kurz durchatmen, sonst beschwert sich Chrome ueber zu schnelle Neustarts.
      setTimeout(() => {
        if (!zustand.hoertZu) return;
        try { erkennung.start(); } catch (e) { /* laeuft schon */ }
      }, 250);
    };
  }

  /*
     DER MIKROFON-STROM — der Trick gegen die ewigen Nachfragen.

     Chrome fragt bei JEDEM Start einer Spracherkennung neu nach der Erlaubnis,
     solange die Seite lokal geöffnet ist. Und die Erkennung startet sich nach
     jeder Sprechpause selbst neu. Ergebnis: bei jeder Frage ein neues Fenster.

     Gegenmittel: Wir holen uns EINMAL über getUserMedia einen echten
     Mikrofon-Strom und lassen ihn während des ganzen Gesprächs offen. Solange
     ein aktiver Strom läuft, gilt der Zugriff als gewährt und die Erkennung
     darf ohne neue Nachfrage starten.

     Der Strom wird erst am Ende des Gesprächs freigegeben — sonst leuchtet
     das Aufnahmesymbol im Browser weiter.
  */

  let mikroStrom = null;

  async function mikroStromHolen() {
    if (mikroStrom && mikroStrom.active) return true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return false;
    try {
      mikroStrom = await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch (e) {
      mikroStrom = null;
      return false;
    }
  }

  function mikroStromFreigeben() {
    if (!mikroStrom) return;
    mikroStrom.getTracks().forEach((spur) => spur.stop());
    mikroStrom = null;
  }

  /* Ziel wechseln — und beim allerersten Mal die Erkennung starten. */
  async function zuhoerenStarten(feld, anzeige) {
    if (!spracheMoeglich()) return;

    zielFeld = feld;
    zielAnzeige = anzeige;


    // Läuft schon: nur das Ziel tauschen, nichts neu starten.
    if (zustand.hoertZu) { anzeigeSetzen("Ich höre zu …", true); return; }

    anzeigeSetzen("Mikrofon wird geöffnet …", false);
    await mikroStromHolen();

    erkennungAufbauen();
    if (!erkennung) return;

    zustand.hoertZu = true;
    try { erkennung.start(); } catch (e) { /* läuft bereits */ }
    anzeigeSetzen("Ich höre zu …", true);
  }

  /* Nur das Ziel abhängen. Erkennung und Mikrofon-Strom laufen weiter, damit
     Chrome nicht erneut nach der Erlaubnis fragt. */
  function zuhoerenPausieren() {
    zielFeld = null;
    if (zielAnzeige) { zielAnzeige.hidden = true; zielAnzeige.classList.remove("hoert"); }
    zielAnzeige = null;
  }

  /* Ganz beenden — nur am Ende des Gesprächs oder beim Abbruch. */
  function zuhoerenBeenden() {
    zustand.hoertZu = false;
    zuhoerenPausieren();
    if (erkennung) { try { erkennung.stop(); } catch (e) {} }
    mikroStromFreigeben();
  }

  /* ================================================================ */
  /* Satzzeichen                                                       */
  /* ================================================================ */
  /*
     Die Spracherkennung liefert Text ohne Punkt und ohne Großschreibung.
     Deshalb wird jeder fertig erkannte Abschnitt nachbereitet:
     erster Buchstabe groß, am Ende ein Punkt.

     Gesprochene Satzzeichen ("Punkt", "Komma") werden BEWUSST NICHT
     ausgewertet: In der Feuerwehrsprache kommen diese Wörter zu oft normal
     vor — "an dem Punkt", "Sammelpunkt". Wer sie ersetzen ließe, würde mehr
     kaputtmachen als reparieren. Nur "neuer Absatz" ist eindeutig genug.
  */

  function alsSatz(roh) {
    let t = (roh || "").trim();
    if (!t) return "";

    t = t.replace(/\b(neuer absatz|neue zeile)\b/gi, "\n");
    t = t.replace(/\s+([.,:;!?])/g, "$1");

    // Erster Buchstabe groß — auch nach einem Satzende mitten im Stück.
    t = t.replace(/(^|[.!?]\s+|\n)(\p{Ll})/gu, (_, davor, buchstabe) => davor + buchstabe.toUpperCase());

    // Punkt ans Ende, wenn keiner da ist.
    if (!/[.!?:]$/.test(t)) t += ".";
    return t;
  }


  /* ================================================================ */
  /* Darstellung                                                       */
  /* ================================================================ */

  function beitragFiona(zeilen, danach) {
    const liste = Array.isArray(zeilen) ? zeilen : [zeilen];
    const kasten = document.createElement("div");
    kasten.className = "beitrag beitrag-fiona";
    const wer = document.createElement("span");
    wer.className = "wer";
    wer.textContent = "Fiona";
    kasten.appendChild(wer);
    liste.forEach((zeile) => {
      const p = document.createElement("p");
      p.textContent = zeile;
      kasten.appendChild(p);
    });
    verlauf.appendChild(kasten);
    kasten.scrollIntoView({ block: "nearest" });
    sprich(liste, danach);
  }

  function beitragIch(text) {
    const kasten = document.createElement("div");
    kasten.className = "beitrag beitrag-ich";
    const wer = document.createElement("span");
    wer.className = "wer";
    wer.textContent = "Deine Antwort";
    kasten.appendChild(wer);
    const p = document.createElement("p");
    p.textContent = text;
    kasten.appendChild(p);
    verlauf.appendChild(kasten);
    kasten.scrollIntoView({ block: "nearest" });
  }

  function beitragHinweis(text) {
    const kasten = document.createElement("div");
    kasten.className = "beitrag beitrag-hinweis";
    kasten.textContent = "Hinweis: " + text;
    verlauf.appendChild(kasten);
    kasten.scrollIntoView({ block: "nearest" });
  }

  function fortschritt(nummer) {
    const leiste = $("fortschrittLeiste");
    leiste.hidden = false;
    $("fortschrittText").textContent = nummer > BLOECKE.length
      ? "Zusammenfassung"
      : "Thema " + nummer + " von " + BLOECKE.length;
    $("balkenFuellung").style.width = Math.round((nummer / BLOCK_GESAMT) * 100) + "%";
    const balken = leiste.querySelector(".balken");
    balken.setAttribute("aria-valuenow", String(nummer));
    balken.setAttribute("aria-valuemax", String(BLOCK_GESAMT));
  }

  /* ================================================================ */
  /* Antworten prüfen                                                  */
  /* ================================================================ */
  /*
     1. Gemeindenamen aus dem Landkreis werden durch [Ort] ersetzt.
     2. Angaben nach Artikel 9 DSGVO werden durch [entfernt] ersetzt.

     Personennamen werden BEWUSST NICHT automatisch gesucht: Im Deutschen wird
     jedes Hauptwort großgeschrieben, eine Erkennung läge ständig daneben.
     Fiona bittet darum, keine Namen zu nennen — und am Ende prüft der
     Teilnehmer die Zusammenfassung selbst.
  */

  function pruefen(text) {
    let sauber = text;
    const gefunden = [];

    /*
       Namen: nur nach eindeutigen Wendungen wie "ich bin ...".
       Bewusst ohne zusammengebautes Suchmuster — die Wendung wird schlicht
       gesucht, und geprüft wird nur, was direkt dahinter steht.
    */
    const NAECHSTES_WORT = /^\s+(\p{Lu}[\p{L}‐-―-]{1,24})/u;

    NAMENS_WENDUNGEN.forEach((wendung) => {
      let ab = 0;
      for (let schutz = 0; schutz < 20; schutz++) {
        const stelle = sauber.toLowerCase().indexOf(wendung, ab);
        if (stelle < 0) break;

        const nach = stelle + wendung.length;
        const treffer = sauber.slice(nach).match(NAECHSTES_WORT);

        if (treffer && !KEINE_NAMEN.includes(treffer[1].toLowerCase())) {
          const laenge = treffer[0].length;
          sauber = sauber.slice(0, nach) + " [Name]" + sauber.slice(nach + laenge);
          if (!gefunden.includes("name")) gefunden.push("name");
          ab = nach + 7;
        } else {
          ab = nach;
        }
      }
    });

    ORTE.forEach((ort) => {
      const muster = new RegExp("\\b" + ort + "\\w*", "gi");
      if (muster.test(sauber)) {
        sauber = sauber.replace(muster, "[Ort]");
        if (!gefunden.includes("ort")) gefunden.push("ort");
      }
    });

    SENSIBEL.forEach((wort) => {
      const muster = new RegExp("\\b" + wort + "\\w*", "gi");
      if (muster.test(sauber)) {
        sauber = sauber.replace(muster, "[entfernt]");
        if (!gefunden.includes("sensibel")) gefunden.push("sensibel");
      }
    });

    return { text: sauber, hinweise: gefunden };
  }

  /* ================================================================ */
  /* Sicherungspunkte für den Zurück-Knopf                             */
  /* ================================================================ */

  function sicherungAnlegen() {
    schritte.push({
      blockIndex: zustand.blockIndex,
      frageIndex: zustand.frageIndex,
      warteschlange: zustand.warteschlange.slice(),
      verzweigungen: zustand.verzweigungen,
      antworten: JSON.parse(JSON.stringify(zustand.antworten)),
      reihenfolge: zustand.reihenfolge.slice(),
      gestellt: {
        verzweigungen: zustand.gestellt.verzweigungen.slice(),
        anstoesse: zustand.gestellt.anstoesse.slice(),
        nachfassen: zustand.gestellt.nachfassen.slice(),
      },
      verlaufLaenge: verlauf.children.length,
    });
  }

  /*
     Jeder Sicherungspunkt hält den Zustand UNMITTELBAR BEVOR eine Frage
     gestellt wurde. Der oberste gehört zur Frage, die gerade dasteht — der
     muss also weg, und der darunter wird wiederhergestellt.
  */
  function zurueck() {
    if (schritte.length < 2) return;
    tonAus();
    zuhoerenPausieren();
    schritte.pop();
    const s = schritte.pop();
    zustand.blockIndex = s.blockIndex;
    zustand.frageIndex = s.frageIndex;
    zustand.warteschlange = s.warteschlange;
    zustand.verzweigungen = s.verzweigungen;
    zustand.antworten = s.antworten;
    zustand.reihenfolge = s.reihenfolge;
    zustand.gestellt = s.gestellt;
    while (verlauf.children.length > s.verlaufLaenge) {
      verlauf.removeChild(verlauf.lastChild);
    }
    weiter();
  }

  /* ================================================================ */
  /* Eingabefelder                                                     */
  /* ================================================================ */

  function eingabeLeeren() { eingabe.innerHTML = ""; }

  function zurueckKnopf() {
    if (schritte.length < 2) return null;
    const k = document.createElement("button");
    k.type = "button";
    k.className = "knopf knopf-still";
    k.textContent = "Eine Frage zurück";
    k.addEventListener("click", zurueck);
    return k;
  }

  function frageStellenText(frage) {
    eingabeLeeren();

    const feld = document.createElement("textarea");
    feld.className = "eingabe-feld";
    feld.id = "antwortfeld";
    feld.setAttribute("aria-label", frage.frage);
    feld.placeholder = zustand.modus === "sprechen"
      ? "Sprich einfach los — was Du sagst, erscheint hier."
      : "Deine Antwort …";

    const anzeige = document.createElement("p");
    anzeige.className = "hoeranzeige";
    anzeige.id = "hoerAnzeige";
    anzeige.hidden = true;
    anzeige.setAttribute("aria-live", "polite");

    const zeile = document.createElement("div");
    zeile.className = "eingabe-zeile";

    const weiterK = document.createElement("button");
    weiterK.type = "button";
    weiterK.className = "knopf";
    weiterK.textContent = zustand.modus === "sprechen" ? "Fertig — weiter" : "Weiter";
    weiterK.addEventListener("click", () => {
      zuhoerenPausieren();
      antwortAbgeben(frage, feld.value);
    });

    const ueberK = document.createElement("button");
    ueberK.type = "button";
    ueberK.className = "knopf knopf-still";
    ueberK.textContent = "Überspringen";
    ueberK.addEventListener("click", () => {
      zuhoerenPausieren();
      antwortAbgeben(frage, "");
    });

    zeile.appendChild(weiterK);
    zeile.appendChild(ueberK);

    /*
       Mikrofon-Umschalter. Vorher hiess der Knopf "Nochmal sprechen" und tat
       nichts, wenn die Erkennung ohnehin lief. Jetzt schaltet er sichtbar
       zwischen an und aus — und was schon im Feld steht, bleibt stehen.
    */
    if (zustand.modus === "sprechen" && spracheMoeglich()) {
      const mikroK = document.createElement("button");
      mikroK.type = "button";
      mikroK.className = "knopf knopf-still";

      const mikroBeschriften = () => {
        mikroK.innerHTML = zustand.hoertZu
          ? '<span aria-hidden="true">⏸</span> Mikrofon aus'
          : '<span aria-hidden="true">🎙</span> Mikrofon an';
      };
      mikroBeschriften();

      mikroK.addEventListener("click", async () => {
        if (zustand.hoertZu) {
          zustand.hoertZu = false;
          if (erkennung) { try { erkennung.stop(); } catch (e) {} }
          anzeigeSetzen("Mikrofon aus. Du kannst tippen — oder es wieder anschalten.", false);
        } else {
          await zuhoerenStarten(feld, anzeige);
        }
        mikroBeschriften();
        feld.focus();
      });

      zeile.appendChild(mikroK);
    }

    const zk = zurueckKnopf();
    if (zk) zeile.appendChild(zk);

    eingabe.appendChild(feld);
    eingabe.appendChild(anzeige);
    eingabe.appendChild(zeile);

    if (zustand.modus === "sprechen") return { feld: feld, anzeige: anzeige };
    feld.focus();
    return null;
  }

  function frageStellenAuswahl(frage) {
    eingabeLeeren();

    const gruppe = document.createElement("div");
    gruppe.className = "auswahl";
    gruppe.setAttribute("role", "group");
    gruppe.setAttribute("aria-label", frage.frage);

    frage.optionen.forEach((option) => {
      const k = document.createElement("button");
      k.type = "button";
      k.className = "auswahl-knopf";
      k.textContent = option;
      k.addEventListener("click", () => antwortAbgeben(frage, option));
      gruppe.appendChild(k);
    });

    eingabe.appendChild(gruppe);

    const zeile = document.createElement("div");
    zeile.className = "eingabe-zeile";
    const zk = zurueckKnopf();
    if (zk) zeile.appendChild(zk);
    if (zeile.children.length) eingabe.appendChild(zeile);

    gruppe.querySelector("button").focus();
  }

  /* ================================================================ */
  /* Ablauf                                                            */
  /* ================================================================ */

  function antwortAbgeben(frage, roh) {
    const eingegeben = (roh || "").trim();
    let text = eingegeben;

    if (text) {
      const geprueft = pruefen(text);
      text = geprueft.text;
      beitragIch(text);
      geprueft.hinweise.forEach((art) => {
        if (art === "name") beitragHinweis(HINWEISE.name);
        if (art === "ort") beitragHinweis(HINWEISE.ort);
        if (art === "sensibel") beitragHinweis(HINWEISE.sensibel);
      });
    } else {
      beitragIch("(übersprungen)");
    }

    if (text) {
      zustand.antworten[frage.id] = {
        label: frage.label || frage.frage,
        text: text,
        block: frage.blockNummer,
      };
      if (!zustand.reihenfolge.includes(frage.id)) zustand.reihenfolge.push(frage.id);
    } else {
      delete zustand.antworten[frage.id];
    }

    // Anstoß, falls sehr wenig kam
    if (frage.anstoss
        && text.length < frage.anstoss.wennKuerzerAls
        && !zustand.gestellt.anstoesse.includes(frage.id)) {
      zustand.gestellt.anstoesse.push(frage.id);
      zustand.warteschlange.unshift({
        id: frage.id + "_anstoss",
        frage: frage.anstoss.text,
        label: (frage.label || "") + " (auf Nachfrage)",
        typ: "text",
        blockNummer: frage.blockNummer,
      });
    }

    // Verzweigung nach Stichwort — nur bei Fragen mit "verzweigt: true".
    // Sonst würde Fiona auch auf ein Lob mit einer Problemfrage antworten.
    const block = BLOECKE[zustand.blockIndex];
    if (block && block.verzweigungen && text && frage.verzweigt) {
      const grenze = block.maxVerzweigungen || 2;
      if (zustand.verzweigungen < grenze) {
        const klein = text.toLowerCase();
        let nr = -1;
        for (let i = 0; i < block.verzweigungen.length; i++) {
          if (zustand.gestellt.verzweigungen.includes(block.nummer + ":" + i)) continue;
          if (block.verzweigungen[i].stichworte.some((s) => klein.includes(s))) { nr = i; break; }
        }
        if (nr > -1) {
          zustand.gestellt.verzweigungen.push(block.nummer + ":" + nr);
          zustand.verzweigungen++;
          zustand.warteschlange.push({
            id: frage.id + "_nach" + zustand.verzweigungen,
            frage: block.verzweigungen[nr].frage,
            label: "Nachfrage",
            typ: "text",
            blockNummer: frage.blockNummer,
          });
        }
      }
    }

    weiter();
  }

  /*
     Einen Block betreten: Fortschritt, Trennmarke, Einleitung. Gilt auch fuer
     den allerersten Block -- sonst fiele dessen Einleitung stillschweigend
     unter den Tisch, weil der erste Block nie "gewechselt" wird.
  */
  /*
     Jeder Block bekommt eine eigene Seite.

     Vorher lief alles als ein langer Verlauf durch — nach zwanzig Fragen
     musste man weit scrollen und wusste nicht mehr, wo man ist. Jetzt wird
     der Verlauf beim Themenwechsel geleert und eine Übergangskarte gezeigt:
     Zeichen, Nummer, Thema, ein Satz dazu und ein Knopf. Erst danach beginnt
     der Block auf leerer Fläche.

     Die Antworten gehen dabei nicht verloren — die stehen im Zustand, nicht
     auf dem Bildschirm.
  */

  function blockBetreten(block) {
    fortschritt(block.nummer);
    tonAus();
    verlauf.innerHTML = "";
    eingabeLeeren();

    const karte = document.createElement("section");
    karte.className = "blockseite";

    const symbol = document.createElement("div");
    symbol.className = "blockseite-symbol";
    symbol.appendChild(zeichen(block.icon));

    const nummer = document.createElement("p");
    nummer.className = "blockseite-nummer";
    nummer.textContent = "Thema " + block.nummer + " von " + BLOECKE.length;

    const titel = document.createElement("h2");
    titel.className = "blockseite-titel";
    titel.textContent = block.name;

    karte.appendChild(symbol);
    karte.appendChild(nummer);
    karte.appendChild(titel);

    if (block.einleitung) {
      const text = document.createElement("p");
      text.className = "blockseite-text";
      text.textContent = block.einleitung;
      karte.appendChild(text);
    }

    const zeile = document.createElement("div");
    zeile.className = "eingabe-zeile";

    const weiterK = document.createElement("button");
    weiterK.type = "button";
    weiterK.className = "knopf knopf-gross";
    weiterK.textContent = "Weiter";
    weiterK.addEventListener("click", () => {
      eingabeLeeren();
      if (block.einleitung) beitragFiona(block.einleitung);
      weiter();
    });

    zeile.appendChild(weiterK);
    karte.appendChild(zeile);

    eingabe.appendChild(karte);
    window.scrollTo({ top: 0, behavior: "smooth" });
    weiterK.focus();
  }

  // Stellt die Frage: sprechen, und wenn Fiona fertig ist, das Mikrofon an.
  function textfrageZeigen(frage) {
    const teile = frageStellenText(frage);
    beitragFiona(frage.frage, () => {
      if (teile) zuhoerenStarten(teile.feld, teile.anzeige);
    });
  }

  function weiter() {
    // 1. Steht noch eine Nachfrage an?
    // Sicherung IMMER vor dem Entnehmen anlegen, sonst zeigt sie auf den
    // Zustand nach der Frage und der Zurück-Knopf springt zu weit.
    if (zustand.warteschlange.length) {
      sicherungAnlegen();
      textfrageZeigen(zustand.warteschlange.shift());
      return;
    }

    const block = BLOECKE[zustand.blockIndex];

    // 2. Noch Fragen im laufenden Block?
    if (block && zustand.frageIndex < block.fragen.length) {
      sicherungAnlegen();
      const frage = block.fragen[zustand.frageIndex];
      frage.blockNummer = block.nummer;
      zustand.frageIndex++;
      fortschritt(block.nummer);
      if (frage.typ === "auswahl") {
        frageStellenAuswahl(frage);
        beitragFiona(frage.frage);
      } else {
        textfrageZeigen(frage);
      }
      return;
    }

    // 3. Nachfassen am Blockende?
    if (block && block.nachfassen && !zustand.gestellt.nachfassen.includes(block.nummer)) {
      zustand.gestellt.nachfassen.push(block.nummer);
      const summe = block.fragen
        .map((f) => (zustand.antworten[f.id] ? zustand.antworten[f.id].text.length : 0))
        .reduce((a, b) => a + b, 0);
      zustand.warteschlange.push({
        id: block.nachfassen.id,
        frage: summe < block.nachfassen.schwelle ? block.nachfassen.wenig : block.nachfassen.viel,
        label: block.nachfassen.label,
        typ: "text",
        blockNummer: block.nummer,
      });
      weiter();
      return;
    }

    // 4. Nächster Block
    zustand.blockIndex++;
    zustand.frageIndex = 0;
    zustand.verzweigungen = 0;

    const naechster = BLOECKE[zustand.blockIndex];
    if (naechster) {
      blockBetreten(naechster);   // wartet auf den Weiter-Knopf
      return;
    }

    abschluss();
  }

  /* ================================================================ */
  /* Zusammenfassung                                                   */
  /* ================================================================ */

  /*
     Aus den Antworten eines Blocks die Paare "Überschrift / Text" bauen.
     Nachfragen und Anstöße hängen dabei an der Frage, die sie ausgelöst hat.
  */
  function antwortenZuBlock(block) {
    const teile = [];

    block.fragen.forEach((f) => {
      const a = zustand.antworten[f.id];
      if (a) teile.push({ label: a.label, text: a.text });

      const anstoss = zustand.antworten[f.id + "_anstoss"];
      if (anstoss) teile.push({ label: anstoss.label, text: anstoss.text });

      for (let i = 1; i <= 3; i++) {
        const nach = zustand.antworten[f.id + "_nach" + i];
        if (nach) teile.push({ label: "Nachfrage", text: nach.text });
      }
    });

    if (block.nachfassen) {
      const n = zustand.antworten[block.nachfassen.id];
      if (n) teile.push({ label: n.label, text: n.text });
    }

    return teile;
  }

  /*
     Der Text für Download und Formular. Schlicht und schnörkellos — er soll
     sich später gut auswerten lassen. Die schöne Ansicht auf dem Bildschirm
     ist eine andere Sache, siehe abschluss().
  */
  /*
     Der Text, der weitergegeben wird.

     Zwei Fassungen, aus einem einfachen Grund: Der Download darf schmuck
     sein, die Adresszeile nicht. Trennlinien aus sechzig Gleichheitszeichen
     kosten in einer Adresse rund 1.200 Zeichen — und genau die fehlen dann,
     damit die Zusammenfassung noch ins Formular passt.

       schmuck = true   Download und Zwischenablage: mit Trennlinien
       schmuck = false  fuer die Adresszeile: knapp, aber vollstaendig
  */
  function textAusFeldern(schmuck) {
    const heute = new Date().toLocaleDateString("de-DE");
    const zeilen = [];

    if (schmuck) {
      zeilen.push("ZUSAMMENFASSUNG — ERWARTUNGEN AN DEN KREISBRANDMEISTER");
      zeilen.push("Landkreis Vechta · anonym · " + heute);
      zeilen.push("");
      zeilen.push("Erhoben im Gespräch mit Fiona.");
      zeilen.push("Vom Teilnehmer vor dem Absenden geprüft und freigegeben.");
      zeilen.push("");
    } else {
      zeilen.push("Zusammenfassung (anonym), " + heute);
      zeilen.push("");
    }

    let letzterBlock = null;
    abschlussFelder.forEach((eintrag) => {
      const wert = eintrag.feld.value.trim();
      if (!wert) return;

      if (eintrag.block !== letzterBlock) {
        letzterBlock = eintrag.block;
        if (schmuck) {
          zeilen.push("=".repeat(60));
          zeilen.push(eintrag.block);
          zeilen.push("=".repeat(60));
          zeilen.push("");
        } else {
          zeilen.push("[" + eintrag.block + "]");
        }
      }
      zeilen.push(eintrag.label + ":");
      zeilen.push(wert);
      zeilen.push("");
    });

    if (schmuck) {
      zeilen.push("=".repeat(60));
      zeilen.push("Ende der Zusammenfassung.");
    }

    return zeilen.join("\n");
  }

  /* Feld wächst mit dem Inhalt — kein Scrollen in winzigen Kästchen. */
  function hoeheAnpassen(feld) {
    feld.style.height = "auto";
    feld.style.height = (feld.scrollHeight + 2) + "px";
  }

  let abschlussFelder = [];

  function abschluss() {
    fortschritt(BLOCK_GESAMT);
    zuhoerenBeenden();
    tonAus();
    // Die Zusammenfassung bekommt eine eigene Seite — der Gespraechsverlauf
    // waere hier nur noch Ballast und muesste weggescrollt werden.
    verlauf.innerHTML = "";
    eingabeLeeren();
    window.scrollTo({ top: 0, behavior: "smooth" });
    beitragFiona(ABSCHLUSS.einleitung);
    abschlussFelder = [];

    const mappe = document.createElement("div");
    mappe.className = "zf-mappe";

    BLOECKE.forEach((block) => {
      const teile = antwortenZuBlock(block);
      if (!teile.length) return;

      const karte = document.createElement("section");
      karte.className = "zf-block";

      const kopf = document.createElement("div");
      kopf.className = "zf-kopf";

      const symbol = document.createElement("div");
      symbol.className = "zf-symbol";
      symbol.appendChild(zeichen(block.icon));

      const titel = document.createElement("h2");
      titel.textContent = block.zusammenfassungTitel;

      kopf.appendChild(symbol);
      kopf.appendChild(titel);
      karte.appendChild(kopf);

      teile.forEach((t, i) => {
        const zeile = document.createElement("div");
        zeile.className = "zf-feld";

        const kennung = "zf_" + block.nummer + "_" + i;

        const label = document.createElement("label");
        label.setAttribute("for", kennung);
        label.textContent = t.label;

        const feld = document.createElement("textarea");
        feld.id = kennung;
        feld.className = "zf-eingabe";
        feld.value = t.text;
        feld.rows = 2;
        feld.addEventListener("input", () => hoeheAnpassen(feld));

        zeile.appendChild(label);
        zeile.appendChild(feld);
        karte.appendChild(zeile);

        abschlussFelder.push({ block: block.zusammenfassungTitel, label: t.label, feld: feld });
      });

      mappe.appendChild(karte);
    });

    const hinweis = document.createElement("p");
    hinweis.className = "hinweiszeile";
    hinweis.textContent = "Du kannst jeden Abschnitt direkt ändern oder leeren. Nichts ist verloren, solange Du nicht speicherst.";

    const zeile = document.createElement("div");
    zeile.className = "eingabe-zeile";

    const speichernK = document.createElement("button");
    speichernK.type = "button";
    speichernK.className = "knopf";
    speichernK.textContent = "Speichern";
    speichernK.addEventListener("click", () => speichern());

    const verwerfenK = document.createElement("button");
    verwerfenK.type = "button";
    verwerfenK.className = "knopf knopf-still";
    verwerfenK.textContent = "Verwerfen und schließen";
    verwerfenK.addEventListener("click", abbruchFragen);

    zeile.appendChild(speichernK);
    zeile.appendChild(verwerfenK);

    eingabe.appendChild(mappe);
    eingabe.appendChild(hinweis);
    eingabe.appendChild(zeile);

    // Erst nach dem Einhängen hat scrollHeight einen sinnvollen Wert.
    abschlussFelder.forEach((e) => hoeheAnpassen(e.feld));
  }
  /* ================================================================ */
  /* Speichern                                                         */
  /* ================================================================ */

  function herunterladen(text) {
    const datei = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(datei);
    const a = document.createElement("a");
    a.href = url;
    a.download = KONFIG.dateiname;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function inZwischenablage(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      return false;
    }
  }

  /*
     Die Zusammenfassung ins Formular bringen.

     Erster Weg — der bequeme: Microsoft Forms kann Antworten über die Adresse
     vorausfüllen. Dann öffnet sich das Formular mit dem fertigen Text, und der
     Teilnehmer muss nur noch auf Absenden klicken. Kein Kopieren, kein
     Einfügen, nichts, was man falsch machen kann.

     Zweiter Weg — die Rückfallebene: Ist der Text zu lang für eine Adresse,
     wandert er in die Zwischenablage und muss von Hand eingefügt werden.

     Zum Mitdenken: Beim ersten Weg steht der Text in der Adresszeile und
     landet damit im Browserverlauf — auf dem Rechner des Teilnehmers, mit
     seinen eigenen, anonymen Antworten. Zu Microsoft gehen sie ohnehin, sobald
     abgesendet wird.
  */

  function formularAdresse(text) {
    if (!KONFIG.formularUrl) return null;
    if (!KONFIG.formularFeld) return null;

    const adresse = KONFIG.formularUrl + "&" + KONFIG.formularFeld + "=" + encodeURIComponent(text);
    return adresse.length <= (KONFIG.urlGrenze || 3800) ? adresse : null;
  }

  async function speichern() {
    tonAus();
    zustand.fertig = true;

    // Schmuckfassung fuer Download und Zwischenablage, knappe fuer die Adresse.
    const text = textAusFeldern(true);
    const knapp = textAusFeldern(false);

    eingabeLeeren();

    const testbetrieb = !KONFIG.formularUrl;
    const vorausgefuellt = testbetrieb ? null : formularAdresse(knapp);

    /*
       Das Fenster MUSS hier aufgehen, direkt im Klick — vor jedem await.
       Danach gilt der Klick als abgehandelt und der Browser blockiert das
       Öffnen als ungebetenes Fenster.
    */
    if (vorausgefuellt) window.open(vorausgefuellt, "_blank", "noopener");

    let kopiert = false;
    if (!testbetrieb && !vorausgefuellt) kopiert = await inZwischenablage(text);

    beitragFiona(ABSCHLUSS.nachDemSpeichern);

    const kasten = document.createElement("div");
    kasten.className = "kasten";

    if (testbetrieb) {
      const p = document.createElement("p");
      const stark = document.createElement("strong");
      stark.textContent = ABSCHLUSS.testbetrieb;
      p.appendChild(stark);
      kasten.appendChild(p);

    } else if (vorausgefuellt) {
      const h = document.createElement("h2");
      h.textContent = "Nur noch ein Klick";
      kasten.appendChild(h);

      const p = document.createElement("p");
      p.className = "kasten-wichtig";
      p.textContent = ABSCHLUSS.formularFertig;
      kasten.appendChild(p);

      const nochmalK = document.createElement("button");
      nochmalK.type = "button";
      nochmalK.className = "knopf";
      nochmalK.textContent = ABSCHLUSS.formularNochmal;
      nochmalK.addEventListener("click", () => {
        window.open(vorausgefuellt, "_blank", "noopener");
      });
      kasten.appendChild(nochmalK);

    } else {
      const h = document.createElement("h2");
      h.textContent = "So kommt Dein Text ins Formular";
      kasten.appendChild(h);

      const p = document.createElement("p");
      p.textContent = kopiert
        ? ABSCHLUSS.formularAnleitung
        : "Markiere den Text unten, kopiere ihn mit Strg und C, und füge ihn im Formular mit Strg und V ein.";
      kasten.appendChild(p);

      if (!kopiert) {
        const feld = document.createElement("textarea");
        feld.className = "zusammenfassung";
        feld.readOnly = true;
        feld.value = text;
        feld.setAttribute("aria-label", "Dein Text zum Kopieren");
        kasten.appendChild(feld);
      }

      const formularK = document.createElement("button");
      formularK.type = "button";
      formularK.className = "knopf";
      formularK.textContent = ABSCHLUSS.formularOeffnen;
      formularK.addEventListener("click", () => {
        window.open(KONFIG.formularUrl, "_blank", "noopener");
      });
      kasten.appendChild(formularK);
    }

    const zeile = document.createElement("div");
    zeile.className = "eingabe-zeile";

    const ladenK = document.createElement("button");
    ladenK.type = "button";
    ladenK.className = "knopf knopf-still";
    ladenK.textContent = "Text herunterladen";
    ladenK.addEventListener("click", () => herunterladen(text));
    zeile.appendChild(ladenK);

    const kopierenK = document.createElement("button");
    kopierenK.type = "button";
    kopierenK.className = "knopf knopf-still";
    kopierenK.textContent = "In die Zwischenablage";
    kopierenK.addEventListener("click", async () => {
      const ok = await inZwischenablage(text);
      kopierenK.textContent = ok ? "Kopiert" : "Kopieren hat nicht geklappt";
    });
    zeile.appendChild(kopierenK);

    eingabe.appendChild(kasten);
    eingabe.appendChild(zeile);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ================================================================ */
  /* Abbruch                                                           */
  /* ================================================================ */

  function abbruchFragen() {
    const fenster = $("abbruchFenster");
    $("abbruchJa").onclick = () => { fenster.close(); allesLoeschen(); };
    $("abbruchNein").onclick = () => fenster.close();
    fenster.showModal();
  }

  function allesLoeschen() {
    zustand.fertig = true;
    tonAus();
    zuhoerenBeenden();
    zustand.antworten = {};
    zustand.reihenfolge = [];
    schritte.length = 0;
    verlauf.innerHTML = "";
    eingabeLeeren();
    $("fortschrittLeiste").hidden = true;
    beitragFiona([
      "Alles klar. Es wurde nichts gespeichert und nichts weitergegeben.",
      "Wenn Du es Dir anders überlegst, lade die Seite einfach neu.",
    ]);
  }

  /* ================================================================ */
  /* Startbildschirm                                                   */
  /* ================================================================ */


  /* --- Der Wappenkranz --------------------------------------------- */
  /*
     ACHTUNG: Kommunale Wappen sind genehmigungspflichtig. Solange keine
     echten Bilder im Ordner `wappen/` liegen, zeigt die Seite eigene,
     stilisierte Schilde mit den Ortskürzeln. Legt jemand ein Bild ab, wird
     es automatisch verwendet — fehlt es, bleibt der Platzhalter.
  */

  /* --- Zeichen (Icons) ---------------------------------------------- */
  /*
     Schlichte Strichzeichnungen, in der Seite selbst erzeugt. Keine fremden
     Dateien, keine Schriftart, kein Nachladen. Farbe kommt vom Text.
  */

  const ZEICHEN = {
    person: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
    leute: '<circle cx="9" cy="8.5" r="3.4"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 6.2a3.4 3.4 0 0 1 0 6"/><path d="M17.5 14.4A6.5 6.5 0 0 1 21.5 20"/>',
    lupe: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>',
    liste: '<path d="M9 6h11M9 12h11M9 18h7"/><path d="M4 5.6l1.3 1.3L7.5 4.4"/><path d="M4 11.6l1.3 1.3L7.5 10.4"/><path d="M4 17.6l1.3 1.3L7.5 16.4"/>',
    stern: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z"/>',
    alarm: '<path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6"/><path d="M10.3 20a2 2 0 0 0 3.4 0"/>',
    sprechblase: '<path d="M20.5 12.5a7.5 7.5 0 0 1-11 6.6L4 20.5l1.5-5A7.5 7.5 0 1 1 20.5 12.5z"/>',
    zweig: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18.5" r="2.5"/><path d="M7 8l4 8.2M17 8l-4 8.2"/>',
    blatt: '<path d="M6 3.5h8l4.5 4.5v12.5H6z"/><path d="M14 3.5V8h4.5"/><path d="M9 13h6M9 16.5h4"/>',
    roboter: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4"/><circle cx="12" cy="3" r="1.4"/><path d="M9 14h.01M15 14h.01"/><path d="M2 13v3M22 13v3"/>',
    schloss: '<rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14.5v2.5"/>',
    lautsprecher: '<path d="M4 9v6h3.5L13 19V5L7.5 9H4z"/><path d="M16.5 8.5a4.5 4.5 0 0 1 0 7"/><path d="M19.5 5.5a8.5 8.5 0 0 1 0 13"/>',
    mikrofon: '<rect x="9" y="2.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0"/><path d="M12 18v3.5"/><path d="M8.5 21.5h7"/>',
    uhr: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
    haken: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.6 2.6L16 9.5"/>',
  };

  function zeichen(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.7");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", "zeichen");
    svg.innerHTML = ZEICHEN[name] || ZEICHEN.haken;
    return svg;
  }

  /* --- Browser ohne Spracheingabe ---------------------------------- */
  /*
     Firefox kann keine Spracheingabe. Statt den Teilnehmer erst nach zehn
     Minuten damit zu überraschen, kommt der Hinweis gleich am Anfang — groß
     und mit einem Knopf, der den Link in die Zwischenablage legt.

     Ausgesperrt wird trotzdem niemand: Wer nur Firefox hat, kann weiter und
     tippen. Der Hinweis ist deutlich, aber keine Mauer.
  */

  function browserSperreZeigen() {
    const s = $("browserHinweis");
    $("sperreSymbol").appendChild(zeichen("mikrofon"));
    $("sperreTitel").textContent = BROWSER_HINWEIS.titel;
    $("sperreText").textContent = BROWSER_HINWEIS.text;
    $("sperreAnleitung").textContent = BROWSER_HINWEIS.anleitung;

    const kopierKnopf = $("linkKopieren");
    kopierKnopf.textContent = BROWSER_HINWEIS.linkKopieren;
    kopierKnopf.addEventListener("click", async () => {
      const ok = await inZwischenablage(location.href);
      kopierKnopf.textContent = ok
        ? BROWSER_HINWEIS.linkKopiert
        : location.href;
    });

    const weiterKnopf = $("trotzdemWeiter");
    weiterKnopf.textContent = BROWSER_HINWEIS.trotzdem;
    weiterKnopf.addEventListener("click", () => {
      s.hidden = true;
      $("startbildschirm").hidden = false;
      $("buehne").focus();
    });

    $("startbildschirm").hidden = true;
    s.hidden = false;
  }

  /* --- Bildschirm 1: Startseite ------------------------------------ */

  function startseiteAufbauen() {
    $("bildUnterschrift").textContent = STARTSEITE.bildunterschrift;

    $("startTitel").textContent = STARTSEITE.titel;
    $("startUnter").textContent = STARTSEITE.untertitel;

    const text = $("startText");
    STARTSEITE.absaetze.forEach((a) => {
      const p = document.createElement("p");
      p.textContent = a;
      text.appendChild(p);
    });

    const punkte = $("startPunkte");
    STARTSEITE.punkte.forEach((p) => {
      const li = document.createElement("li");
      li.textContent = p;
      punkte.appendChild(li);
    });

    const knopf = $("startKnopf");
    knopf.textContent = STARTSEITE.starten;
    knopf.addEventListener("click", zurVorbereitung);
  }

  /* --- Bildschirm 2: Vorbereitung ---------------------------------- */

  function vorbereitungAufbauen() {
    $("vorTitel").textContent = VORBEREITUNG.titel;
    $("vorUnter").textContent = VORBEREITUNG.untertitel;
    $("mikroTitel").textContent = VORBEREITUNG.mikroTitel;
    $("mikroText").textContent = VORBEREITUNG.mikroText;
    $("mikroKnopf").textContent = VORBEREITUNG.mikroStarten;
    $("weiterSprechen").textContent = VORBEREITUNG.weiterSprechen;
    $("weiterTippen").textContent = VORBEREITUNG.weiterTippen;

    const karten = $("vorHinweise");
    VORBEREITUNG.hinweise.forEach((h) => {
      const karte = document.createElement("div");
      karte.className = "karte";

      const symbol = document.createElement("div");
      symbol.className = "karte-symbol";
      symbol.appendChild(zeichen(h.icon));

      const inhalt = document.createElement("div");
      const titel = document.createElement("h2");
      titel.textContent = h.titel;
      const text = document.createElement("p");
      text.textContent = h.text;
      inhalt.appendChild(titel);
      inhalt.appendChild(text);

      karte.appendChild(symbol);
      karte.appendChild(inhalt);
      karten.appendChild(karte);
    });

    // Was zur Spracheingabe zu wissen ist.
    const hinweis = $("sicherheitshinweis");
    if (!ErkennungsKlasse) {
      hinweis.textContent = VORBEREITUNG.keinMikrofon;
      hinweis.hidden = false;
      $("mikroKnopf").disabled = true;
      $("weiterSprechen").disabled = true;
    } else if (location.protocol === "file:") {
      hinweis.textContent = VORBEREITUNG.nurUeberInternet;
      hinweis.hidden = false;
    }

    // Ein einziger Handler — vorher gab es zwei, die sich gegenseitig
    // aufgehoben haben: der eine startete den Test, der andere stoppte ihn
    // im selben Klick wieder.
    $("mikroKnopf").addEventListener("click", () => {
      if (testLaeuft) testBeenden(false); else testStarten();
    });

    // Sobald im Testfeld Text auftaucht, meldet Fiona das.
    $("mikroFeld").addEventListener("input", testTextGehoert);
    $("weiterSprechen").addEventListener("click", () => gespraechStarten("sprechen"));
    $("weiterTippen").addEventListener("click", () => gespraechStarten("tippen"));
  }

  function zurVorbereitung() {
    $("startbildschirm").hidden = true;
    $("vorbereitung").hidden = false;
    $("buehne").focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* --- Der Mikrofontest auf der Vorbereitungsseite ------------------ */
  /*
     Warum das aufwendiger ist als es aussieht:

     Die Spracherkennung meldet nur dann etwas, wenn sie WÖRTER versteht. Ist
     das Mikrofon stummgeschaltet, falsch eingestellt oder zu leise, passiert
     einfach gar nichts — und der Teilnehmer sitzt vor einem stummen Feld und
     weiß nicht, woran es liegt.

     Deshalb wird zusätzlich der ROHE PEGEL gemessen. Damit lässt sich
     unterscheiden:
       - kein Pegel        → Mikrofon aus, stumm oder nicht angeschlossen
       - Pegel, kein Text  → Mikrofon läuft, Erkennung hat nur nichts verstanden
       - Pegel und Text    → alles in Ordnung

     Jeder Schritt wird angezeigt. Nach 7 Sekunden ohne Pegel kommt ein
     Hinweis, nach 15 Sekunden die klare Ansage.
  */

  let testLaeuft = false;
  let testStrom = null;       // der Mikrofon-Datenstrom
  let testKlang = null;       // AudioContext
  let testSchleife = null;    // requestAnimationFrame
  let testUhren = [];
  let pegelGehoert = false;
  let textGehoert = false;

  function testMelden(text, art) {
    const p = $("testStatus");
    p.textContent = text;
    p.className = "teststatus" + (art ? " teststatus-" + art : "");
  }

  async function testStarten() {
    const ergebnis = $("mikroErgebnis");
    const feld = $("mikroFeld");
    const anzeige = $("hoerAnzeigeVor");
    const knopf = $("mikroKnopf");
    const befund = $("mikroBefund");

    testLaeuft = true;
    pegelGehoert = false;
    textGehoert = false;
    ergebnis.hidden = false;
    feld.value = "";
    befund.hidden = true;
    knopf.textContent = VORBEREITUNG.mikroBeenden;

    testMelden(VORBEREITUNG.mikroStatus.starte, null);
    await new Promise((r) => setTimeout(r, 350));
    if (!testLaeuft) return;

    testMelden(VORBEREITUNG.mikroStatus.erlaubnis, null);

    // 1. Rohen Ton holen — daran sieht man, ob ueberhaupt etwas ankommt.
    //    Wird EINMAL geholt und fuer das ganze Gespraech offen gehalten,
    //    damit Chrome nicht bei jeder Frage neu nachfragt.
    const ok = await mikroStromHolen();
    if (!ok) {
      testMelden(VORBEREITUNG.mikroStatus.verweigert, "fehler");
      testAufraeumen();
      return;
    }
    testStrom = mikroStrom;
    if (!testLaeuft) { testAufraeumen(); return; }

    testMelden(VORBEREITUNG.mikroStatus.hoert, null);
    $("pegel").hidden = false;
    pegelMessen();

    // 2. Spracherkennung dazu — für den Text und die Namensprüfung.
    if (spracheMoeglich()) zuhoerenStarten(feld, anzeige);

    // 3. Geduldsfäden
    testUhren.push(setTimeout(() => {
      if (testLaeuft && !pegelGehoert) testMelden(VORBEREITUNG.mikroStatus.leise, "warnung");
    }, (VORBEREITUNG.mikroGeduldLeise || 7) * 1000));

    testUhren.push(setTimeout(() => {
      if (testLaeuft && !pegelGehoert) {
        testMelden(VORBEREITUNG.mikroStatus.nichts, "fehler");
        testBeenden(true);
      }
    }, (VORBEREITUNG.mikroGeduldNichts || 15) * 1000));
  }

  function pegelMessen() {
    try {
      const Klang = window.AudioContext || window.webkitAudioContext;
      testKlang = new Klang();
      const quelle = testKlang.createMediaStreamSource(testStrom);
      const pruefer = testKlang.createAnalyser();
      pruefer.fftSize = 512;
      quelle.connect(pruefer);

      const werte = new Uint8Array(pruefer.frequencyBinCount);
      const balken = $("pegelFuellung");

      const schauen = () => {
        if (!testLaeuft) return;
        pruefer.getByteTimeDomainData(werte);

        let groesste = 0;
        for (let i = 0; i < werte.length; i++) {
          const ausschlag = Math.abs(werte[i] - 128);
          if (ausschlag > groesste) groesste = ausschlag;
        }

        const anteil = Math.min(100, Math.round((groesste / 40) * 100));
        balken.style.width = anteil + "%";

        if (groesste > 6 && !pegelGehoert) {
          pegelGehoert = true;
          if (!textGehoert) testMelden(VORBEREITUNG.mikroStatus.pegel, "gut");
        }

        testSchleife = requestAnimationFrame(schauen);
      };

      schauen();
    } catch (e) {
      // Ohne Pegelmessung geht der Test trotzdem — nur weniger aussagekräftig.
      $("pegel").hidden = true;
    }
  }

  function testBeenden(vonSelbst) {
    if (!testLaeuft) return;
    testLaeuft = false;
    zuhoerenPausieren();
    testAufraeumen();
    $("mikroKnopf").textContent = VORBEREITUNG.mikroNochmal;
    if (!vonSelbst) {
      if (textGehoert)      testMelden(VORBEREITUNG.mikroStatus.erkannt, "gut");
      else if (pegelGehoert) testMelden(VORBEREITUNG.mikroStatus.pegel, "gut");
      else                   testMelden(VORBEREITUNG.mikroStatus.nichts, "fehler");
    }
  }

  function testAufraeumen() {
    testLaeuft = false;
    testUhren.forEach((u) => clearTimeout(u));
    testUhren = [];
    if (testSchleife) { cancelAnimationFrame(testSchleife); testSchleife = null; }
    if (testKlang) { try { testKlang.close(); } catch (e) {} testKlang = null; }
    // Der Mikrofon-Strom bleibt bewusst OFFEN: Er haelt die Freigabe, damit
    // Chrome im Gespraech nicht bei jeder Frage erneut fragt. Freigegeben
    // wird er erst am Ende ueber zuhoerenBeenden().
    testStrom = null;
    $("pegel").hidden = true;
    $("pegelFuellung").style.width = "0%";
    $("mikroKnopf").textContent = VORBEREITUNG.mikroNochmal;
  }

  /* Wird aufgerufen, sobald im Testfeld Text auftaucht. */
  function testTextGehoert() {
    const feld = $("mikroFeld");
    const befund = $("mikroBefund");
    const roh = feld.value.trim();
    if (!roh) return;

    if (!textGehoert) {
      textGehoert = true;
      testMelden(VORBEREITUNG.mikroStatus.erkannt, "gut");
    }

    // Führt gleich vor, dass Namen herausfallen.
    const geprueft = pruefen(roh);
    if (geprueft.text !== roh) {
      befund.hidden = false;
      befund.innerHTML = "";
      const p1 = document.createElement("p");
      p1.className = "befund-text";
      p1.textContent = geprueft.text;
      const p2 = document.createElement("p");
      p2.className = "befund-hinweis";
      p2.textContent = geprueft.hinweise.includes("name")
        ? VORBEREITUNG.mikroNameWeg
        : "Diese Angabe wird beim Speichern entfernt.";
      befund.appendChild(p1);
      befund.appendChild(p2);
    }
  }

  /* --- Bildschirm 3: Das Gespräch ---------------------------------- */

  function gespraechStarten(modus) {
    zustand.modus = modus;
    zustand.tonAn = true;
    zustand.gestartet = true;

    zuhoerenPausieren();
    $("vorbereitung").hidden = true;
    $("gespraech").hidden = false;
    $("kopf").hidden = false;
    tonUmschalten(true);
    $("buehne").focus();
    window.scrollTo({ top: 0, behavior: "smooth" });

    const warten = document.createElement("p");
    warten.className = "hinweiszeile";
    warten.textContent = "Einen Moment …";
    eingabe.appendChild(warten);

    // Kurze Pause, damit man sich auf den Ton einstellen kann.
    setTimeout(() => {
      eingabeLeeren();
      beitragFiona(VORSTELLUNG);
      setTimeout(begruessungZeigen, 1800);
    }, VORLAUF_SEKUNDEN * 1000);
  }

  /*
     Die Begrüßung steht sofort geschrieben da und wird gesprochen. Fiona
     wartet danach auf ein ausdrückliches Ja — nicht auf das Sprechende, denn
     wenn der Ton klemmt, käme das nie.
  */
  function begruessungZeigen() {
    beitragFiona(BEGRUESSUNG);
    eingabeLeeren();

    const zeile = document.createElement("div");
    zeile.className = "eingabe-zeile";

    const jaK = document.createElement("button");
    jaK.type = "button";
    jaK.className = "knopf";
    jaK.textContent = BESTAETIGUNG.ja;
    jaK.addEventListener("click", () => {
      eingabeLeeren();
      blockBetreten(BLOECKE[0]);
    });

    const neinK = document.createElement("button");
    neinK.type = "button";
    neinK.className = "knopf knopf-still";
    neinK.textContent = BESTAETIGUNG.nein;
    neinK.addEventListener("click", () => {
      zustand.fertig = true;
      tonAus();
      eingabeLeeren();
      beitragFiona(BESTAETIGUNG.abbruch);
    });

    zeile.appendChild(jaK);
    zeile.appendChild(neinK);
    eingabe.appendChild(zeile);
    jaK.focus();
  }


  function tonKnopfAnzeigen(an) {
    const k = $("tonKnopf");
    k.setAttribute("aria-pressed", String(an));
    k.innerHTML = an
      ? '<span aria-hidden="true">🔊</span> Ton an'
      : '<span aria-hidden="true">🔇</span> Ton aus';
  }

  function tonUmschalten(an) {
    zustand.tonAn = an && !tonKaputt;
    tonKnopfAnzeigen(zustand.tonAn);
    if (an) return;
    // Wichtig: Was noch gesagt werden sollte, wird abgebrochen — aber die
    // daran hängenden Schritte müssen trotzdem laufen, sonst steht das
    // Gespräch still.
    const offen = redeliste.slice();
    tonAus();
    offen.forEach((e) => { if (e.danach) setTimeout(e.danach, 0); });
  }

  /* ================================================================ */
  /* Verdrahtung                                                       */
  /* ================================================================ */

  $("tonKnopf").addEventListener("click", () => tonUmschalten(!zustand.tonAn));
  $("abbruchKnopf").addEventListener("click", abbruchFragen);

  /*
     "Ich hoere nichts" schaltet NICHT sofort ab. Erst wird gemeinsam
     nachgesehen — Lautsprecher, Lautstaerke, Stummschaltung — und eine Probe
     angeboten. Erst wenn der Nutzer bestaetigt, dass wirklich nichts kommt,
     macht Fiona schriftlich weiter.
  */
  $("keinTonKnopf").addEventListener("click", () => {
    tonAus();                       // erst mal Ruhe, damit man in Ruhe pruefen kann
    $("tonFenster").showModal();
  });

  $("tonProbe").addEventListener("click", () => {
    zustand.tonAn = true;
    tonKnopfAnzeigen(true);
    sprich("Hörst Du mich jetzt? Wenn ja, klick auf: Jetzt höre ich sie.");
  });

  $("tonGehtDoch").addEventListener("click", () => {
    $("tonFenster").close();
    zustand.tonAn = true;
    tonKnopfAnzeigen(true);
  });

  $("tonGehtNicht").addEventListener("click", () => {
    $("tonFenster").close();
    tonUmschalten(false);
    beitragFiona(TON_HINWEIS.schriftlich);
  });

  $("datenschutzLink").addEventListener("click", (e) => {
    e.preventDefault();
    $("datenschutzFenster").showModal();
  });

  window.addEventListener("beforeunload", (e) => {
    if (zustand.gestartet && !zustand.fertig && zustand.reihenfolge.length > 0) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  if ("speechSynthesis" in window) {
    stimmenLaden();
    window.speechSynthesis.onvoiceschanged = stimmenLaden;
  }

  startseiteAufbauen();
  vorbereitungAufbauen();

  // Kann der Browser keine Spracheingabe, kommt der Hinweis sofort.
  if (!ErkennungsKlasse) browserSperreZeigen();
})();
