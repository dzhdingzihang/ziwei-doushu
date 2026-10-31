# Annual and monthly report implementation

The result page preserves three views: annual reports, monthly reports and the full Ziwei chart.

- Annual selector: birth lunar year through 2099, with a ten-year overview starting from the current year.
- Monthly ranges: current calendar year, next calendar year, last 12 months including this month, next 12 months starting next month.
- Every period includes wealth, career, health, family and relationships, with interpretation, focus and calculation evidence.
- Annual boundaries follow Lunar New Year. Gregorian months are split on lunar month/year and leap-month half boundaries. Every day is covered exactly once; no single-day snapshot is presented as a whole-month result.
- Period positions and transformations come from the installed iztro horoscope API. Decadal context is selected for the queried lunar year using the upstream engine, not the current real-world decade.
- The text is a limited original cultural ruleset. It does not contain the upstream private interpretation library or claim scientific predictions. Health content does not infer diseases or medical outcomes.

Reference: https://docs.iztro.com/posts/horoscope

Verification: five dimensions, different years and birthdays, exact full-month coverage, Lunar New Year, leap day, leap lunar month, rolling windows, empty pre-birth months and report export.
