"""Create the report with Python and reportlab: python reports/create-performance-report.py.

Uses the recorded Pi measurements; no network access or live application changes.
"""

import json
from pathlib import Path

from reportlab.graphics import renderPDF
from reportlab.graphics.charts.barcharts import HorizontalBarChart
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Table, TableStyle

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "reports/performance-2026-10-16-measurements.json").read_text())
OUTPUT = ROOT / "output/pdf/quiet-news-performance-report.pdf"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
WIDTH, HEIGHT = A4
MARGIN = 44
BODY_WIDTH = WIDTH - MARGIN * 2
GREEN = colors.HexColor("#236153")
INK = colors.HexColor("#20362F")
MUTED = colors.HexColor("#596B62")
WASH = colors.HexColor("#E9EFE8")
PAPER = colors.HexColor("#F5F3EE")
LINE = colors.HexColor("#D5DED5")
OLD = colors.HexColor("#8B9990")
WHITE = colors.white


def load_fonts():
    candidates = [
        (Path("/System/Library/Fonts/Supplemental"), "Arial.ttf", "Arial Bold.ttf", "Georgia.ttf", "Georgia Bold.ttf"),
        (Path("/usr/share/fonts/truetype/dejavu"), "DejaVuSans.ttf", "DejaVuSans-Bold.ttf", "DejaVuSerif.ttf", "DejaVuSerif-Bold.ttf"),
    ]
    for directory, *files in candidates:
        if all((directory / filename).exists() for filename in files):
            for name, filename in zip(["Body", "BodyBold", "Display", "DisplayBold"], files):
                pdfmetrics.registerFont(TTFont(name, str(directory / filename)))
            pdfmetrics.registerFontFamily("Body", normal="Body", bold="BodyBold", italic="Body", boldItalic="BodyBold")
            return "Body", "BodyBold", "Display", "DisplayBold"
    return "Helvetica", "Helvetica-Bold", "Times-Roman", "Times-Bold"


FONT, BOLD, DISPLAY, DISPLAY_BOLD = load_fonts()
c = canvas.Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
c.setTitle("Quiet News - Performance gains and real-world impact")
c.setAuthor("Quiet News")
c.setSubject("Measured Raspberry Pi performance improvements, practical effects and benchmark limits")


def rect(x, top, width, height, fill, radius=0, stroke=None):
    c.setFillColor(fill)
    c.setStrokeColor(stroke or fill)
    if radius:
        c.roundRect(x, HEIGHT - top - height, width, height, radius, fill=1, stroke=bool(stroke))
    else:
        c.rect(x, HEIGHT - top - height, width, height, fill=1, stroke=bool(stroke))


def text(value, x, top, size=10, font=None, color=INK):
    c.setFillColor(color)
    c.setFont(font or FONT, size)
    c.drawString(x, HEIGHT - top - size, value)


def para(value, x, top, width=BODY_WIDTH, size=10.5, leading=15, font=None, color=INK, limit=778):
    style = ParagraphStyle("report", fontName=font or FONT, fontSize=size, leading=leading, textColor=color, alignment=TA_LEFT)
    item = Paragraph(value, style)
    _, height = item.wrap(width, HEIGHT)
    if top + height > limit:
        raise ValueError(f"Text exceeds its layout box: {top + height:.1f} > {limit}: {value[:80]}")
    item.drawOn(c, x, HEIGHT - top - height)
    return top + height


def begin_page(number, label):
    rect(MARGIN, 30, 30, 30, GREEN, radius=7)
    text("q.", MARGIN + 5, 30, size=24, font=DISPLAY_BOLD, color=PAPER)
    text("Quiet News", MARGIN + 42, 37, size=14, font=BOLD)
    c.setFillColor(MUTED)
    c.setFont(FONT, 8.5)
    c.drawRightString(WIDTH - MARGIN, HEIGHT - 48, "16 OCTOBER 2026  /  RASPBERRY PI")
    c.setStrokeColor(LINE)
    c.setLineWidth(0.6)
    c.line(MARGIN, 46, WIDTH - MARGIN, 46)
    text("QUIET NEWS  /  PERFORMANCE & PRACTICAL IMPACT", MARGIN, HEIGHT - 29, size=8, color=MUTED)
    c.setFont(FONT, 8)
    c.drawRightString(WIDTH - MARGIN, 21, f"{number} / 4")
    text(label, MARGIN, 86, size=8.5, font=BOLD, color=GREEN)


def metric(x, number, label):
    width = (BODY_WIDTH - 24) / 3
    rect(x, 279, width, 98, WASH, radius=9)
    text(number, x + 15, 291, size=30, font=DISPLAY_BOLD, color=GREEN)
    para(label, x + 15, 336, width - 30, size=9.5, leading=13, color=MUTED, limit=365)


