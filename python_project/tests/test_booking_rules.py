from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.domain.exceptions import OutOfBusinessHoursError, BookingOverlapError
from app.domain.booking_rules import (
    validate_booking_business_hours,
    check_no_overlap,
)


class TestBookingRules(unittest.TestCase):
    def test_08_booking_window_business_hours(self) -> None:
        valid_slot = validate_booking_business_hours("08:00", 55)
        self.assertEqual(valid_slot["end_time"], "08:55")

        with self.assertRaises(OutOfBusinessHoursError):
            validate_booking_business_hours("07:30", 35)

        with self.assertRaises(OutOfBusinessHoursError):
            validate_booking_business_hours("19:30", 45)

    def test_09_check_no_overlap_conflict(self) -> None:
        existing = [
            {
                "id": "bk-101",
                "barber_id": "barber-mateo",
                "date": "2026-11-11",
                "start_time": "10:00",
                "duration_minutes": 60,
                "status": "CONFIRMADA",
            }
        ]

        with self.assertRaises(BookingOverlapError):
            check_no_overlap(
                barber_id="barber-mateo",
                date_str="2026-11-11",
                start_time="10:30",
                duration_minutes=35,
                existing_bookings=existing,
            )

        self.assertTrue(
            check_no_overlap(
                barber_id="barber-mateo",
                date_str="2026-11-11",
                start_time="11:00",
                duration_minutes=35,
                existing_bookings=existing,
            )
        )


if __name__ == "__main__":
    unittest.main()
