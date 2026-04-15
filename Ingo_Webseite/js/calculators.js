(function () {
    'use strict';

    function euro(value) {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
    }

    function setResult(id, text) {
        var el = document.getElementById(id);
        if (el) {
            el.textContent = text;
            el.style.whiteSpace = 'pre-line';
        }
    }

    function setResultHtml(id, html) {
        var el = document.getElementById(id);
        if (el) {
            el.innerHTML = html;
            el.style.whiteSpace = 'normal';
        }
    }

    function debounce(fn, delay) {
        var timer = null;
        return function () {
            var args = arguments;
            var ctx = this;
            clearTimeout(timer);
            timer = setTimeout(function () {
                fn.apply(ctx, args);
            }, delay);
        };
    }

    function initAddressAutocomplete(inputId, suggestionsId) {
        var addressInput = document.getElementById(inputId);
        var addressSuggestions = document.getElementById(suggestionsId);
        if (!addressInput || !addressSuggestions) return;

        function hideSuggestions() {
            addressSuggestions.hidden = true;
            addressSuggestions.innerHTML = '';
        }

        var updateAddressSuggestions = debounce(async function () {
            var q = (addressInput.value || '').trim();
            if (q.length < 4) {
                hideSuggestions();
                return;
            }

            try {
                var url = 'https://nominatim.openstreetmap.org/search?format=json&limit=6&addressdetails=1&countrycodes=de&q=' + encodeURIComponent(q);
                var res = await fetch(url);
                var data = await res.json();
                addressSuggestions.innerHTML = '';

                if (!data.length) {
                    hideSuggestions();
                    return;
                }

                for (var i = 0; i < data.length; i++) {
                    var item = document.createElement('div');
                    item.className = 'address-suggestion-item';
                    item.textContent = data[i].display_name;
                    item.setAttribute('data-value', data[i].display_name);
                    item.addEventListener('click', function () {
                        addressInput.value = this.getAttribute('data-value');
                        hideSuggestions();
                    });
                    addressSuggestions.appendChild(item);
                }
                addressSuggestions.hidden = false;
            } catch (err) {
                hideSuggestions();
            }
        }, 300);

        addressInput.addEventListener('input', updateAddressSuggestions);
        addressInput.addEventListener('focus', updateAddressSuggestions);
        document.addEventListener('click', function (evt) {
            if (!addressSuggestions.contains(evt.target) && evt.target !== addressInput) {
                hideSuggestions();
            }
        });
    }

    initAddressAutocomplete('kundenadresse', 'kundenadresse-suggestions');
    initAddressAutocomplete('standortadresse', 'standortadresse-suggestions');
    initAddressAutocomplete('wartung-adresse', 'wartung-adresse-suggestions');

    var calc = document.getElementById('calc-isfp');
    if (calc) {
        calc.addEventListener('submit', async function (e) {
            e.preventDefault();
            var area = parseFloat(document.getElementById('wohnflaeche').value || '0');
            var customerAddress = (document.getElementById('kundenadresse').value || '').trim();
            var officeAddress = 'Am Stichkanal 53 A, 14167 Berlin';

            if (!customerAddress || area <= 0) {
                setResult('calc-isfp-output', 'Bitte Wohnfläche und Adresse korrekt eingeben.');
                return;
            }

            try {
                setResult('calc-isfp-output', 'Adresse wird geprüft und Entfernung berechnet...');

                var customerGeoUrl = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(customerAddress);
                var officeGeoUrl = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(officeAddress);

                var geoResponses = await Promise.all([fetch(customerGeoUrl), fetch(officeGeoUrl)]);
                var customerData = await geoResponses[0].json();
                var officeData = await geoResponses[1].json();

                if (!customerData.length || !officeData.length) {
                    setResult('calc-isfp-output', 'Adresse konnte nicht eindeutig gefunden werden. Bitte vollständige Adresse mit Ort angeben.');
                    return;
                }

                var cLat = parseFloat(customerData[0].lat);
                var cLon = parseFloat(customerData[0].lon);
                var oLat = parseFloat(officeData[0].lat);
                var oLon = parseFloat(officeData[0].lon);

                var routeUrl = 'https://router.project-osrm.org/route/v1/driving/' + oLon + ',' + oLat + ';' + cLon + ',' + cLat + '?overview=false';
                var routeRes = await fetch(routeUrl);
                var routeData = await routeRes.json();

                if (!routeData.routes || !routeData.routes.length) {
                    setResult('calc-isfp-output', 'Entfernung konnte nicht berechnet werden. Bitte Adresse prüfen.');
                    return;
                }

                var kmOneWay = routeData.routes[0].distance / 1000;
                var kmRounded = Math.round(kmOneWay * 10) / 10;
                var areaCost = area * 4;
                var travelCost = kmRounded * 2.5;
                var totalCost = areaCost + travelCost;

                var text = 'Überschlägige Kosten: ' + euro(totalCost);
                setResult('calc-isfp-output', text);
            } catch (err) {
                setResult('calc-isfp-output', 'Entfernung konnte aktuell nicht automatisch berechnet werden. Bitte später erneut versuchen.');
            }
        });
    }

    var wartungFahrt = document.getElementById('calc-wartung-fahrt');
    if (wartungFahrt) {
        wartungFahrt.addEventListener('submit', async function (e) {
            e.preventDefault();
            var basePriceMin = 300;
            var basePriceMax = 500;
            var area = parseFloat(document.getElementById('wartung-wohnflaeche').value || '0');
            var customerAddress = (document.getElementById('wartung-adresse').value || '').trim();
            var officeAddress = 'Am Stichkanal 53 A, 14167 Berlin';

            if (!customerAddress || area <= 0) {
                setResult('calc-wartung-fahrt-output', 'Bitte Wohnfläche und Adresse korrekt eingeben.');
                return;
            }

            try {
                setResult('calc-wartung-fahrt-output', 'Adresse wird geprüft und Entfernung berechnet...');

                var customerGeoUrl = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(customerAddress);
                var officeGeoUrl = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(officeAddress);

                var geoResponses = await Promise.all([fetch(customerGeoUrl), fetch(officeGeoUrl)]);
                var customerData = await geoResponses[0].json();
                var officeData = await geoResponses[1].json();

                if (!customerData.length || !officeData.length) {
                    setResult('calc-wartung-fahrt-output', 'Adresse konnte nicht eindeutig gefunden werden. Bitte vollständige Adresse mit Ort angeben.');
                    return;
                }

                var cLat = parseFloat(customerData[0].lat);
                var cLon = parseFloat(customerData[0].lon);
                var oLat = parseFloat(officeData[0].lat);
                var oLon = parseFloat(officeData[0].lon);

                var routeUrl = 'https://router.project-osrm.org/route/v1/driving/' + oLon + ',' + oLat + ';' + cLon + ',' + cLat + '?overview=false';
                var routeRes = await fetch(routeUrl);
                var routeData = await routeRes.json();

                if (!routeData.routes || !routeData.routes.length) {
                    setResult('calc-wartung-fahrt-output', 'Entfernung konnte nicht berechnet werden. Bitte Adresse prüfen.');
                    return;
                }

                var kmOneWay = routeData.routes[0].distance / 1000;
                var kmRounded = Math.round(kmOneWay * 10) / 10;
                var bestandsaufnahme = area * 4;
                var anfahrt = kmRounded * 2.5;
                var totalCostMin = basePriceMin + bestandsaufnahme + anfahrt;

                var text = 'Kostenaufstellung:\n'
                    + '- Grundpreis: ab ' + euro(basePriceMin) + '\n'
                    + '- Bestandsaufnahme: ' + euro(bestandsaufnahme) + '\n'
                    + '- Anfahrt: ' + euro(anfahrt) + '\n'
                    + '- Gesamtkosten: ab ' + euro(totalCostMin);
                setResult('calc-wartung-fahrt-output', text);
            } catch (err) {
                setResult('calc-wartung-fahrt-output', 'Entfernung konnte aktuell nicht automatisch berechnet werden. Bitte später erneut versuchen.');
            }
        });
    }

    var pv = document.getElementById('calc-pv');
    if (pv) {
        var PV_DEFAULTS = {
            electricityPrice: 0.372, // EUR/kWh (BDEW Durchschnitt Haushalt 2026)
            feedInTariff: 0.0778, // EUR/kWh (Teileinspeisung bis 10 kWp, BNetzA 2026)
            flatRoofKwpPerM2: 0.20,
            pitchedRoofKwpPerM2: 0.225,
            specificYieldDefault: 980,
            investmentPerKwp: 1500,
            batteryCostPerKwh: 600
        };

        var consumptionType = document.getElementById('verbrauchstyp');
        var kwhWrap = document.getElementById('verbrauch-kwh-wrap');
        var peopleWrap = document.getElementById('verbrauch-personen-wrap');
        var batteryEnabled = document.getElementById('pv-battery-enabled');
        var batteryWrap = document.getElementById('pv-battery-wrap');

        function togglePvConsumptionInput() {
            var type = consumptionType ? consumptionType.value : 'kwh';
            if (kwhWrap) kwhWrap.hidden = type !== 'kwh';
            if (peopleWrap) peopleWrap.hidden = type !== 'personen';
        }

        function toggleBatteryInput() {
            if (batteryWrap && batteryEnabled) {
                batteryWrap.hidden = batteryEnabled.value !== 'ja';
            }
        }

        function getConsumptionFromPeople(personCount) {
            var people = Math.max(1, Math.min(5, personCount));
            return 1800 + (people - 1) * 700;
        }

        function getOrientationFactor(orientation) {
            if (orientation === 'Süd') return 1.0;
            if (orientation === 'Ost/West') return 0.85;
            return 0.6;
        }

        function getPitchFactor(pitch) {
            if (pitch < 15) return 0.95;
            if (pitch > 45) return 0.9;
            return 1.0;
        }

        function getSpecificYieldByLat(lat) {
            // Vereinfachte Deutschland-Interpolation: Süden ~1100, Norden ~900 kWh/kWp*a
            var minLat = 47;
            var maxLat = 55;
            var clamped = Math.min(maxLat, Math.max(minLat, lat));
            var ratio = (clamped - minLat) / (maxLat - minLat);
            return Math.round(1100 - ratio * 200);
        }

        async function resolveSpecificYield(addressValue) {
            var address = (addressValue || '').trim();
            if (address.length >= 6) {
                try {
                    var geoUrl = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&countrycodes=de&q=' + encodeURIComponent(address);
                    var geoRes = await fetch(geoUrl, {
                        headers: { 'Accept-Language': 'de' }
                    });
                    var geoData = await geoRes.json();
                    if (geoData && geoData.length) {
                        var lat = parseFloat(geoData[0].lat);
                        var geocodedPlz = geoData[0].address && geoData[0].address.postcode
                            ? String(geoData[0].address.postcode)
                            : '';
                        if (!Number.isNaN(lat)) {
                            return {
                                specificYield: getSpecificYieldByLat(lat),
                                source: 'Adresse',
                                resolvedPlz: geocodedPlz
                            };
                        }
                    }
                } catch (error) {
                    // Fallback auf PLZ/Default
                }
            }

            return {
                specificYield: PV_DEFAULTS.specificYieldDefault,
                source: 'Deutschland-Mittel',
                resolvedPlz: ''
            };
        }

        if (consumptionType) {
            consumptionType.addEventListener('change', togglePvConsumptionInput);
            togglePvConsumptionInput();
        }
        if (batteryEnabled) {
            batteryEnabled.addEventListener('change', toggleBatteryInput);
            toggleBatteryInput();
        }

        var pvResultEl = document.getElementById('calc-pv-result');
        if (pvResultEl) {
            pvResultEl.addEventListener('click', function (event) {
                var target = event.target;
                if (target && target.id === 'calc-pv-reset') {
                    event.preventDefault();
                    pv.reset();
                    togglePvConsumptionInput();
                    toggleBatteryInput();
                    setResultHtml('calc-pv-result', '');
                    var roofInput = document.getElementById('dachflaeche');
                    if (roofInput) roofInput.focus();
                }
            });
        }

        pv.addEventListener('submit', async function (e) {
            e.preventDefault();

            var roof = parseFloat(document.getElementById('dachflaeche').value || '0');
            var orientation = document.getElementById('orientation').value || 'Süd';
            var pitch = parseFloat(document.getElementById('dachneigung').value || '30');
            var roofType = document.getElementById('dachform').value || 'Schrägdach';
            var addressValue = document.getElementById('standortadresse') ? document.getElementById('standortadresse').value : '';
            var hasBattery = batteryEnabled ? batteryEnabled.value === 'ja' : false;
            var batterySize = hasBattery ? parseFloat(document.getElementById('pv-battery-size').value || '0') : 0;
            var type = consumptionType ? consumptionType.value : 'kwh';
            var usage = 0;

            if (roof <= 0) {
                setResult('calc-pv-result', 'Bitte eine gültige Dachfläche eingeben.');
                return;
            }

            if (type === 'personen') {
                var persons = parseInt(document.getElementById('personen').value || '1', 10);
                usage = getConsumptionFromPeople(persons);
            } else {
                usage = parseFloat(document.getElementById('stromverbrauch').value || '0');
                if (usage <= 0) {
                    setResult('calc-pv-result', 'Bitte einen gültigen Stromverbrauch angeben.');
                    return;
                }
            }

            if (pitch < 0 || pitch > 90) {
                setResult('calc-pv-result', 'Bitte eine Dachneigung zwischen 0 und 90 Grad eingeben.');
                return;
            }

            var weightedArea = roof * getOrientationFactor(orientation) * getPitchFactor(pitch);
            var kwpPerM2 = roofType === 'Flachdach' ? PV_DEFAULTS.flatRoofKwpPerM2 : PV_DEFAULTS.pitchedRoofKwpPerM2;
            var systemSize = Math.max(0, weightedArea * kwpPerM2);
            setResult('calc-pv-result', 'Standort wird geprüft und Ergebnis berechnet...');
            var yieldData = await resolveSpecificYield(addressValue);
            var specificYield = yieldData.specificYield;
            var annualYield = systemSize * specificYield;
            var autarkieRate = 0.30;
            if (hasBattery) {
                if (batterySize <= 5) autarkieRate = 0.60;
                else if (batterySize <= 10) autarkieRate = 0.70;
                else autarkieRate = 0.75;
            }
            var selfConsumptionKwh = Math.min(usage * autarkieRate, annualYield);
            var feedInKwh = Math.max(0, annualYield - selfConsumptionKwh);
            var feedInRevenue = feedInKwh * PV_DEFAULTS.feedInTariff;
            var investmentBase = systemSize * PV_DEFAULTS.investmentPerKwp;
            var batteryCost = hasBattery ? batterySize * PV_DEFAULTS.batteryCostPerKwh : 0;
            var costsEstimated = investmentBase + batteryCost;
            var selfConsumptionSavings = selfConsumptionKwh * PV_DEFAULTS.electricityPrice;
            var yearlySavings = feedInRevenue + selfConsumptionSavings;
            var paybackYears = yearlySavings > 0 ? Math.round(costsEstimated / yearlySavings) : 0;
            var autarkie = usage > 0 ? Math.min(100, Math.round((selfConsumptionKwh / usage) * 100)) : 0;

            var cards = ''
                + '<div class="pv-result">'
                + '  <h4 class="pv-result__title">Ihre PV-Erstorientierung</h4>'
                + '  <div class="pv-result__grid">'
                + '    <div class="pv-result__item"><span>Anlagengröße</span><strong>' + systemSize.toFixed(1) + ' kWp</strong></div>'
                + '    <div class="pv-result__item"><span>Jahresertrag</span><strong>' + Math.round(annualYield) + ' kWh</strong></div>'
                + '    <div class="pv-result__item"><span>Investition PV</span><strong>' + euro(Math.round(investmentBase)) + '</strong></div>'
                + '    <div class="pv-result__item"><span>Speicherkosten</span><strong>' + euro(Math.round(batteryCost)) + '</strong></div>'
                + '    <div class="pv-result__item"><span>Investition gesamt</span><strong>' + euro(Math.round(costsEstimated)) + '</strong></div>'
                + '    <div class="pv-result__item"><span>Ersparnis/Jahr</span><strong>' + euro(Math.round(yearlySavings)) + '</strong></div>'
                + '    <div class="pv-result__item"><span>Eigenversorgung</span><strong>' + autarkie + '%</strong></div>'
                + '    <div class="pv-result__item"><span>Amortisation</span><strong>' + paybackYears + ' Jahre</strong></div>'
                + '  </div>'
                + '  <p class="pv-result__hint">Standortbasis: ' + yieldData.source + (yieldData.resolvedPlz ? ' (' + yieldData.resolvedPlz + ')' : '') + '. Grobe Orientierung; exakte Werte per Detailplanung.</p>'
                + '  <div class="pv-result__actions"><button type="button" id="calc-pv-reset" class="btn btn--primary">Neu berechnen</button></div>'
                + '</div>';
            setResultHtml('calc-pv-result', cards);
        });
    }

    var finance = document.getElementById('calc-finance');
    if (finance) {
        finance.addEventListener('submit', function (e) {
            e.preventDefault();
            var eigentuemer = document.getElementById('eigentuemer').value;
            var vorhaben = document.getElementById('vorhaben').value;
            var budget = parseFloat(document.getElementById('budget').value || '0');
            var line1 = 'Empfohlene Förderroute:';
            var line2 = 'Bitte individuelle Förderprüfung für BAFA/KfW starten.';
            var line3 = '';
            var line4 = '';

            if (vorhaben === 'wp') {
                line2 = 'Primär BAFA-Zuschuss für Heizungstausch prüfen, KfW für Finanzierung ergänzen.';
                line3 = 'Zusatznutzen: Mit iSFP kann bei Einzelmaßnahmen ein Bonus möglich sein.';
            } else if (vorhaben === 'sanierung') {
                line2 = 'KfW-Kreditroute für Gesamtsanierung priorisieren, BAFA für geeignete Einzelmaßnahmen ergänzen.';
                line3 = 'Empfehlung: Maßnahmenreihenfolge über iSFP absichern.';
            } else if (vorhaben === 'pv') {
                line2 = 'Für PV vorrangig passende Kredit-/Finanzierungsbausteine und regionale Programme prüfen.';
                line3 = 'Bei Kombination mit Wärmepumpe Gesamtkonzept (PV + WP) betrachten.';
            }

            if (budget > 0) {
                var ownFunds = budget * 0.2;
                var financePart = budget * 0.8;
                line4 = 'Budgetsplit (Orientierung): Eigenmittel ca. ' + euro(ownFunds) + ', Finanzierung ca. ' + euro(financePart) + '.';
            }

            var text = line1 + '\n' + line2;
            if (line3) text += '\n' + line3;
            if (eigentuemer === 'nein') text += '\nHinweis: Viele Programme setzen Eigentum oder Vollmacht voraus.';
            if (line4) text += '\n' + line4;
            setResult('calc-finance-result', text);
        });
    }

    var begLocal = document.getElementById('calc-beg-local');
    if (begLocal) {
        begLocal.addEventListener('submit', function (e) {
            e.preventDefault();
            var art = document.getElementById('beg-gebaeudeart').value;
            var foerder = document.getElementById('beg-foerderart').value;
            var massnahme = document.getElementById('beg-massnahme').value;
            var effizienz = document.getElementById('beg-effizienz').value;
            var zweck = document.getElementById('beg-zweck').value;
            var vorhabenart = document.getElementById('beg-vorhabenart').value;
            var betrag = parseFloat(document.getElementById('beg-betrag').value || '0');
            var eigenmittel = parseFloat(document.getElementById('beg-eigenmittel').value || '0');
            var laufzeitJahre = parseFloat(document.getElementById('beg-laufzeit').value || '10');
            var zins = parseFloat(document.getElementById('beg-zins').value || '3.5');

            if (betrag <= 0) {
                setResult('calc-beg-result', 'Bitte eine gültige Investitionssumme eintragen.');
                return;
            }

            var cap = massnahme === 'eh' ? 150000 : 60000;
            if (art === 'nichtwohn') cap = massnahme === 'eh' ? 200000 : 75000;
            var foerderfaehig = Math.min(betrag, cap);

            var quote = 0.1;
            if (foerder === 'zuschuss-kommune') quote = 0.2;
            if (massnahme === 'einzel') quote += 0.05;
            if (effizienz === 'eg40') quote += 0.05;
            if (effizienz === 'eg55') quote += 0.03;
            if (zweck === 'heizung') quote += 0.03;
            if (vorhabenart === 'bestand') quote += 0.02;

            var orientierungsbetrag = foerderfaehig * quote;
            var restNachFoerderung = Math.max(0, betrag - orientierungsbetrag);
            var kreditbedarf = Math.max(0, restNachFoerderung - Math.max(0, eigenmittel));

            var laufzeitMonate = Math.max(1, Math.round(laufzeitJahre * 12));
            var monatszins = Math.max(0, zins) / 100 / 12;
            var monatsrate = 0;
            if (kreditbedarf > 0) {
                if (monatszins === 0) {
                    monatsrate = kreditbedarf / laufzeitMonate;
                } else {
                    var faktor = Math.pow(1 + monatszins, laufzeitMonate);
                    monatsrate = kreditbedarf * ((monatszins * faktor) / (faktor - 1));
                }
            }

            var out = 'Orientierung (lokaler BEG-Rechner):\n'
                + '- Förderfähige Kosten (Schätzung): ' + euro(foerderfaehig) + '\n'
                + '- Möglicher Förder-/Tilgungsbetrag (Schätzung): ' + euro(orientierungsbetrag) + '\n'
                + '- Rest nach Förderung: ' + euro(restNachFoerderung) + '\n'
                + '- Kreditbedarf nach Eigenmitteln: ' + euro(kreditbedarf) + '\n'
                + '- Geschätzte Monatsrate: ' + euro(monatsrate) + '\n'
                + 'Hinweis: Endgültige Werte ergeben sich aus den offiziellen KfW/BAFA-Bedingungen.';
            setResult('calc-beg-result', out);
        });
    }

    var zinsLocal = document.getElementById('calc-zins-local');
    if (zinsLocal) {
        zinsLocal.addEventListener('submit', function (e) {
            e.preventDefault();
            var summe = parseFloat(document.getElementById('zins-summe').value || '0');
            var tilgung = parseFloat(document.getElementById('zins-tilgung').value || '0');
            var bindungJahre = parseFloat(document.getElementById('zins-bindung').value || '10');
            var nutzung = document.getElementById('zins-nutzung').value || 'eigen';

            if (summe <= 0 || tilgung <= 0) {
                document.getElementById('zins-sollzins').textContent = 'Bitte Eingaben prüfen';
                document.getElementById('zins-effektiv').textContent = '-';
                document.getElementById('zins-rate').textContent = '-';
                document.getElementById('zins-datum').textContent = '-';
                document.getElementById('zins-tilg-anteil').textContent = '0%';
                document.getElementById('zins-zins-anteil').textContent = '0%';
                document.getElementById('zins-restschuld').textContent = 'Restschuld: -';
                return;
            }

            var baseSollzins = 1.63; // Default 10 Jahre
            if (bindungJahre <= 5) {
                baseSollzins = summe >= 100000 ? 1.20 : 1.43;
            } else if (bindungJahre == 10) {
                baseSollzins = summe >= 100000 ? 1.59 : 1.63;
            } else if (bindungJahre == 15) {
                baseSollzins = summe >= 100000 ? 1.99 : 2.34;
            } else if (bindungJahre >= 20) {
                baseSollzins = summe >= 100000 ? 2.68 : 2.56;
            }

            var tilgungInt = Math.round(tilgung);
            var sollMod = 0;
            var effMod = 0.01;
            
            if (tilgungInt <= 1) { sollMod = 0.15; effMod = 0.17; }
            else if (tilgungInt === 2) { sollMod = 0.00; effMod = 0.01; }
            else if (tilgungInt === 3) { sollMod = -0.12; effMod = -0.10; }
            else if (tilgungInt === 4) { sollMod = -0.16; effMod = -0.14; }
            else if (tilgungInt >= 5) { sollMod = -0.20; effMod = -0.18; }

            var sollzins = baseSollzins + sollMod;
            var effektiv = baseSollzins + effMod;

            var annuitaetRate = (summe * ((sollzins + tilgung) / 100)) / 12;
            var konditionVom = new Date().toLocaleDateString('de-DE');

            document.getElementById('zins-sollzins').textContent = sollzins.toFixed(2) + ' %';
            document.getElementById('zins-effektiv').textContent = effektiv.toFixed(2) + ' %';
            document.getElementById('zins-rate').textContent = euro(Math.round(annuitaetRate));
            document.getElementById('zins-datum').textContent = konditionVom;
            
            var currentYear = new Date().getFullYear();
            
            var chartEl = document.getElementById('zins-chart');
            var sliderEl = document.getElementById('zins-year-slider');
            var minEl = document.getElementById('zins-slider-min');
            var maxEl = document.getElementById('zins-slider-max');
            var valEl = document.getElementById('zins-slider-val');
            var titleEl = document.getElementById('zins-chart-title');
            var subtitleEl = document.getElementById('zins-chart-subtitle');
            
            if (sliderEl) {
                sliderEl.min = 0;
                sliderEl.max = bindungJahre;
                sliderEl.value = bindungJahre;
                minEl.textContent = currentYear;
                maxEl.textContent = currentYear + bindungJahre;
                
                function updateSliderTooltip() {
                    var val = parseInt(sliderEl.value);
                    var pct = (sliderEl.max > 0) ? (val / sliderEl.max) : 0;
                    valEl.textContent = currentYear + val;
                    valEl.style.left = 'calc(' + (pct * 100) + '% + ' + (10 - pct * 20) + 'px)';
                    valEl.style.display = 'block';
                }
                
                sliderEl.oninput = function() {
                    updateSliderTooltip();
                    updateChartForYear(parseInt(sliderEl.value));
                };
                
                updateSliderTooltip();
            }

            function updateChartForYear(years) {
                var a = summe;
                var c = tilgung;
                var d = sollzins;
                var f = 0, e = 0, g = 0, h = 0;
                
                for (var k = 0; k <= years; k++) {
                    if (k === 0) {
                        f = c / 100 * a;
                        e = d / 100 * a;
                        g = f + e;
                        h = a - f;
                    } else {
                        e = d / 100 * h;
                        f = g - e;
                        h -= f;
                    }
                }

                if (titleEl) titleEl.textContent = 'Restschuld zum Periodenende: ' + euro(h);
                if (subtitleEl) subtitleEl.textContent = 'Jahresrate: ' + euro(g);

                if (chartEl && window.Chart) {
                    if (window.zinsChartInstance) {
                        window.zinsChartInstance.destroy();
                    }
                    
                    chartEl.innerHTML = '<canvas></canvas>';
                    var ctx = chartEl.querySelector('canvas').getContext('2d');
                    
                    window.zinsChartInstance = new Chart(ctx, {
                        type: 'pie',
                        data: {
                            labels: ['Tilgung: ' + euro(Math.round(f)), 'Zinsen: ' + euro(Math.round(e))],
                            datasets: [{
                                data: [f, e],
                                backgroundColor: ['#f4e2b0', '#f0c24f'],
                                borderWidth: 1,
                                borderColor: '#ffffff'
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            layout: {
                                padding: {
                                    top: 10,
                                    bottom: 10
                                }
                            },
                            plugins: {
                                legend: {
                                    position: 'left',
                                    align: 'center',
                                    labels: {
                                        font: { family: 'Inter', size: 13 },
                                        color: '#2a3b4c',
                                        boxWidth: 12,
                                        padding: 20
                                    }
                                },
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            var value = context.raw;
                                            return ' ' + euro(Math.round(value));
                                        }
                                    }
                                }
                            }
                        }
                    });
                    
                    chartEl.style.height = '250px';
                }
            }

            updateChartForYear(Math.max(1, bindungJahre));
        });
    }

    var laws = document.getElementById('calc-laws');
    if (laws) {
        laws.addEventListener('submit', function (e) {
            e.preventDefault();
            var building = document.getElementById('gebaeudeart').value;
            var year = parseInt(document.getElementById('baujahr').value || '0', 10);
            var text = 'Rechts-/Planungs-Orientierung:\nRelevante Themen sind GEG-Vorgaben, kommunale Wärmeplanung und Förderbedingungen.';
            if (building === 'bestand') text += '\nIm Bestand ist meist ein technischer Nachweis inkl. Heizlast sinnvoll.';
            if (year > 0 && year < 1995) text += '\nBei älteren Gebäuden sind Hüllenanalyse und Vorlauftemperatur-Prüfung besonders wichtig.';
            setResult('calc-laws-result', text);
        });
    }
})();