def latency_chart():
    drawing = Drawing(BODY_WIDTH, 164)
    chart = HorizontalBarChart()
    chart.x = 80
    chart.y = 22
    chart.width = BODY_WIDTH - 110
    chart.height = 112
    # Categories run bottom-to-top in ReportLab's horizontal charts.
    chart.data = [
        (DATA["uncached"]["beforeMedianMs"], DATA["before"]["results"]["dashboard"]["medianMs"]),
        (DATA["uncached"]["afterMedianMs"], DATA["after"]["results"]["dashboard"]["medianMs"]),
    ]
    chart.categoryAxis.categoryNames = ["Fresh request", "Warm request"]
    chart.categoryAxis.labels.fontName = FONT
    chart.categoryAxis.labels.fontSize = 9.2
    chart.categoryAxis.labels.fillColor = INK
    chart.categoryAxis.strokeColor = LINE
    chart.valueAxis.valueMin = 0
    chart.valueAxis.valueMax = 1100
    chart.valueAxis.valueStep = 250
    chart.valueAxis.valueSteps = [0, 250, 500, 750, 1000]
    chart.valueAxis.labels.fontName = FONT
    chart.valueAxis.labels.fontSize = 8
    chart.valueAxis.labels.fillColor = MUTED
    chart.valueAxis.strokeColor = LINE
    chart.valueAxis.visibleGrid = True
    chart.valueAxis.gridStrokeColor = LINE
    chart.valueAxis.gridStrokeWidth = 0.4
    chart.bars[0].fillColor = OLD
    chart.bars[1].fillColor = GREEN
    chart.bars.strokeColor = None
    chart.barWidth = 10
    chart.barSpacing = 5
    chart.groupSpacing = 18
    chart.barLabelFormat = "%.1f"
    chart.barLabels.fontName = BOLD
    chart.barLabels.fontSize = 8.5
    chart.barLabels.fillColor = INK
    chart.barLabels.boxAnchor = "w"
    chart.barLabels.dx = 5
    drawing.add(chart)
    drawing.add(Rect(80, 151, 9, 9, fillColor=OLD, strokeColor=None))
    drawing.add(String(95, 151, "Before", fontName=FONT, fontSize=9, fillColor=MUTED))
    drawing.add(Rect(149, 151, 9, 9, fillColor=GREEN, strokeColor=None))
    drawing.add(String(164, 151, "After", fontName=FONT, fontSize=9, fillColor=MUTED))
    drawing.add(String(BODY_WIDTH - 5, 0, "Milliseconds; lower is better", textAnchor="end", fontName=FONT, fontSize=8, fillColor=MUTED))
    renderPDF.draw(drawing, c, MARGIN, HEIGHT - 430 - 164)


begin_page(1, "01  /  THE MEASURED GAINS")
para("A faster, lighter<br/>Quiet News", MARGIN, 109, size=32, leading=36, font=DISPLAY)
para("The optimisations cut the work needed to prepare your briefing, reduce data sent over the network and leave more memory available on the Pi. These gains were measured using the same 3,828-article database snapshot.", MARGIN, 202, size=11.2, leading=16)
step = (BODY_WIDTH - 24) / 3 + 12
metric(MARGIN, "72%", "less time for fresh<br/>dashboard processing")
metric(MARGIN + step, "97%", "smaller history<br/>response body")
metric(MARGIN + step * 2, "44%", "lower peak Node RAM<br/>during the test workload")
para("Faster requests, with and without the cache", MARGIN, 397, font=BOLD, size=12.5, leading=17)
latency_chart()
para("Medians from requests made on the Pi itself. Fresh requests required a newly prepared snapshot; warm requests could reuse one. These figures measure the news API, rather than the complete page load over your home or mobile connection.", MARGIN, 611, size=9.5, leading=13, color=MUTED)
rect(MARGIN, 684, BODY_WIDTH, 74, PAPER, radius=8)
para("The same briefing, with a more complete archive", MARGIN + 15, 697, BODY_WIDTH - 30, font=BOLD, size=11, leading=15)
para("All 120 displayed homepage stories were preserved. Removing the history cutoff also made 812 additional grouped stories accessible.", MARGIN + 15, 721, BODY_WIDTH - 30, size=10, leading=14, limit=751)
c.showPage()


begin_page(2, "02  /  WHERE THE SAVINGS COME FROM")
para("Four changes that<br/>remove wasted work", MARGIN, 109, size=30, leading=35, font=DISPLAY)
para("The app retains its existing Node.js, SQLite and browser interface. The changes control when work happens and how much information each request needs.", MARGIN, 201, size=10.7, leading=15)

