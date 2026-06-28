# SWEP - System Wewnętrznej Ewidencji Policji

## Co zawiera pierwsza wersja
- Logowanie przez Supabase Auth.
- Role: admin, dowodca, funkcjonariusz.
- Karty pojazdów według Twojej tabelki.
- Dokumenty przesyłane do dowódcy.
- Panel dowódcy z możliwością oznaczenia dokumentu jako sprawdzone / do poprawy.
- Eksport aktualnego dokumentu do PDF.

## Co musisz ustawić
1. Otwórz `js/config.js`.
2. Wklej swój publishable key w miejsce:
   `TU_WKLEJ_PUBLISHABLE_KEY`
3. URL zostaw bez `/rest/v1/`.

## Tabele w Supabase
Muszą istnieć:
- `karty_pojazdow`
- `dokumenty`
- `profile`

## Jak nadać rolę dowódcy
W Supabase wejdź w Table Editor → `profile`.
W kolumnie `rola` wpisz:
- `dowodca`
albo
- `admin`

## Jak dodać użytkownika
Supabase → Authentication → Users → Add user.
Potem zaloguj się na konto, żeby profil utworzył się automatycznie.
Następnie uzupełnij dane w tabeli `profile`.
