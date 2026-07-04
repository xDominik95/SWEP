SWD - koszty: auto-uzupełnianie pojazdu

Zmiany:
- w formularzu kosztów numer rejestracyjny jest listą wyboru z tabeli pojazdy,
- po wyborze rejestracji system sam uzupełnia markę i model,
- pokazuje też kryptonim, przebieg i paliwo,
- funkcjonariusz wpisuje tylko datę, pojazd z listy, kwotę i opis.

Najpierw uruchom SQL:
sql/swd-koszty-auto-pojazd.sql

Podmień:
- index.html
- style.css
- js/costs.js

Nie podmieniaj:
- js/app.js
- js/hours.js
- js/vehicles.js
- js/documents.js
- js/config.js


Kontrola składni costs.js:
OK