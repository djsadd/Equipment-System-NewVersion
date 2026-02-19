from __future__ import annotations

from base64 import b64encode
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from barcode import get_barcode_class
from barcode.writer import ImageWriter


def compute_ean13_check_digit(value12: str) -> str:
    if len(value12) != 12 or not value12.isdigit():
        raise ValueError("ean13_payload_must_be_12_digits")

    digits = [int(c) for c in value12]
    sum_odd = sum(digits[0::2])  # positions 1,3,5,7,9,11
    sum_even = sum(digits[1::2])  # positions 2,4,6,8,10,12
    total = sum_odd + 3 * sum_even
    return str((10 - (total % 10)) % 10)


def format_ean13_payload(value: int) -> str:
    return f"{value:012}"


def format_ean13_value(value: int) -> str:
    value12 = format_ean13_payload(value)
    return value12 + compute_ean13_check_digit(value12)


def generate_ean13_png(*, value12: str, title: str | None) -> bytes:
    ean_cls = get_barcode_class("ean13")
    if len(value12) == 13 and value12.isdigit():
        value12 = value12[:12]
    ean = ean_cls(value12, writer=ImageWriter())

    buffer = BytesIO()
    ean.write(buffer)
    buffer.seek(0)
    barcode_image = Image.open(buffer).convert("RGB")

    barcode_height = barcode_image.height
    padding = 20
    extra_height = 100
    new_height = barcode_height + padding + extra_height
    new_image = Image.new("RGB", (barcode_image.width, new_height), "white")
    new_image.paste(barcode_image, (0, 0))

    if title:
        safe_title = str(title)
        draw = ImageDraw.Draw(new_image)
        font = _load_font(size=24)

        max_length = 20
        lines = [safe_title[i : i + max_length] for i in range(0, len(safe_title), max_length)]
        line_height = draw.textbbox((0, 0), "A", font=font)[3]
        y_start = barcode_height + padding

        for i, line in enumerate(lines):
            text_bbox = draw.textbbox((0, 0), line, font=font)
            text_width = text_bbox[2] - text_bbox[0]
            x = (new_image.width - text_width) // 2
            y = y_start + i * line_height
            draw.text((x, y), line, font=font, fill="black")

    final_buffer = BytesIO()
    new_image.save(final_buffer, format="PNG")
    return final_buffer.getvalue()


def generate_zpl(*, value12: str, title: str | None) -> str:
    def split_text(text: str, length: int = 25) -> str:
        return "\\&".join(text[i : i + length] for i in range(0, len(text), length))

    title_wrapped = split_text(str(title)) if title else ""

    if len(value12) == 13 and value12.isdigit():
        value12 = value12[:12]

    return f"""
^XA^CI28
^PW530
^LL400

^FO100,50^A0,30,30^FDTuran-Astana University^FS

^FO100,100^BY3
^BEN,100,Y,N
^FD{value12}^FS

^FO30,260^A0,25,25
^FB470,3,0,C,0
^FD{title_wrapped}^FS
^XZ
""".strip()


def png_bytes_to_base64(png: bytes) -> str:
    return b64encode(png).decode("ascii")


def _load_font(*, size: int) -> ImageFont.ImageFont:
    candidates = [
        "arial.ttf",
        str(Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")),
        str(Path("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf")),
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size=size)
        except Exception:
            continue
    return ImageFont.load_default()