changes = [
    ("1", "Prepare and reuse the briefing",
     "Headline grouping skips candidates outside its 18-hour matching window. Prepared dashboard snapshots can be reused for up to one minute, with a maximum of 16 entries and a 4 MB estimated memory budget. Database changes invalidate the cache immediately.",
     "Result: fewer repeated calculations and fewer temporary allocations."),
    ("2", "Filter in the database",
     "Date, publisher, saved and unread filters run in SQLite before article processing. Recent queries use the date index, with an overlap to preserve related coverage. History searches all retained articles; older bookmarks are no longer hidden by a 3,000-row cutoff.",
     "Result: faster selection and a more complete history."),
    ("3", "Send the information the view needs",
     "History and search responses omit section lists that the browser never displays. Larger news responses use asynchronous gzip compression, with the compressed result reused from the snapshot cache. Titles, summaries and other coverage remain available in the displayed results.",
     "Result: substantially smaller responses, especially in history."),
    ("4", "Update only what changed",
     "The browser sends an ETag identifying its current briefing. If the response is unchanged, the server returns 304 with no body. When news does change, unchanged sections and cards stay in place. Relative timestamps still advance, and saves or reading-state changes invalidate cached news.",
     "Result: less transfer and redraw work; expanded coverage survives updates."),
]
for index, (number, title, body, result) in enumerate(changes):
    top = 250 + index * 126
    rect(MARGIN, top + 1, 30, 30, WASH, radius=7)
    text(number, MARGIN + 9, top + 3, size=19, font=DISPLAY_BOLD, color=GREEN)
    para(title, MARGIN + 46, top, BODY_WIDTH - 46, size=14.5, leading=19, font=DISPLAY_BOLD)
    end = para(body, MARGIN + 46, top + 29, BODY_WIDTH - 46, size=10.1, leading=14, limit=top + 102)
    para(result, MARGIN + 46, end + 7, BODY_WIDTH - 46, size=9.3, leading=12, color=GREEN, limit=top + 119)
c.showPage()


begin_page(3, "03  /  PRACTICAL IMPACT")
para("What changes in<br/>everyday use", MARGIN, 109, size=32, leading=36, font=DISPLAY)
para("Fresh dashboard processing saves roughly two-thirds of a second per measured request. Reusable snapshots make rapid repeat requests much lighter. The benefit you notice also depends on your connection and browser.", MARGIN, 202, size=10.8, leading=15.5)

card_width = (BODY_WIDTH - 14) / 2
for x in [MARGIN, MARGIN + card_width + 14]:
    rect(x, 264, card_width, 177, PAPER, radius=9)
left = MARGIN + 14
right = MARGIN + card_width + 28
text("ILLUSTRATIVE TRANSFER TIME", left, 280, size=7.7, font=BOLD, color=GREEN)
para("Opening history at 1 Mb/s", left, 302, card_width - 28, size=12, leading=16, font=BOLD)
transfer_before = DATA["before"]["results"]["history"]["bytesPerResponse"] * 8 / 1_000_000
transfer_after = DATA["after"]["results"]["history"]["bytesPerResponse"] * 8 / 1_000_000
text(f"{transfer_before:.2f} s to {transfer_after:.2f} s", left, 331, size=22, font=DISPLAY_BOLD, color=GREEN)
para("Calculated time to transfer one history response body. This excludes network delay, protocol headers, server processing and browser rendering.", left, 369, card_width - 28, size=9.5, leading=13, limit=431)
text("ILLUSTRATIVE UNCHANGED POLLING", right, 280, size=7.7, font=BOLD, color=GREEN)
para("One visible tab, one quiet hour", right, 302, card_width - 28, size=12, leading=16, font=BOLD)
avoided_mb = DATA["before"]["results"]["unchangedPoll"]["bytesPerResponse"] * 60 / 1_000_000
text(f"{avoided_mb:.2f} MB avoided", right, 331, size=22, font=DISPLAY_BOLD, color=GREEN)
para("If all 60 one-minute checks are unchanged, 304 responses avoid this much response-body traffic. Headers still travel; fresh stories still trigger updates.", right, 369, card_width - 28, size=9.5, leading=13, limit=431)

para("More headroom on a shared Pi", MARGIN, 464, size=16, leading=21, font=DISPLAY_BOLD)
ram_saved = DATA["before"]["peakRssMiB"] - DATA["after"]["peakRssMiB"]
para(f"Peak Node memory fell by {ram_saved:.2f} MiB during the workload - about 103 MiB of additional headroom for your other services. Fewer allocations and less request processing should ease contention while you browse.", MARGIN, 499, size=10.5, leading=15)
rect(MARGIN, 564, BODY_WIDTH, 88, WASH, radius=9)
para("78.27 s to 0.31 s of Node CPU time", MARGIN + 15, 578, BODY_WIDTH - 30, size=12, leading=16, font=BOLD, color=GREEN)
para("That is 99.6% less CPU time for the 130-request benchmark. The workload deliberately exercises repeated requests and caching. It does not measure the whole Pi's daily CPU use or electricity consumption.", MARGIN + 15, 605, BODY_WIDTH - 30, size=10, leading=14, limit=646)
para("Where the gains should be most noticeable", MARGIN, 676, size=14, leading=19, font=DISPLAY_BOLD)
para("Rapid repeat visits and multiple tabs, history browsing over a slow Tailscale connection, and browsing while other Pi services are busy. The page also keeps expanded coverage in place, while the archive now returns older relevant stories that were previously excluded.", MARGIN, 707, size=10.3, leading=14.5, limit=768)
c.showPage()


