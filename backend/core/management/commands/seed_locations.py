"""Seed Rwanda's province → district → sector reference data.

Source of truth: docs/data/rwanda-sectors.json (5 provinces, 30 districts,
415 sectors). The command is idempotent: running it twice updates nothing and
creates no duplicates, so it is safe in setup scripts and deployments.
"""

import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from core.models import District, Province, Sector

DATA_FILE = Path(settings.BASE_DIR).parent / "docs" / "data" / "rwanda-sectors.json"


class Command(BaseCommand):
    help = "Load Rwanda's provinces, districts and sectors from docs/data/rwanda-sectors.json"

    def add_arguments(self, parser):
        parser.add_argument(
            "--file",
            default=str(DATA_FILE),
            help=f"Path to the sectors JSON file (default: {DATA_FILE})",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        path = Path(options["file"])
        if not path.exists():
            raise CommandError(f"Location data file not found: {path}")

        # utf-8-sig handles the byte-order mark in the committed file.
        with path.open(encoding="utf-8-sig") as handle:
            payload = json.load(handle)

        provinces = payload.get("provinces")
        if not provinces:
            raise CommandError(f"No 'provinces' key in {path}")

        counts = {"provinces": 0, "districts": 0, "sectors": 0}
        created = {"provinces": 0, "districts": 0, "sectors": 0}

        for province_data in provinces:
            province, was_created = Province.objects.get_or_create(
                name=province_data["name"],
                defaults={"name_rw": province_data.get("name_rw", "")},
            )
            counts["provinces"] += 1
            created["provinces"] += int(was_created)

            # Keep Kinyarwanda names in sync if the source file is corrected.
            if not was_created and province_data.get("name_rw") and province.name_rw != province_data["name_rw"]:
                province.name_rw = province_data["name_rw"]
                province.save(update_fields=["name_rw"])

            for district_data in province_data.get("districts", []):
                district, was_created = District.objects.get_or_create(
                    province=province,
                    name=district_data["name"],
                )
                counts["districts"] += 1
                created["districts"] += int(was_created)

                for sector_name in district_data.get("sectors", []):
                    _, was_created = Sector.objects.get_or_create(
                        district=district,
                        name=sector_name,
                    )
                    counts["sectors"] += 1
                    created["sectors"] += int(was_created)

        self.stdout.write(
            self.style.SUCCESS(
                "Locations ready: "
                f"{counts['provinces']} provinces ({created['provinces']} new), "
                f"{counts['districts']} districts ({created['districts']} new), "
                f"{counts['sectors']} sectors ({created['sectors']} new)."
            )
        )
