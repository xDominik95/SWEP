SWD 2.1 - PEŁNA WERSJA

Ta paczka scala wszystkie dotychczasowe poprawki w jedną wersję.

Zawiera:
- logowanie PIN,
- tworzenie kont przez dowódcę/admina,
- sesję po odświeżeniu strony,
- edycję funkcjonariuszy,
- stopnie i stawki,
- godziny służby i wypłaty,
- reset godzin od ostatniej wypłaty,
- pojazdy i karty pojazdów,
- dokumenty z podpisami,
- checkboxy zamiast nawiasów,
- poprawione pokwitowanie PZD,
- jeden pełny plik SQL.

INSTALACJA:
1. Uruchom w Supabase:
   sql/swd-2-1-full.sql

2. W js/config.js wpisz swoje dane Supabase:
   SUPABASE_URL
   SUPABASE_KEY

3. Podmień CAŁĄ zawartość repozytorium plikami z tej paczki.

4. Commit -> Push -> Cloudflare Deploy

5. Na stronie użyj Ctrl + F5.

Od tej wersji kolejne poprawki powinny być robione na SWD 2.1, żeby nic już nie znikało.
