SWD 2.2 - stabilna poprawka

Ta wersja bazuje na działającym SWD 2.1 i dodaje:
- automatyczną numerację dokumentów,
- własny podpis funkcjonariusza,
- poprawione logowanie bez błędu JavaScript.

Najpierw uruchom SQL:
sql/swd-2-2-stabilna-numeracja-podpis.sql

Podmień:
- index.html
- style.css
- js/app.js
- js/documents.js

Nie podmieniaj:
- js/config.js
- js/vehicles.js
- js/hours.js

Kontrola składni:
app.js: OK
documents.js: OK