begin_page(4, "04  /  EVIDENCE AND INTERPRETATION")
para("How the results<br/>were checked", MARGIN, 109, size=30, leading=35, font=DISPLAY)
para("Both images ran on the ARM64 Pi with Node 24.22.0, using the same consistent database snapshot in isolated containers. Feed collection was disabled. Measurements used localhost HTTP with gzip support; production bookmarks and preferences were not changed.", MARGIN, 201, size=10.1, leading=14)
para("<b>Main workload:</b> 40 dashboard requests, 20 history requests, 20 council searches, 10 saved-view requests and 40 unchanged polls, following warm-up requests. A separate test invalidated the cache before each of 10 dashboard requests per image.", MARGIN, 272, size=9.6, leading=13)

before, after = DATA["before"], DATA["after"]
cpu_before = sum(view["nodeCpuSeconds"] for view in before["results"].values())
cpu_after = sum(view["nodeCpuSeconds"] for view in after["results"].values())
rows = [
    ["MEASUREMENT", "BEFORE", "AFTER"],
    ["Fresh dashboard median", "923.810 ms", "258.049 ms"],
    ["Warm dashboard median", "834.335 ms", "3.344 ms"],
    ["Warm history median", "882.843 ms", "3.569 ms"],
    ["History response body", "931,433 bytes", "24,247 bytes"],
    ["Dashboard response body", "85,352 bytes", "29,521 bytes"],
    ["Unchanged poll body", "85,352 bytes", "0 bytes (304)"],
    ["Node CPU time / 130 requests", f"{cpu_before:.2f} s", f"{cpu_after:.2f} s"],
    ["Peak Node memory (RSS)", "233.99 MiB", "131.12 MiB"],
]
table = Table(rows, colWidths=[BODY_WIDTH - 202, 101, 101], rowHeights=[25] * len(rows))
table.setStyle(TableStyle([
    ("FONTNAME", (0, 0), (-1, 0), BOLD), ("FONTNAME", (0, 1), (-1, -1), FONT),
    ("FONTSIZE", (0, 0), (-1, 0), 8), ("FONTSIZE", (0, 1), (-1, -1), 9.3),
    ("TEXTCOLOR", (0, 0), (-1, 0), WHITE), ("BACKGROUND", (0, 0), (-1, 0), GREEN),
    ("TEXTCOLOR", (0, 1), (-1, -1), INK),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [PAPER, WHITE]),
    ("ALIGN", (1, 0), (-1, -1), "RIGHT"), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("LEFTPADDING", (0, 0), (-1, -1), 11), ("RIGHTPADDING", (0, 0), (-1, -1), 11),
    ("LINEBELOW", (0, -1), (-1, -1), 0.6, LINE),
]))
table.wrapOn(c, BODY_WIDTH, HEIGHT)
table.drawOn(c, MARGIN, HEIGHT - 330 - 25 * len(rows))
para("Reliability and limits", MARGIN, 574, size=14, leading=19, font=DISPLAY_BOLD)
para("The comparison preserved all 120 displayed stories and section deduplication. History grew from 2,918 to 3,730 grouped stories; council search grew from 53 to 62, retaining its previous results. All 18 initial tests passed locally and on the Pi. A later Safari fetch-context fix added a regression test: 19 tests passed locally, three refresh tests passed on the Pi, and the live homepage was verified in Safari.", MARGIN, 605, size=9.3, leading=12.7)
para("Warm timings reflect cache hits. The Pi was shared and requests ran sequentially; no concurrent-load or full-browser timing study was performed. RAM was measured from the Node process because Docker reported zero and the Pi kernel did not enforce its configured memory limit. Power use, temperature and storage wear were not measured.", MARGIN, 687, size=9.1, leading=12.5, color=MUTED, limit=751)
para('<link href="https://github.com/jhartshorn/quiet-news/blob/d29d5f7/reports/performance-2026-10-16.md" color="#236153">Source: Pi benchmark record, 16 October 2026</link>  |  <link href="https://github.com/jhartshorn/quiet-news/compare/bb3e2d4...e1b2f97" color="#236153">Implementation and Safari fix</link>', MARGIN, 757, size=8.2, leading=11, limit=774)
c.showPage()
c.save()
print(OUTPUT)
