SWD v4.1 - Stan służby + karty funkcjonariuszy

Dodane/poprawione:
- stan służby liczy osoby na służbie poprawnie: zakonczenie IS NULL,
- automatyczne odświeżanie co 15 sekund,
- lista osób na służbie z czasem trwania,
- nowa zakładka: Karty funkcjonariuszy,
- karta pokazuje:
  imię i nazwisko,
  stopień,
  numer służbowy,
  data przyjęcia,
  numer konta bankowego,
  login,
  rola,
  status: Urlop / W służbie / Poza służbą,
- dowódca/zastępca/admin może edytować datę przyjęcia i numer konta.

Najpierw uruchom SQL:
sql/swd-v4-1-karty-funkcjonariuszy.sql

Podmień:
- index.html
- style.css
- js/duty-status.js

Dodaj:
- js/officer-cards.js


Kontrola składni:
duty-status.js: OK
officer-cards.js: OK