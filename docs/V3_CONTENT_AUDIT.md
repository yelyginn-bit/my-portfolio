# V3 content audit

## Sources

- `ссылки на работы.docx`: 89 unique Kinescope embeds.
- `транскрибация с описанием проекта.docx`: role, responsibility and equipment evidence.
- Render QA: source documents rendered to 18 and 40 pages respectively; text extraction preserved paragraph order.

## Checksum

| Metric | Result |
|---|---:|
| Canonical videos | 89 |
| Unique IDs | 89 |
| Landscape | 75 |
| Portrait | 14 |
| Public projects | 32 |

The first raw-XML scan returned 86 because three URLs were split across Word runs. DOCX paragraph parsing recovered the three split values and exactly matched the independent 89 / 75 / 14 control.

## Decisions applied

- The source-confirmed `Шоурил для сайта` asset is the hero candidate: `hCJmSvmN6S7P8uAnexguQ5`.
- Project and video are separate records; HOFF and Caprigo series are grouped instead of duplicated as near-identical cases.
- Roles are assigned at project level only where the transcript confirms them.
- Generic contribution fallback text is absent from the V3 UI.
- Confirmed brand signal: СберУниверситет, СИБУР, HOFF, Caprigo, KORONA, Cartier, Yango. Copy says work “выходили для”, not “мои клиенты”.
- Photo, fake metrics and unsupported availability claims are not published.
