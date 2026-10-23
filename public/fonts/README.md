# Bundled fonts

Literata and Nunito Sans are self-hosted from Google Fonts. Both families include
the normal-style variable weight range 200–900, in Latin and Latin Extended
WOFF2 subsets. Keep both subsets available: Turkish ĞğİŞş uses Latin Extended;
ÇçÖöÜüı uses Latin.

Downloaded 2026-10-23 using the official Google Fonts CSS API:

https://fonts.googleapis.com/css2?family=Literata:wght@200..900&family=Nunito+Sans:wght@200..900&display=swap

The exact source URLs, declared weight ranges, and Unicode ranges are preserved
in `google-fonts-source.txt`. The CSS response contains additional language
subsets that are not bundled here. The four bundled WOFF2 files came directly
from `fonts.gstatic.com`.

Licenses were fetched from the official Google Fonts repository:

- https://github.com/google/fonts/blob/main/ofl/literata/OFL.txt
- https://github.com/google/fonts/blob/main/ofl/nunitosans/OFL.txt

Validation: all four files have the WOFF2 signature. Decompressing their table
streams and reading the actual cmap character mappings verified that each
family's bundled subsets cover `ŞşĞğİıÇçÖöÜü`.
