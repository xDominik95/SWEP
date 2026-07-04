SWD - dodatkowe koszty funkcjonariuszy

Dodane:
- zakładka Koszty,
- formularz: data, marka/model pojazdu, numer rejestracyjny, kwota, opis,
- funkcjonariusz wysyła koszt do rozpatrzenia,
- dowódca/zastępca/admin akceptuje albo odrzuca,
- po akceptacji kwota dopisuje się do wypłaty funkcjonariusza jako wpis w tabeli sluzby z 0 godzin i kwotą kosztu.

Najpierw uruchom SQL:
sql/swd-koszty.sql

Podmień:
- index.html
- style.css

Dodaj:
- js/costs.js

Nie podmieniaj:
- js/app.js
- js/hours.js
- js/vehicles.js
- js/documents.js
- js/config.js


Kontrola składni costs.js:
OK