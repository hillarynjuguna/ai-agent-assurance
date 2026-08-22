import argparse
import re
from pathlib import Path


DEFAULT_SOURCE = Path(r"C:\Users\jacef\Downloads\Governability-Diagnostic-Protocol-v6.1.html")
DEFAULT_TARGET = Path(__file__).with_name("Governability-Diagnostic-Protocol.html")


STALE_WARNING_HTML = """    <div class="stale-warning" id="stale-warning">
        This assessment has exceeded its validity period. Re-assessment is required before institutional reliance.
    </div>"""

VALID_UNTIL_HTML = """        <div class="input-group" style="margin-bottom: 0; margin-top: 15px;">
            <label for="meta-valid">Valid Until (Temporal Expiration)</label>
            <input type="date" id="meta-valid" onchange="onMetaChange(); checkStale();">
        </div>"""


def replace_script(target_html: str, source_html: str) -> str:
    script_match = re.search(r"<script>(.*?)</script>", source_html, re.DOTALL)
    if not script_match:
        raise ValueError("Source HTML does not contain a <script> block.")

    script = script_match.group(1)
    script = script.replace(
        "const tagsHtml = d.regulatoryTags.map(t => '<span class=\"reg-tag\">' + t + '</span>').join('');",
        "const tagsHtml = d.regulatoryTags ? '<div class=\"dim-tags\">' + d.regulatoryTags.join(' | ') + '</div>' : '';",
    )
    script = fix_js_merge_artifacts(script)
    return re.sub(r"<script>.*?</script>", lambda _: f"<script>{script}</script>", target_html, flags=re.DOTALL)


def fix_js_merge_artifacts(script: str) -> str:
    replacements = {
        "', 'cap', '": "', \\'cap\\', '",
        "', 'evid', '": "', \\'evid\\', '",
        'critNote = "\n\nCRITICALITY': 'critNote = "\\n\\nCRITICALITY',
        'disclaimerNote = "\n\nASSESSMENT': 'disclaimerNote = "\\n\\nASSESSMENT',
        'opacityNote = "\n\nOPACITY': 'opacityNote = "\\n\\nOPACITY',
        '+ "\n\n";': '+ "\\n\\n";',
        'occur:\n";': 'occur:\\n";',
        '+ "\n";': '+ "\\n";',
    }
    for old, new in replacements.items():
        script = script.replace(old, new)
    return script


def remove_duplicate_blocks(html: str) -> str:
    html = re.sub(
        r'\s*<div class="stale-warning" id="stale-warning">\s*This assessment has exceeded its validity period\. Re-assessment is required before institutional reliance\.\s*</div>',
        "",
        html,
    )
    html = html.replace("</header>", f"</header>\n{STALE_WARNING_HTML}", 1)

    html = re.sub(
        r'\s*<div class="input-group" style="margin-bottom: 0; margin-top: 15px;">\s*<label for="meta-valid">Valid Until \(Temporal Expiration\)</label>\s*<input type="date" id="meta-valid"[^>]*>\s*</div>',
        "",
        html,
    )
    html = re.sub(r"(<div class=\"metadata-section\">.*?</div>\s*)</div>", rf"\1{VALID_UNTIL_HTML}\n    </div>", html, count=1, flags=re.DOTALL)

    html = re.sub(r"<form id=\"diagnostic-form\">.*?</form>", '<form id="diagnostic-form"></form>', html, count=1, flags=re.DOTALL)
    html = re.sub(r'(<form id="diagnostic-form"></form>)(?:\s*<form id="diagnostic-form"></form>)+', r"\1", html)
    return html


def merge(source: Path, target: Path) -> None:
    source_html = source.read_text(encoding="utf-8")
    target_html = target.read_text(encoding="utf-8")
    merged = remove_duplicate_blocks(target_html)
    merged = replace_script(merged, source_html)
    target.write_text(merged, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Merge v6.1 protocol JavaScript into the local governability diagnostic HTML.")
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--target", type=Path, default=DEFAULT_TARGET)
    args = parser.parse_args()

    if not args.source.exists():
        raise FileNotFoundError(f"Source file not found: {args.source}")
    if not args.target.exists():
        raise FileNotFoundError(f"Target file not found: {args.target}")

    merge(args.source, args.target)
    print(f"Merged {args.source} into {args.target}")


if __name__ == "__main__":
    main()
